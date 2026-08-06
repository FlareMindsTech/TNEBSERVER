import express from 'express';
import { createMinnagam, getMinnagams, getMinnagamById, updateMinnagam, deleteMinnagam, updateMinnagamStatus } from '../Controllers/MinnagamController.js';
import { upload } from '../config/Cloudinary.js';

const router = express.Router();

// Use upload.single('document') to accept single file (image or pdf) upload
router.post('/', upload.single('document'), createMinnagam);
router.get('/', getMinnagams);
router.get('/:id', getMinnagamById);
router.put('/:id', upload.single('document'), updateMinnagam);
router.patch('/:id/status', updateMinnagamStatus);
router.delete('/:id', deleteMinnagam);

export default router;
