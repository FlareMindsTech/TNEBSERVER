import express from 'express';
import {
  createLMNumber,
  getAllLMNumbers,
  getLMNumberById,
  updateLMNumber,
  deleteLMNumber,
  bulkCreateLMNumbers
} from '../Controllers/LMNumberController.js';

const router = express.Router();

// CRUD Routes for Lifetime Membership Numbers
router.post('/', createLMNumber);
router.post('/bulk', bulkCreateLMNumbers);
router.get('/', getAllLMNumbers);
router.get('/:id', getLMNumberById);
router.put('/:id', updateLMNumber);
router.delete('/:id', deleteLMNumber);

export default router;
