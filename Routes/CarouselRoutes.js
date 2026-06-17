import express from 'express';
import * as carouselCtrl from '../Controllers/CarouselController.js';
import { uploadCarousel } from '../config/Cloudinary.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// Apply protect to all routes


router.post('/', protect,authorize('owner', 'admin'), uploadCarousel.single('image'), carouselCtrl.createCarousel);
router.get('/', carouselCtrl.getCarousels);
router.put('/:id',protect, authorize('owner', 'admin'), uploadCarousel.single('image'), carouselCtrl.updateCarousel);
router.delete('/:id', protect,authorize('owner', 'admin'), carouselCtrl.deleteCarousel);

export default router;
