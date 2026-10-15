import { Router } from 'express';
import {
  getContacts,
  addContact,
  updateContact,
  removeContact,
  resendInvite,
  verifyInvite,
} from '../controllers/careContactController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public invitation verification endpoint
router.post('/verify', verifyInvite);

// Protected routes for patient managing contacts
router.use(authenticateToken);

router.get('/', getContacts);
router.post('/', addContact);
router.put('/:id', updateContact);
router.delete('/:id', removeContact);
router.post('/:id/invite', resendInvite);

export default router;
