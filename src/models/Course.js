import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    price: { type: Number, required: true }, // e.g. 999, 4999, 9999
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

courseSchema.methods.toSafeJSON = function () {
  const c = this.toObject();
  c.id = c._id;
  delete c._id;
  delete c.__v;
  return c;
};

export const Course = mongoose.model('Course', courseSchema);
