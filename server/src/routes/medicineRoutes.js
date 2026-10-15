import { Router } from 'express';
import {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  archiveMedicine,
  deleteMedicine,
} from '../controllers/medicineController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getMedicines);
router.get('/:id', getMedicineById);
router.post('/', createMedicine);
router.put('/:id', updateMedicine);
router.patch('/:id/archive', archiveMedicine);
router.delete('/:id', deleteMedicine);

export default router;
