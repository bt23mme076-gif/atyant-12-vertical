import path from 'path';
import fs from 'fs';
import { User } from '../models/User.js';
import { PROFILE_PHOTO_DIR, ID_DOC_DIR } from '../utils/uploadConfig.js';

export const uploadProfilePhotoHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file received' });
    }

    const mentorId = req.user.id;
    const mentor = await User.findById(mentorId);
    
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    // Delete old photo if it exists
    if (mentor.profilePhotoFilename) {
      const oldPath = path.join(PROFILE_PHOTO_DIR, mentor.profilePhotoFilename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    mentor.profilePhotoFilename = req.file.filename;
    await mentor.save();

    res.json({
      url: `/api/upload/profile-photo/${req.file.filename}`,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
};

export const serveProfilePhoto = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.resolve(PROFILE_PHOTO_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(filePath);
};

export const uploadIdDocHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file received' });
    }

    const mentorId = req.user.id;
    const mentor = await User.findById(mentorId);
    
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    mentor.idDocFilename = req.file.filename;
    mentor.verificationStatus = 'pending';
    await mentor.save();

    res.json({
      success: true,
      message: 'Document received. Verification takes 24-48 hours.',
      verificationStatus: 'pending',
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('ID Doc upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const serveIdDoc = async (req, res) => {
  try {
    const mentorId = req.params.mentorId;
    
    // Auth check: Admin or the mentor owning the document
    if (req.user.role !== 'admin' && req.user.id.toString() !== mentorId.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only view your own documents.' });
    }

    const mentor = await User.findById(mentorId);
    
    if (!mentor || !mentor.idDocFilename) {
      return res.status(404).json({ error: 'No ID document on file' });
    }

    const filePath = path.resolve(ID_DOC_DIR, mentor.idDocFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing from disk' });
    }

    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve ID doc error:', error);
    res.status(500).json({ error: 'Failed to serve document' });
  }
};

export const verifyIdDoc = async (req, res) => {
  try {
    const mentorId = req.params.mentorId;
    const mentor = await User.findById(mentorId);
    
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    mentor.verificationStatus = 'verified';
    await mentor.save();

    res.json({ success: true, verificationStatus: 'verified' });
  } catch (error) {
    console.error('Verify ID doc error:', error);
    res.status(500).json({ error: 'Failed to verify document' });
  }
};

export const rejectIdDoc = async (req, res) => {
  try {
    const mentorId = req.params.mentorId;
    const mentor = await User.findById(mentorId);
    
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    mentor.verificationStatus = 'rejected';
    await mentor.save();

    res.json({ success: true, verificationStatus: 'rejected' });
  } catch (error) {
    console.error('Reject ID doc error:', error);
    res.status(500).json({ error: 'Failed to reject document' });
  }
};

export const deleteIdDocHandler = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const mentor = await User.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    if (mentor.idDocFilename) {
      const filePath = path.resolve(ID_DOC_DIR, mentor.idDocFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    mentor.idDocFilename = undefined;
    mentor.verificationStatus = 'none';
    await mentor.save();

    res.json({
      success: true,
      message: 'ID document deleted successfully',
      verificationStatus: 'none',
    });
  } catch (error) {
    console.error('Delete ID doc error:', error);
    res.status(500).json({ error: 'Failed to delete ID document' });
  }
};
