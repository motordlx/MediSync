import { Router } from 'express';
import { getNotificationLogs, getAuditEvents } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotificationLogs);
router.get('/audit', getAuditEvents);

export default router;
