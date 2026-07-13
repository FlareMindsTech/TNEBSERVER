import Forms from '../Models/Forms.js';
import { cloudinary, upload } from '../config/Cloudinary.js';

export const formsUpload = upload.single('pdf');

// --- CREATE ---
export const createForm = async (req, res) => {
  try {
    const { title, type } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Document file is required' });
    }

    const newForm = await Forms.create({
      title,
      type: type || 'form', // default to 'form' if type is not provided
      pdfUrl: req.file.path, // Cloudinary URL
      cloudinaryId: req.file.filename // Cloudinary public ID
    });

    res.status(201).json(newForm);
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
export const getAllForms = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    const forms = await Forms.find(filter).sort({ createdAt: -1 });
    res.status(200).json(forms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- GET BY ID ---
export const getFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Forms.findById(id);
    
    if (!form) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.status(200).json(form);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- UPDATE ---
export const updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type } = req.body;

    const form = await Forms.findById(id);
    if (!form) {
      // Cleanup Cloudinary file if document doesn't exist
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'raw' });
        } catch (cleanupErr) {
          console.error('❌ Failed to cleanup Cloudinary file:', cleanupErr.message);
        }
      }
      return res.status(404).json({ message: 'Document not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;

    // Handle new document file upload to Cloudinary
    if (req.file) {
      // Delete old file from Cloudinary
      if (form.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(form.cloudinaryId, { resource_type: 'raw' });
        } catch (cleanupErr) {
          console.error('❌ Failed to delete old file from Cloudinary:', cleanupErr.message);
        }
      }
      updateData.pdfUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedForm = await Forms.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).json(updatedForm);
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
export const deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Forms.findById(id);

    if (!form) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete associated file from Cloudinary
    if (form.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(form.cloudinaryId, { resource_type: 'raw' });
      } catch (cleanupErr) {
        console.error('❌ Failed to delete file from Cloudinary on document delete:', cleanupErr.message);
      }
    }

    // Delete record from database
    await Forms.findByIdAndDelete(id);

    res.status(200).json({ message: 'Document deleted successfully from DB and Cloudinary' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
