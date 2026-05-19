import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    // Razorpay identifiers
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String },

    // Order details
    planId: { type: String, required: true }, // 'better-college' | 'better-branch' | 'combo' | '1to1'
    planTitle: { type: String, required: true },
    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: 'INR' },

    // Customer
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String },

    // Lifecycle
    status: {
      type: String,
      enum: ['created', 'attempted', 'paid', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    failureReason: { type: String },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
