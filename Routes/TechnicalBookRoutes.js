import express from 'express';
import {
  technicalBookUpload,
  createTechnicalBook,
  getAllTechnicalBooks,
  getTechnicalBookById,
  updateTechnicalBook,
  deleteTechnicalBook
} from '../Controllers/TechnicalBookController.js';

const router = express.Router();

// CRUD Routes for Technical Books
router.post('/', technicalBookUpload, createTechnicalBook);
router.get('/', getAllTechnicalBooks);
router.get('/:id', getTechnicalBookById);
router.put('/:id', technicalBookUpload, updateTechnicalBook);
router.delete('/:id', deleteTechnicalBook);

export default router;
