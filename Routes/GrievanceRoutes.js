import express from 'express';
import {
  grievanceAttachmentUpload,
  createGrievance,
  getAllGrievances,
  getGrievanceStats,
  getGrievanceById,
  updateGrievance,
  updateGrievanceStatus,
  verifyGrievance,
  deleteGrievance,
} from '../Controllers/GrievanceController.js';

const router = express.Router();

// Summary statistics endpoint (must be declared before /:id)
router.get('/stats', getGrievanceStats);

// Submit Grievance Form (Upload 1 file, Max 10 MB)
router.post('/', grievanceAttachmentUpload, createGrievance);

// List all Grievances with filters, search, and pagination
router.get('/', getAllGrievances);

// Get single Grievance by ID
router.get('/:id', getGrievanceById);

// Update Grievance details or replace attachment
router.put('/:id', grievanceAttachmentUpload, updateGrievance);

// Quick status and remarks update
router.patch('/:id/status', updateGrievanceStatus);

// Admin verification toggle endpoint (PATCH /api/grievances/:id/verify)
router.patch('/:id/verify', verifyGrievance);

// Delete Grievance and clean up CDN storage
router.delete('/:id', deleteGrievance);

export default router;
