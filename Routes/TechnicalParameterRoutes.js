import express from 'express';
import {
  technicalParameterUpload,
  createTechnicalParameter,
  getAllTechnicalParameters,
  getTechnicalParameterById,
  updateTechnicalParameter,
  deleteTechnicalParameter
} from '../Controllers/TechnicalParameterController.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// CRUD Routes for Technical Parameters
router.post('/', protect, authorize('technical admin', 'owner'), technicalParameterUpload, createTechnicalParameter);
router.get('/', getAllTechnicalParameters);
router.get('/:id', getTechnicalParameterById);
router.put('/:id', protect, authorize('technical admin', 'owner'), technicalParameterUpload, updateTechnicalParameter);
router.delete('/:id', protect, authorize('technical admin', 'owner'), deleteTechnicalParameter);

export default router;
