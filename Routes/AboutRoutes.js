import express from 'express';
import { getAbout, createOrUpdateAbout } from '../Controllers/AboutController.js';
import { upload } from '../config/Cloudinary.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', getAbout);
router.post('/', protect, authorize('owner', 'admin'), upload.single('image'), createOrUpdateAbout);

export default router;
