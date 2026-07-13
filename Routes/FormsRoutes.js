import express from 'express';
import { formsUpload, createForm, getAllForms, getFormById, updateForm, deleteForm } from '../Controllers/FormsController.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// CRUD Routes with route protection
router.post('/',  formsUpload, createForm);
router.get('/', getAllForms);
router.get('/:id', getFormById);
router.put('/:id', protect, formsUpload, updateForm);
router.delete('/:id',deleteForm);

export default router;
