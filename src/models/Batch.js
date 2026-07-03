import mongoose from 'mongoose';

// A Batch (cohort) groups students who joined the roadmap around the same
// time so they can see a shared streak leaderboard / "N students with you".
const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Cohort 2026-A"
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true, default: '' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    capacity: { type: Number, default: 0 }, // 0 = unlimited
    isActive: { type: Boolean, default: true }, // new signups auto-join the active batch
  },
  { timestamps: true }
);

batchSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    code: this.code,
    description: this.description,
    startDate: this.startDate,
    endDate: this.endDate,
    isActive: this.isActive,
  };
};

export const Batch = mongoose.model('Batch', batchSchema);
