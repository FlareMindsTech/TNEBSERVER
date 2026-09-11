import express from 'express';
import {
  technicalQAUpload,
  createTechnicalQA,
  getAllTechnicalQA,
  getTechnicalQAById,
  updateTechnicalQA,
  deleteTechnicalQA
} from '../Controllers/TechnicalQAController.js';

const router = express.Router();

// CRUD Routes for Technical Q&A
router.post('/', technicalQAUpload, createTechnicalQA);
router.get('/', getAllTechnicalQA);
router.get('/:id', getTechnicalQAById);
router.put('/:id', technicalQAUpload, updateTechnicalQA);
router.delete('/:id', deleteTechnicalQA);

export default router;
