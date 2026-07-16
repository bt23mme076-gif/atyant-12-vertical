import mongoose from 'mongoose';

const courseModuleSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    isFreePreview: { type: Boolean, default: false }, // if true, accessible without purchase
  },
  { timestamps: true }
);

courseModuleSchema.methods.toSafeJSON = function () {
  const m = this.toObject();
  m.id = m._id;
  delete m._id;
  delete m.__v;
  return m;
};

export const CourseModule = mongoose.model('CourseModule', courseModuleSchema);
