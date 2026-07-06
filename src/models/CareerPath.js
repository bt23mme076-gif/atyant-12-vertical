import mongoose from 'mongoose';

// One of the 30 career paths shown in the "Career Exploration Hub" grid.
// Expanded from the original lightweight schema (title/slug/colorKey/order/featured)
// to include all the rich content needed for the /careers/:slug detail pages.

const roadmapYearSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },   // 1-4
    focus: { type: String, default: '' },
    learn: [String],
    build: [String],
    skip: [String],
    milestone: { type: String, default: '' },
  },
  { _id: false }
);

const realStorySchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    collegeType: { type: String, default: '' },
    summary: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
  },
  { _id: false }
);

const careerPathSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    colorKey: { type: String, trim: true, default: 'rose' },
    order: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },

    // ── Rich detail fields ──────────────────────────────────────────
    tagline: { type: String, default: '' },

    snapshot: {
      salaryRangeINR: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
        note: { type: String, default: '' },
      },
      difficultyToBreakIn: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
      bestFitTraits: [String],
      idealFor: { type: String, default: '' },
    },

    roadmap: [roadmapYearSchema],

    skillTree: {
      foundational: [String],
      intermediate: [String],
      advanced: [String],
      mustHaveForInterviews: [String],
    },

    realStories: [realStorySchema],

    entryPoints: {
      hiringCompanies: [String],
      onCampusVsOffCampus: { type: String, default: '' },
      referralTips: { type: String, default: '' },
    },

    commonMistakes: [String],

    resources: {
      course: {
        title: { type: String, default: '' },
        url: { type: String, default: '' },
      },
      book: {
        title: { type: String, default: '' },
        url: { type: String, default: '' },
      },
      projectIdea: { type: String, default: '' },
      community: {
        name: { type: String, default: '' },
        url: { type: String, default: '' },
      },
    },

    pivotOptions: [String],   // adjacent career slugs
    relatedPaths: [String],   // slugs for "you might also like"
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
    tagline: this.tagline,
    snapshot: this.snapshot,
    roadmap: this.roadmap,
    skillTree: this.skillTree,
    realStories: this.realStories,
    entryPoints: this.entryPoints,
    commonMistakes: this.commonMistakes,
    resources: this.resources,
    pivotOptions: this.pivotOptions,
    relatedPaths: this.relatedPaths,
  };
};

// Lightweight summary used in list endpoints (grid, quiz results, etc.)
careerPathSchema.methods.toListJSON = function () {
  return {
    id: this._id,
    title: this.title,
    slug: this.slug,
    colorKey: this.colorKey,
    order: this.order,
    isFeatured: this.isFeatured,
    tagline: this.tagline,
    snapshot: {
      difficultyToBreakIn: this.snapshot?.difficultyToBreakIn,
      bestFitTraits: this.snapshot?.bestFitTraits,
    },
    pivotOptions: this.pivotOptions,
    relatedPaths: this.relatedPaths,
  };
};

export const CareerPath = mongoose.model('CareerPath', careerPathSchema);
