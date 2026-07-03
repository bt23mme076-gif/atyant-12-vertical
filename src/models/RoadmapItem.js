import mongoose from 'mongoose';

// A single piece of content inside a pillar (video, document, article, or
// task/checklist item). Phase 2's admin content-manager will create/update
// these via /api/admin/roadmap-items; the schema already supports uploaded
// files so no migration is needed when that ships.
const roadmapItemSchema = new mongoose.Schema(
  {
    pillar: { type: mongoose.Schema.Types.ObjectId, ref: 'RoadmapPillar', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    type: {
      type: String,
      enum: ['video', 'document', 'article', 'task', 'quiz'],
      default: 'article',
    },
    url: { type: String, trim: true, default: '' }, // external link or /api/upload/... served file
    filename: { type: String, trim: true, default: '' }, // set when uploaded directly (phase 2)
    durationLabel: { type: String, trim: true, default: '' }, // e.g. "6 min watch"
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },

    // Referral gating: when true, a student must have referred at least
    // config.referral.unlockThreshold friends before this item is unlocked.
    // See listPillars in roadmapController.js for the actual check.
    requiresReferralUnlock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roadmapItemSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    pillar: this.pillar,
    title: this.title,
    description: this.description,
    type: this.type,
    url: this.url,
    durationLabel: this.durationLabel,
    order: this.order,
    requiresReferralUnlock: this.requiresReferralUnlock,
  };
};

export const RoadmapItem = mongoose.model('RoadmapItem', roadmapItemSchema);
