import mongoose from 'mongoose';

// We store content as a single document keyed by `key` (e.g. "default") so
// the admin can edit/replace it as a unit and the frontend can fetch it
// in one round trip. Each top-level field maps to the keys in
// `src/data/siteContent.js` on the frontend.
const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default', index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export const SiteContent = mongoose.model('SiteContent', siteContentSchema);
