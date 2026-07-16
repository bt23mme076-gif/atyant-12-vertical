import mongoose from 'mongoose';

const courseItemSchema = new mongoose.Schema(
  {
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule', required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'document', 'article'], required: true },
    url: { type: String },
    order: { type: Number, default: 0 },
    durationLabel: { type: String }, // e.g. "15 mins"
  },
  { timestamps: true }
);

courseItemSchema.methods.toSafeJSON = function () {
  const i = this.toObject();
  i.id = i._id;
  delete i._id;
  delete i.__v;
  return i;
};

export const CourseItem = mongoose.model('CourseItem', courseItemSchema);
