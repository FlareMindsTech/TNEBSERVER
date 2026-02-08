import express from 'express';
import * as carouselCtrl from '../Controllers/CarouselController.js';
import { upload } from '../config/Cloudinary.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// Apply protect to all routes
router.use(protect);

router.post('/', authorize('owner', 'admin'), upload.single('image'), carouselCtrl.createCarousel);
router.get('/', carouselCtrl.getCarousels);
router.put('/:id', authorize('owner', 'admin'), upload.single('image'), carouselCtrl.updateCarousel);
router.delete('/:id', authorize('owner', 'admin'), carouselCtrl.deleteCarousel);

export default router;
