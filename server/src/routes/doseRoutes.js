import { Router } from 'express';
import {
  getTodayDoses,
  getUpcomingDoses,
  handleConfirmDose,
  getDoseHistory,
  getAdherenceStats,
  triggerGenerateDoses,
} from '../controllers/doseController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/today', getTodayDoses);
router.get('/upcoming', getUpcomingDoses);
router.get('/history', getDoseHistory);
router.get('/adherence', getAdherenceStats);
router.post('/generate', triggerGenerateDoses);
router.post('/:id/confirm', handleConfirmDose);

export default router;
