import express from 'express';
import {
  technicalQAUpload,
  createTechnicalQA,
  getAllTechnicalQA,
  getTechnicalQAById,
  updateTechnicalQA,
  deleteTechnicalQA
} from '../Controllers/TechnicalQAController.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// CRUD Routes for Technical Q&A
router.post('/', protect, authorize('technical admin', 'owner'), technicalQAUpload, createTechnicalQA);
router.get('/', getAllTechnicalQA);
router.get('/:id', getTechnicalQAById);
router.put('/:id', protect, authorize('technical admin', 'owner'), technicalQAUpload, updateTechnicalQA);
router.delete('/:id', protect, authorize('technical admin', 'owner'), deleteTechnicalQA);

export default router;
