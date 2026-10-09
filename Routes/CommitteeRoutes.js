import express from 'express';
import {
  getPublicCommitteeData,
  memberPhotoUpload,
  createMember,
  getAdminMembers,
  updateMember,
  deleteMember,
  getTerm,
  updateTerm,
  createResponsibility,
  getAdminResponsibilities,
  updateResponsibility,
  deleteResponsibility
} from '../Controllers/CommitteeController.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// ==========================================
// PUBLIC API
// ==========================================
// GET /api/committees/:type (CEC or EBF)
router.get('/committees/:type', getPublicCommitteeData);

// ==========================================
// ADMIN APIs (Protected with JWT & Role Auth)
// ==========================================

// Members CRUD
router.post('/admin/committees/:type/members', protect, authorize('owner', 'admin'), memberPhotoUpload, createMember);
router.get('/admin/committees/:type/members', protect, authorize('owner', 'admin'), getAdminMembers);
router.put('/admin/committees/:type/members/:id', protect, authorize('owner', 'admin'), memberPhotoUpload, updateMember);
router.delete('/admin/committees/:type/members/:id', protect, authorize('owner', 'admin'), deleteMember);

// Term CRUD
router.get('/admin/committees/:type/term', protect, authorize('owner', 'admin'), getTerm);
router.put('/admin/committees/:type/term', protect, authorize('owner', 'admin'), updateTerm);

// Responsibilities CRUD
router.post('/admin/committees/:type/responsibilities', protect, authorize('owner', 'admin'), createResponsibility);
router.get('/admin/committees/:type/responsibilities', protect, authorize('owner', 'admin'), getAdminResponsibilities);
router.put('/admin/committees/:type/responsibilities/:id', protect, authorize('owner', 'admin'), updateResponsibility);
router.delete('/admin/committees/:type/responsibilities/:id', protect, authorize('owner', 'admin'), deleteResponsibility);

export default router;
