import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedOptionIds: [{ type: String }],
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    careerId: { type: String, required: true },
    title: { type: String, default: '' },
    score: { type: Number, required: true },
    matchPercent: { type: Number, required: true },
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const quizResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, required: true, index: true }, // anonymous device id
    email: { type: String, default: null }, // optional capture for nurture
    answers: [answerSchema],
    scores: { type: Map, of: Number, default: {} }, // slug → raw score
    topMatches: [matchSchema],
  },
  { timestamps: true }
);

quizResultSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    sessionId: this.sessionId,
    topMatches: this.topMatches,
    scores: Object.fromEntries(this.scores),
    createdAt: this.createdAt,
  };
};

export const QuizResult = mongoose.model('QuizResult', quizResultSchema);
