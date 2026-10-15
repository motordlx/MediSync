import { Router } from 'express';
import {
  handleSeedDemo,
  handleCreateDemoDose,
  handleAdvanceDemoStage,
  handleResetDemoData,
  handleGetDemoStatus,
} from '../controllers/demoController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/status', handleGetDemoStatus);
router.post('/seed', handleSeedDemo);
router.post('/create-dose', handleCreateDemoDose);
router.post('/advance-stage', handleAdvanceDemoStage);
router.post('/reset', handleResetDemoData);

export default router;
