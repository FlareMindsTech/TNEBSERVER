import Forms from '../Models/Forms.js';
import { upload, deleteFromBunny } from '../config/Bunny.js';

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
      pdfUrl: req.file.path, // Bunny URL
      cloudinaryId: req.file.filename // Bunny file Key
    });

    res.status(201).json(newForm);
  } catch (err) {
    // Cleanup upload if DB write fails
    if (req.file && req.file.filename) {
      try {
        await deleteFromBunny(req.file.filename);
      } catch (cleanupErr) {
        console.error('❌ Failed to cleanup file on create failure:', cleanupErr.message);
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
      // Cleanup file if document doesn't exist
      if (req.file && req.file.filename) {
        try {
          await deleteFromBunny(req.file.filename);
        } catch (cleanupErr) {
          console.error('❌ Failed to cleanup file:', cleanupErr.message);
        }
      }
      return res.status(404).json({ message: 'Document not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;

    // Handle new document file upload
    if (req.file) {
      // Delete old file
      if (form.cloudinaryId || form.pdfUrl) {
        try {
          await deleteFromBunny(form.cloudinaryId || form.pdfUrl);
        } catch (cleanupErr) {
          console.error('❌ Failed to delete old file:', cleanupErr.message);
        }
      }
      updateData.pdfUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedForm = await Forms.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).json(updatedForm);
  } catch (err) {
    // Cleanup newly uploaded file if update fails
    if (req.file && req.file.filename) {
      try {
        await deleteFromBunny(req.file.filename);
      } catch (cleanupErr) {
        console.error('❌ Failed to cleanup newly uploaded file on update failure:', cleanupErr.message);
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

    // Delete associated file
    if (form.cloudinaryId || form.pdfUrl) {
      try {
        await deleteFromBunny(form.cloudinaryId || form.pdfUrl);
      } catch (cleanupErr) {
        console.error('❌ Failed to delete file on document delete:', cleanupErr.message);
      }
    }

    // Delete record from database
    await Forms.findByIdAndDelete(id);

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
