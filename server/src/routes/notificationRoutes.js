import { Router } from 'express';
import { getNotificationLogs, getAuditEvents, testEmailConnection } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotificationLogs);
router.get('/audit', getAuditEvents);
router.post('/test-email', testEmailConnection);

export default router;
