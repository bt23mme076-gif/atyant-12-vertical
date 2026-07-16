import { Router } from 'express';
import { getActiveCourses, getCourseDetails } from '../controllers/courseController.js';

const router = Router();

router.get('/', getActiveCourses);
router.get('/:slug', getCourseDetails);

export default router;
