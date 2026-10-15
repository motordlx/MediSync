import { Router } from 'express';
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  toggleSchedule,
  deleteSchedule,
} from '../controllers/scheduleController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getSchedules);
router.post('/', createSchedule);
router.put('/:id', updateSchedule);
router.patch('/:id/toggle', toggleSchedule);
router.delete('/:id', deleteSchedule);

export default router;
