import { QuizQuestion } from '../models/QuizQuestion.js';
import { QuizResult } from '../models/QuizResult.js';
import { CareerPath } from '../models/CareerPath.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';

// ─── GET /api/quiz/questions ──────────────────────────────────────────────────
export const getQuizQuestions = asyncHandler(async (req, res) => {
  const questions = await QuizQuestion.find({ isActive: true }).sort({ order: 1 });
  res.json({ ok: true, questions });
});

// ─── GET /api/quiz/results/:id ────────────────────────────────────────────────
export const getQuizResult = asyncHandler(async (req, res) => {
  const result = await QuizResult.findById(req.params.id);
  if (!result) throw new AppError('Quiz result not found', 404);
  res.json({ ok: true, result: result.toSafeJSON() });
});

// ─── POST /api/quiz/submit ────────────────────────────────────────────────────
// Accepts:  { sessionId, answers: [{ questionId, selectedOptionIds }], email? }
// Returns:  saved result with topMatches
export const submitQuiz = asyncHandler(async (req, res) => {
  const { sessionId, answers = [], email, userId } = req.body;

  if (!sessionId) throw new AppError('sessionId is required', 400);
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new AppError('answers array is required', 400);
  }

  // Load all active questions to get option weights
  const questions = await QuizQuestion.find({ isActive: true });

  // ── Build a weights lookup: questionId → { optionId → weights } ────────────
  const questionMap = {};
  for (const q of questions) {
    questionMap[q.id] = {};
    for (const opt of q.options) {
      questionMap[q.id][opt.id] = opt.weights;
    }
  }

  // ── Accumulate raw scores per career path ──────────────────────────────────
  const rawScores = {};
  const maxScores = {};  // max possible score if user always picked best for each path

  for (const q of questions) {
    // For max score: for each path, take the highest single-option weight
    for (const opt of q.options) {
      for (const [slug, weight] of opt.weights.entries()) {
        maxScores[slug] = (maxScores[slug] || 0) + Math.max(0, weight);
      }
    }
  }

  for (const answer of answers) {
    const optMap = questionMap[answer.questionId];
    if (!optMap) continue;
    for (const optId of (answer.selectedOptionIds || [])) {
      const weights = optMap[optId];
      if (!weights) continue;
      // weights is a Mongoose Map — must use Map iteration, NOT Object.entries()
      const iter = weights instanceof Map ? weights : new Map(Object.entries(weights || {}));
      for (const [slug, weight] of iter) {
        rawScores[slug] = (rawScores[slug] || 0) + weight;
      }
    }
  }

  // Ensure every published career path has at least a 0 score so no path is
  // mathematically dead (acceptance criterion).
  const allPaths = await CareerPath.find({ isPublished: true }).select('slug title');
  for (const p of allPaths) {
    if (rawScores[p.slug] === undefined) rawScores[p.slug] = 0;
    if (maxScores[p.slug] === undefined) maxScores[p.slug] = 1;
  }

  // Build title lookup
  const titleMap = {};
  for (const p of allPaths) titleMap[p.slug] = p.title;

  // ── Normalise to matchPercent ──────────────────────────────────────────────
  const entries = Object.entries(rawScores).map(([slug, score]) => {
    const max = maxScores[slug] || 1;
    // Clamp to 0-100, apply a 5% floor so no path shows 0%
    const matchPercent = Math.min(100, Math.max(5, Math.round((score / max) * 100)));
    return { slug, score, matchPercent };
  });

  entries.sort((a, b) => b.matchPercent - a.matchPercent);

  // ── Generate templated reason strings for top 3 ───────────────────────────
  const top3 = entries.slice(0, 3);
  const topMatches = top3.map(({ slug, score, matchPercent }) => {
    const reason = buildReason(slug, matchPercent, answers, questions);
    return { careerId: slug, title: titleMap[slug] || '', score, matchPercent, reason };
  });

  // ── Persist result ─────────────────────────────────────────────────────────
  const scoresMap = Object.fromEntries(Object.entries(rawScores));
  const result = await QuizResult.create({
    userId: userId || null,
    sessionId,
    email: email || null,
    answers,
    scores: scoresMap,
    topMatches,
  });

  res.status(201).json({ ok: true, result: result.toSafeJSON() });
});

// ─── PATCH /api/quiz/results/:id/email ────────────────────────────────────────
export const updateResultEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required', 400);

  const result = await QuizResult.findByIdAndUpdate(
    req.params.id,
    { $set: { email } },
    { new: true }
  );
  if (!result) throw new AppError('Quiz result not found', 404);

  res.json({ ok: true, result: result.toSafeJSON() });
});

// ─── Helper: Build a human-readable "why this career" string ─────────────────
function buildReason(slug, matchPercent, answers, questions) {
  const careerNames = {
    'software-engineering': 'Software Engineering',
    'data-science': 'Data Science',
    'product-management': 'Product Management',
    'ui-ux-design': 'UI/UX Design',
    'cybersecurity': 'Cybersecurity',
    'cloud-and-devops': 'Cloud & DevOps',
    'mechanical-core': 'Mechanical Core roles',
    'electronics-and-vlsi': 'Electronics & VLSI',
    'civil-and-infra': 'Civil & Infrastructure',
    'consulting': 'Consulting',
    'investment-banking': 'Investment Banking',
    'mba-prep': 'MBA Prep',
    'gate-prep': 'GATE Prep',
    'ms-abroad': 'MS Abroad',
    'entrepreneurship': 'Entrepreneurship',
    'game-development': 'Game Development',
    'digital-marketing': 'Digital Marketing',
    'finance-and-fp-and-a': 'Finance & FP&A',
    'supply-chain-and-operations': 'Supply Chain & Operations',
    'robotics': 'Robotics',
    'ai-ml-research': 'AI/ML Research',
    'embedded-systems': 'Embedded Systems',
    'blockchain-and-web3': 'Blockchain & Web3',
    'technical-writing': 'Technical Writing',
    'sales-and-business-development': 'Sales & Business Development',
    'hr-and-people-ops': 'HR & People Operations',
    'legal-and-compliance': 'Legal & Compliance',
    'biotech-and-pharma': 'Biotech & Pharma',
    'renewable-energy': 'Renewable Energy',
  };

  const name = careerNames[slug] || slug;
  const level = matchPercent >= 75 ? 'strongly' : matchPercent >= 55 ? 'well' : 'reasonably';

  // Pull first answer's first option label as "top interest signal"
  const firstAnswer = answers[0];
  const firstQ = questions.find((q) => q.id === firstAnswer?.questionId);
  const firstOpt = firstQ?.options.find((o) => o.id === firstAnswer?.selectedOptionIds?.[0]);
  const signal = firstOpt?.label || 'your interests';

  return `Your responses — especially around "${signal}" — ${level} align with a career in ${name}. This match is based on your work style, comfort with structure, and the activities you enjoy most.`;
}
