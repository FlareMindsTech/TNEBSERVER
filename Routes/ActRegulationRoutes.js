import express from 'express';
import {
  actRegulationUpload,
  createActRegulation,
  getAllActRegulations,
  getActRegulationById,
  updateActRegulation,
  deleteActRegulation
} from '../Controllers/ActRegulationController.js';

const router = express.Router();

// CRUD Routes for Act & Regulations
router.post('/', actRegulationUpload, createActRegulation);
router.get('/', getAllActRegulations);
router.get('/:id', getActRegulationById);
router.put('/:id', actRegulationUpload, updateActRegulation);
router.delete('/:id', deleteActRegulation);

export default router;
