import express from 'express';
import {
  technicalParameterUpload,
  createTechnicalParameter,
  getAllTechnicalParameters,
  getTechnicalParameterById,
  updateTechnicalParameter,
  deleteTechnicalParameter
} from '../Controllers/TechnicalParameterController.js';

const router = express.Router();

// CRUD Routes for Technical Parameters
router.post('/', technicalParameterUpload, createTechnicalParameter);
router.get('/', getAllTechnicalParameters);
router.get('/:id', getTechnicalParameterById);
router.put('/:id', technicalParameterUpload, updateTechnicalParameter);
router.delete('/:id', deleteTechnicalParameter);

export default router;
