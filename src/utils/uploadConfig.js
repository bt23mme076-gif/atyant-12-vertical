import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import { AppError } from './asyncHandler.js';

export const BASE_UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
export const PROFILE_PHOTO_DIR = path.join(BASE_UPLOAD_DIR, 'profile-photos');
export const ID_DOC_DIR = path.join(BASE_UPLOAD_DIR, 'id-docs');
export const ROADMAP_CONTENT_DIR = path.join(BASE_UPLOAD_DIR, 'roadmap-content');

// Ensure dirs exist
[PROFILE_PHOTO_DIR, ID_DOC_DIR, ROADMAP_CONTENT_DIR].forEach((dir) => {
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
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else if (ext === '.heic' || ext === '.heif') {
    cb(new AppError('HEIC/HEIF photos are not supported. On your iPhone or Mac, open the photo, tap Share → Save as JPEG, then upload the JPG file.', 400), false);
  } else {
    cb(new AppError('Only JPG, PNG, or WEBP files are allowed for profile photos.', 400), false);
  }
};

export const idDocFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else if (ext === '.heic' || ext === '.heif') {
    cb(new AppError('HEIC/HEIF files are not supported. Please export your document as JPG or PDF and try again.', 400), false);
  } else {
    cb(new AppError('Only JPG, PNG, or PDF files are allowed for ID documents.', 400), false);
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

// ─── Roadmap content (admin-uploaded documents/videos) ─────────────────
// Used by the team to attach real PDFs/videos to a RoadmapItem or FAQ
// video from the admin panel. Admins can also just paste an external URL
// (e.g. a YouTube link) instead of uploading — this is only needed when
// they want to host the file directly.

export const roadmapContentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ROADMAP_CONTENT_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

export const roadmapContentFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.mp4', '.mov', '.webm', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported file type. Allowed: PDF, Word, PowerPoint, MP4/MOV/WEBM video, or JPG/PNG.', 400), false);
  }
};

export const uploadRoadmapContent = multer({
  storage: roadmapContentStorage,
  fileFilter: roadmapContentFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB — generous enough for short videos
});
