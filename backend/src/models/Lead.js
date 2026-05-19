import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true },
    source: {
      type: String,
      enum: ['lead_modal', 'chat', 'decision_engine', 'pricing', 'other'],
      default: 'lead_modal',
    },
    stream: { type: String, enum: ['pcm', 'pcb', 'commerce', null], default: null },
    rank: { type: Number },
    confusion: { type: String, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed }, // userAgent, referrer, utm params, etc.
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });

export const Lead = mongoose.model('Lead', leadSchema);
