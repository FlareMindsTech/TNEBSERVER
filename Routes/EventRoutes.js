import express from 'express';
import * as eventCtrl from '../Controllers/EventController.js';
import { upload } from '../Config/Cloudinary.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();


router.get('/', eventCtrl.getEvents);

// Apply protect to all routes

<<<<<<< HEAD
router.post('/', authorize('owner', 'admin'), upload.single('pdf'), eventCtrl.createEvent);
router.put('/:id', authorize('owner', 'admin'), upload.single('pdf'), eventCtrl.updateEvent);
router.delete('/:id', authorize('owner', 'admin'), eventCtrl.deleteEvent);
=======
router.post('/', protect,authorize('owner', 'admin'), upload.single('pdf'), eventCtrl.createEvent);
router.get('/', eventCtrl.getEvents);
router.put('/:id', protect,authorize('owner', 'admin'), upload.single('pdf'), eventCtrl.updateEvent);
router.delete('/:id', protect,authorize('owner', 'admin'), eventCtrl.deleteEvent);
>>>>>>> ea510bf4c0f175fcc7b96505db32e1226c7574a8

export default router;