import express from 'express';
import {
  distributionInstructionUpload,
  createDistributionInstruction,
  getAllDistributionInstructions,
  getDistributionInstructionById,
  updateDistributionInstruction,
  deleteDistributionInstruction
} from '../Controllers/DistributionInstructionController.js';

const router = express.Router();

// CRUD Routes for Distribution Related Instructions
router.post('/', distributionInstructionUpload, createDistributionInstruction);
router.get('/', getAllDistributionInstructions);
router.get('/:id', getDistributionInstructionById);
router.put('/:id', distributionInstructionUpload, updateDistributionInstruction);
router.delete('/:id', deleteDistributionInstruction);

export default router;
