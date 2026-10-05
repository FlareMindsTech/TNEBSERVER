import TechnicalQA from '../Models/TechnicalQA.js';
import { upload, deleteFromBunny } from '../config/Bunny.js';

// Multer upload middleware for single document (accepts field name 'document')
export const technicalQAUpload = upload.single('document');

// Helper to safely delete file from Bunny
const deleteFile = async (fileKeyOrUrl) => {
  if (!fileKeyOrUrl) return;
  await deleteFromBunny(fileKeyOrUrl);
};

// --- CREATE ---
export const createTechnicalQA = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      if (req.file && req.file.filename) {
        await deleteFile(req.file.filename);
      }
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const newTechnicalQA = await TechnicalQA.create({
      title,
      description: description || '',
      docUrl: req.file ? req.file.path : null,
      cloudinaryId: req.file ? req.file.filename : null
    });

    res.status(201).json({
      success: true,
      message: 'Technical Q&A created successfully',
      data: newTechnicalQA
    });
  } catch (err) {
    if (req.file && req.file.filename) {
      await deleteFile(req.file.filename);
    }
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- GET ALL ---
export const getAllTechnicalQA = async (req, res) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOption = { [sortBy]: order === 'asc' ? 1 : -1 };
    const technicalQAList = await TechnicalQA.find(filter).sort(sortOption);

    res.status(200).json(technicalQAList);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- GET BY ID ---
export const getTechnicalQAById = async (req, res) => {
  try {
    const { id } = req.params;
    const technicalQA = await TechnicalQA.findById(id);

    if (!technicalQA) {
      return res.status(404).json({ success: false, message: 'Technical Q&A not found' });
    }

    res.status(200).json(technicalQA);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- UPDATE ---
export const updateTechnicalQA = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const technicalQA = await TechnicalQA.findById(id);
    if (!technicalQA) {
      if (req.file && req.file.filename) {
        await deleteFile(req.file.filename);
      }
      return res.status(404).json({ success: false, message: 'Technical Q&A not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    // Handle new document file upload
    if (req.file) {
      // Delete old file from Cloudinary if exists
      if (technicalQA.cloudinaryId) {
        await deleteFile(technicalQA.cloudinaryId);
      }
      updateData.docUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedTechnicalQA = await TechnicalQA.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Technical Q&A updated successfully',
      data: updatedTechnicalQA
    });
  } catch (err) {
    if (req.file && req.file.filename) {
      await deleteFile(req.file.filename);
    }
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- DELETE ---
export const deleteTechnicalQA = async (req, res) => {
  try {
    const { id } = req.params;
    const technicalQA = await TechnicalQA.findById(id);

    if (!technicalQA) {
      return res.status(404).json({ success: false, message: 'Technical Q&A not found' });
    }

    // Delete associated file from Cloudinary
    if (technicalQA.cloudinaryId) {
      await deleteFile(technicalQA.cloudinaryId);
    }

    // Delete record from database
    await TechnicalQA.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Technical Q&A and associated document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};
