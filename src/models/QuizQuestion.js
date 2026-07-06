import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    // slug → integer weight (positive = boosts that path)
    weights: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    order: { type: Number, required: true },
    question: { type: String, required: true },
    subtext: { type: String, default: '' },
    type: {
      type: String,
      enum: ['single_select', 'multi_select'],
      default: 'single_select',
    },
    options: [optionSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const QuizQuestion = mongoose.model('QuizQuestion', quizQuestionSchema);
