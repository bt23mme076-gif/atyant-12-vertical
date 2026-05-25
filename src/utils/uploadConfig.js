import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

export const BASE_UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
export const PROFILE_PHOTO_DIR = path.join(BASE_UPLOAD_DIR, 'profile-photos');
export const ID_DOC_DIR = path.join(BASE_UPLOAD_DIR, 'id-docs');

// Ensure dirs exist
[PROFILE_PHOTO_DIR, ID_DOC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

export const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PROFILE_PHOTO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

export const idDocStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ID_DOC_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

export const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG/PNG/WEBP allowed for profile photos'), false);
  }
};

export const idDocFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG/PNG/PDF allowed for ID documents'), false);
  }
};

export const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

export const uploadIdDoc = multer({
  storage: idDocStorage,
  fileFilter: idDocFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
