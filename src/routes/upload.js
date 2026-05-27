import express from 'express';
import {
  uploadProfilePhotoHandler,
  serveProfilePhoto,
  uploadIdDocHandler,
  serveIdDoc,
  verifyIdDoc,
  rejectIdDoc,
  deleteIdDocHandler
} from '../controllers/uploadController.js';
import { requireUser, requireAdmin } from '../middleware/auth.js';

import { uploadProfilePhoto, uploadIdDoc } from '../utils/uploadConfig.js';

const router = express.Router();

// Wraps multer middleware so file-filter errors reach the global error handler
const multerHandler = (upload) => (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

// Publicly serve profile photos
router.get('/profile-photo/:filename', serveProfilePhoto);

// Mentor uploads their own profile photo
router.post('/profile-photo', requireUser, multerHandler(uploadProfilePhoto.single('file')), uploadProfilePhotoHandler);

// Mentor uploads their Aadhaar / College ID
router.post('/id-doc', requireUser, multerHandler(uploadIdDoc.single('file')), uploadIdDocHandler);

// Mentor deletes their Aadhaar / College ID
router.delete('/id-doc', requireUser, deleteIdDocHandler);

// ADMIN / OWNER routes
router.get('/id-doc/:mentorId', requireUser, serveIdDoc);
router.patch('/id-doc/:mentorId/verify', requireAdmin, verifyIdDoc);
router.patch('/id-doc/:mentorId/reject', requireAdmin, rejectIdDoc);

export default router;
