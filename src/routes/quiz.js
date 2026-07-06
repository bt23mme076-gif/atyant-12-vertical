import { Router } from 'express';
import { getQuizQuestions, submitQuiz, getQuizResult, updateResultEmail } from '../controllers/quizController.js';

const router = Router();

router.get('/questions', getQuizQuestions);
router.post('/submit', submitQuiz);
router.get('/results/:id', getQuizResult);
router.patch('/results/:id/email', updateResultEmail);

export default router;
