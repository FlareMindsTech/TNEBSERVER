import express from 'express';
import { createMinnagam, getMinnagams, getMinnagamById, updateMinnagam, deleteMinnagam, updateMinnagamStatus } from '../Controllers/MinnagamController.js';
import { upload } from '../config/Cloudinary.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, upload.single('document'), createMinnagam);
router.get('/', protect, getMinnagams);
router.get('/:id', protect, getMinnagamById);
router.put('/:id', protect, authorize('owner', 'admin', 'treasurer'), upload.single('document'), updateMinnagam);
router.patch('/:id/status', protect, authorize('owner', 'admin', 'treasurer'), updateMinnagamStatus);
router.delete('/:id', protect, authorize('owner', 'admin'), deleteMinnagam);

export default router;
