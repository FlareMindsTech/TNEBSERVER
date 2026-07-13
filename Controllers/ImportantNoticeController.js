import ImportantNotice from '../Models/ImportantNotice.js';
import { cloudinary, upload } from '../config/Cloudinary.js';

// Middleware for uploading single document/file
export const noticeUpload = upload.single('document');

// --- CREATE ---
export const createNotice = async (req, res) => {
  try {
    const { Notice_title, Type, date } = req.body;

    const newNotice = await ImportantNotice.create({
      Notice_title,
      Type,
      date: date || undefined, // fallback to schema default (Date.now) if not provided
      docUrl: req.file ? req.file.path : null, // Cloudinary URL
      cloudinaryId: req.file ? req.file.filename : null // Cloudinary public ID
    });

    res.status(201).json(newNotice);
  } catch (err) {
    // Cleanup Cloudinary upload if DB write fails
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'raw' });
      } catch (cleanupErr) {
        console.error('❌ Failed to cleanup Cloudinary file on create failure:', cleanupErr.message);
      }
    }
    res.status(500).json({ error: err.message || err });
  }
};

// --- GET ALL ---
export const getAllNotices = async (req, res) => {
  try {
    const filter = {};
    if (req.query.Type) {
      filter.Type = req.query.Type;
    }
    const notices = await ImportantNotice.find(filter).sort({ date: -1 });
    res.status(200).json(notices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- GET BY ID ---
export const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await ImportantNotice.findById(id);
    
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    
    res.status(200).json(notice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- UPDATE ---
export const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { Notice_title, Type, date } = req.body;

    const notice = await ImportantNotice.findById(id);
    if (!notice) {
      // Cleanup Cloudinary file if notice doesn't exist
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'raw' });
        } catch (cleanupErr) {
          console.error('❌ Failed to cleanup Cloudinary file:', cleanupErr.message);
        }
      }
      return res.status(404).json({ message: 'Notice not found' });
    }

    const updateData = {};
    if (Notice_title !== undefined) updateData.Notice_title = Notice_title;
    if (Type !== undefined) updateData.Type = Type;
    if (date !== undefined) updateData.date = date;

    // Handle new document file upload to Cloudinary
    if (req.file) {
      // Delete old file from Cloudinary
      if (notice.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(notice.cloudinaryId, { resource_type: 'raw' });
        } catch (cleanupErr) {
          console.error('❌ Failed to delete old file from Cloudinary:', cleanupErr.message);
        }
      }
      updateData.docUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedNotice = await ImportantNotice.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).json(updatedNotice);
  } catch (err) {
    // Cleanup newly uploaded Cloudinary file if update fails
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'raw' });
      } catch (cleanupErr) {
        console.error('❌ Failed to cleanup newly uploaded Cloudinary file on update failure:', cleanupErr.message);
      }
    }
    res.status(500).json({ error: err.message || err });
  }
};

// --- DELETE ---
export const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const notice = await ImportantNotice.findById(id);

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Delete associated file from Cloudinary
    if (notice.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(notice.cloudinaryId, { resource_type: 'raw' });
      } catch (cleanupErr) {
        console.error('❌ Failed to delete file from Cloudinary on notice delete:', cleanupErr.message);
      }
    }

    // Delete record from database
    await ImportantNotice.findByIdAndDelete(id);

    res.status(200).json({ message: 'Notice deleted successfully from DB and Cloudinary' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
