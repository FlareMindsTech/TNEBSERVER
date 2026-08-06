import express from 'express';
import * as userCtrl from '../Controllers/UserController.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';
import { loginRateLimiter } from '../Middleware/loginRateLimiter.js';

const router = express.Router();

router.post('/register', userCtrl.register);
router.post('/login', loginRateLimiter, userCtrl.login);
router.post('/admin-login', userCtrl.adminLogin);
router.post('/forgot-password', userCtrl.forgotPassword);
// router.post('/create-lm-number', protect, authorize('owner', 'superadmin', 'admin'), userCtrl.createLMNumber);
// Bulk upload removed in favor of manual seeding script
// router.post('/upload-lm-numbers', protect, authorize('owner'), userCtrl.uploadLMNumbers);

router.get('/all', userCtrl.getAllUsers);

router.route('/:id')
  .get(protect, userCtrl.getUserById)
  .put(protect, userCtrl.updateUser)
  .delete(userCtrl.deleteUser);

export default router;
