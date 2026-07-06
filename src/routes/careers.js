import { Router } from 'express';
import { listCareers, getCareer, getRelatedCareers } from '../controllers/careerController.js';

const router = Router();

router.get('/', listCareers);
router.get('/:slug', getCareer);
router.get('/:slug/related', getRelatedCareers);

export default router;
