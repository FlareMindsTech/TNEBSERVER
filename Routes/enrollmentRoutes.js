import express from 'express';
import { submitApplication, getAllApplications, deleteApplication, updateApplicationStatus } from '../Controllers/EnrollmentController.js';
import { upload } from '../config/Bunny.js';

const router = express.Router();

// Test Route: Retrieve all submitted forms
router.get('/applications', getAllApplications);

// A beautiful, unified endpoint for EVERY form your UI ever creates. 
// Uses upload.any() because this endpoint dynamically absorbs whatever form schema the frontend sends.
router.post('/submit', upload.any(), submitApplication);

// Complete Application Teardown (DB + CDN logic)
router.delete('/:id', deleteApplication);

router.patch('/:id/status', updateApplicationStatus);

export default router;
