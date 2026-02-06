import express from 'express';
import * as userCtrl from '../Controllers/UserController.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

router.post('/register', userCtrl.register);
router.post('/login', userCtrl.login);
// router.post('/create-lm-number', protect, authorize('owner', 'superadmin', 'admin'), userCtrl.createLMNumber);
// Bulk upload removed in favor of manual seeding script
// router.post('/upload-lm-numbers', protect, authorize('owner'), userCtrl.uploadLMNumbers);

router.get('/all', protect, authorize('owner'), userCtrl.getAllUsers);

export default router;
