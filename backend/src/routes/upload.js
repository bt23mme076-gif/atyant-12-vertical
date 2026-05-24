import express from 'express';
import { 
  uploadProfilePhotoHandler, 
  serveProfilePhoto,
  uploadIdDocHandler,
  serveIdDoc,
  verifyIdDoc,
  rejectIdDoc
} from '../controllers/uploadController.js';
import { requireUser, requireAdmin } from '../middleware/auth.js';

import { uploadProfilePhoto, uploadIdDoc } from '../utils/uploadConfig.js';

const router = express.Router();

// Publicly serve profile photos
router.get('/profile-photo/:filename', serveProfilePhoto);

// Mentor uploads their own profile photo
router.post('/profile-photo', requireUser, uploadProfilePhoto.single('file'), uploadProfilePhotoHandler);

// Mentor uploads their Aadhaar / College ID
router.post('/id-doc', requireUser, uploadIdDoc.single('file'), uploadIdDocHandler);

// ADMIN ONLY routes
router.get('/id-doc/:mentorId', requireAdmin, serveIdDoc);
router.patch('/id-doc/:mentorId/verify', requireAdmin, verifyIdDoc);
router.patch('/id-doc/:mentorId/reject', requireAdmin, rejectIdDoc);

export default router;
