import mongoose from 'mongoose';

// A single piece of content (video, document, article, task, quiz) attached
// to a Career Path detail page. Managed by the admin team via the admin
// dashboard "Career Path Content Items" sub-tab.
const careerPathItemSchema = new mongoose.Schema(
  {
    careerPath: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CareerPath',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    type: {
      type: String,
      enum: ['video', 'document', 'article', 'task', 'quiz'],
      default: 'video',
    },
    url: { type: String, trim: true, default: '' }, // external link or /api/upload/... file
    durationLabel: { type: String, trim: true, default: '' }, // e.g. "12 min watch"
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

careerPathItemSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    careerPath: this.careerPath,
    title: this.title,
    description: this.description,
    type: this.type,
    url: this.url,
    durationLabel: this.durationLabel,
    order: this.order,
    isPublished: this.isPublished,
  };
};

export const CareerPathItem = mongoose.model('CareerPathItem', careerPathItemSchema);
