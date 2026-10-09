import express from 'express';
import {
  boardProceedingUpload,
  createBoardProceeding,
  getAllBoardProceedings,
  getBoardProceedingById,
  updateBoardProceeding,
  deleteBoardProceeding
} from '../Controllers/BoardProceedingController.js';

const router = express.Router();

// CRUD Routes for Board Proceedings
router.post('/', boardProceedingUpload, createBoardProceeding);
router.get('/', getAllBoardProceedings);
router.get('/:id', getBoardProceedingById);
router.put('/:id', boardProceedingUpload, updateBoardProceeding);
router.delete('/:id', deleteBoardProceeding);

export default router;
