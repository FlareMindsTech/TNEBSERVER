import express from 'express';
import { 
  noticeUpload, 
  createNotice, 
  getAllNotices, 
  getNoticeById, 
  updateNotice, 
  deleteNotice 
} from '../Controllers/ImportantNoticeController.js';
import { protect } from '../Middleware/authMiddleware.js';
import { authorize } from '../Middleware/roleMiddleware.js';

const router = express.Router();

// CRUD Routes for Important Notices
router.post('/', noticeUpload, createNotice);
router.get('/', getAllNotices);
router.get('/:id', getNoticeById);
router.put('/:id',  noticeUpload, updateNotice);
router.delete('/:id', deleteNotice);

export default router;
