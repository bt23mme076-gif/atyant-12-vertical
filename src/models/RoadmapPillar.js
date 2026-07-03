import mongoose from 'mongoose';

// The 7 tabbed segments/categories on the Roadmap ("Career OS") page, e.g.
// College Arrival Guide, College Survival, Career Exploration Hub, etc.
// Content items (docs/videos) live in RoadmapItem and reference a pillar.
const roadmapPillarSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true }, // 'college-arrival'
    title: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: 'Compass' }, // lucide-react icon name
    order: { type: Number, default: 0 },
    isFlagship: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roadmapPillarSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    key: this.key,
    title: this.title,
    tagline: this.tagline,
    icon: this.icon,
    order: this.order,
    isFlagship: this.isFlagship,
  };
};

export const RoadmapPillar = mongoose.model('RoadmapPillar', roadmapPillarSchema);
