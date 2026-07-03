import mongoose from 'mongoose';

// Short "quick guidance" video answering a common question, shown as a
// pop-up when a student taps the question on the Roadmap page.
const faqVideoSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    shortAnswer: { type: String, trim: true, default: '' }, // 1-2 line teaser shown on the card
    videoUrl: { type: String, trim: true, default: '' }, // YouTube/Vimeo link or an uploaded file's served URL
    filename: { type: String, trim: true, default: '' }, // set when uploaded directly via the admin panel
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

faqVideoSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    question: this.question,
    shortAnswer: this.shortAnswer,
    videoUrl: this.videoUrl,
    order: this.order,
    isPublished: this.isPublished,
  };
};

export const FaqVideo = mongoose.model('FaqVideo', faqVideoSchema);
