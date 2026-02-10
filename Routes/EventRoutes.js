import express from 'express';
import * as eventCtrl from '../Controllers/EventController.js';
import { upload } from '../Config/Cloudinary.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// Apply protect to all routes

router.post('/', protect,authorize('owner', 'admin'), upload.single('pdf'), eventCtrl.createEvent);
router.get('/', eventCtrl.getEvents);
router.put('/:id', protect,authorize('owner', 'admin'), upload.single('pdf'), eventCtrl.updateEvent);
router.delete('/:id', protect,authorize('owner', 'admin'), eventCtrl.deleteEvent);

export default router;