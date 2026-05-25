import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    // Anonymous session id sent by the client (cookie/localStorage UUID). We don't
    // require auth for the chat widget.
    sessionId: { type: String, required: true, unique: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }, // linked if/when user shares email
    messages: { type: [messageSchema], default: [] },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

chatSessionSchema.index({ updatedAt: -1 });

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
