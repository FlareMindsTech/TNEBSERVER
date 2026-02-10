import express from 'express';
import * as carouselCtrl from '../Controllers/CarouselController.js';
import { upload } from '../Config/Cloudinary.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();


router.get('/', carouselCtrl.getCarousels);

// Apply protect to all routes
router.use(protect);

<<<<<<< HEAD
router.post('/', authorize('owner', 'admin'), upload.single('image'), carouselCtrl.createCarousel);
router.put('/:id', authorize('owner', 'admin'), upload.single('image'), carouselCtrl.updateCarousel);
router.delete('/:id', authorize('owner', 'admin'), carouselCtrl.deleteCarousel);
=======
router.post('/', protect,authorize('owner', 'admin'), upload.single('image'), carouselCtrl.createCarousel);
router.get('/', carouselCtrl.getCarousels);
router.put('/:id',protect, authorize('owner', 'admin'), upload.single('image'), carouselCtrl.updateCarousel);
router.delete('/:id', protect,authorize('owner', 'admin'), carouselCtrl.deleteCarousel);
>>>>>>> ea510bf4c0f175fcc7b96505db32e1226c7574a8

export default router;
