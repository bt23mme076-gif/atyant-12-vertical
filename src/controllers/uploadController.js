import path from 'path';
import fs from 'fs';
import { User } from '../models/User.js';
import { PROFILE_PHOTO_DIR, ID_DOC_DIR, ROADMAP_CONTENT_DIR } from '../utils/uploadConfig.js';

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
    const param = req.params.mentorId;

    // Resolve strictly by Mongo _id — the old `idDocFilename` fallback let
    // anyone who guessed/observed a filename fetch that document without
    // needing to know (or be authorized for) the owning mentor's real id.
    // Confirmed atyantjee02FE/src/utils/api.js's viewIdDocAdmin/
    // verifyIdDocAdmin/rejectIdDocAdmin already pass mentor._id (see
    // AtyantLoginPage.jsx's handleViewDoc/handleVerifyDoc/handleRejectDoc),
    // so no frontend change is needed for this fix.
    if (!/^[a-fA-F0-9]{24}$/.test(param)) {
      return res.status(400).json({ error: 'Invalid mentor id' });
    }
    const mentor = await User.findById(param);

    if (!mentor || !mentor.idDocFilename) {
      return res.status(404).json({ error: 'No ID document on file' });
    }

    // Auth check: Admin or the mentor owning the document
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = req.user.id.toString() === mentor._id.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied. You can only view your own documents.' });
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
    const param = req.params.mentorId;
    // Resolve strictly by Mongo _id — see serveIdDoc for why the filename
    // fallback was removed.
    if (!/^[a-fA-F0-9]{24}$/.test(param)) {
      return res.status(400).json({ error: 'Invalid mentor id' });
    }
    const mentor = await User.findById(param);

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
    const param = req.params.mentorId;
    // Resolve strictly by Mongo _id — see serveIdDoc for why the filename
    // fallback was removed.
    if (!/^[a-fA-F0-9]{24}$/.test(param)) {
      return res.status(400).json({ error: 'Invalid mentor id' });
    }
    const mentor = await User.findById(param);

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

// ─── Roadmap content (admin panel) ───────────────────────────────────────
// Generic upload for RoadmapItem / FaqVideo attachments. Returns a URL the
// admin panel then saves onto the item/FAQ record via the normal CRUD
// endpoints — decoupled from any particular content type.
export const uploadRoadmapContentHandler = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received' });
  }
  res.json({
    url: `/api/upload/roadmap-content/${req.file.filename}`,
    filename: req.file.filename,
  });
};

export const serveRoadmapContent = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.resolve(ROADMAP_CONTENT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Prevent Express compression middleware from breaking HTTP range requests/video seeks
  res.setHeader('x-no-compression', 'true');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(filePath);
};
