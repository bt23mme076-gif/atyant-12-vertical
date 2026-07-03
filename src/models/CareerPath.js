import mongoose from 'mongoose';

// One of the 29 (and growing) career paths shown in the "Career Exploration
// Hub" grid, e.g. Software Engineering, Data Science, MBA Prep. Kept as its
// own model (rather than a RoadmapItem) because these are a distinct
// taxonomy — each one is a future landing point for its own roadmap/quiz
// results, not a single video/doc.
const careerPathSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    colorKey: { type: String, trim: true, default: 'rose' }, // maps to a pastel swatch on the frontend
    order: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false }, // shown in the main grid; rest roll into "+N more"
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

careerPathSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    title: this.title,
    slug: this.slug,
    colorKey: this.colorKey,
    order: this.order,
    isFeatured: this.isFeatured,
  };
};

export const CareerPath = mongoose.model('CareerPath', careerPathSchema);
