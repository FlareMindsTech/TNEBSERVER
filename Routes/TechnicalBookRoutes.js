import express from 'express';
import {
  technicalBookUpload,
  createTechnicalBook,
  getAllTechnicalBooks,
  getTechnicalBookById,
  updateTechnicalBook,
  deleteTechnicalBook
} from '../Controllers/TechnicalBookController.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// CRUD Routes for Technical Books
router.post('/', protect, authorize('technical admin', 'owner'), technicalBookUpload, createTechnicalBook);
router.get('/', getAllTechnicalBooks);
router.get('/:id', getTechnicalBookById);
router.put('/:id', protect, authorize('technical admin',  'owner'), technicalBookUpload, updateTechnicalBook);
router.delete('/:id', protect, authorize('technical admin', 'owner'), deleteTechnicalBook);

export default router;
