import ActRegulation from '../Models/General_Info/ActRegulation.js';
import { cloudinary, upload } from '../config/Cloudinary.js';

// Multer upload middleware for single document
export const actRegulationUpload = upload.single('document');

// Helper to safely delete file from Cloudinary (attempts raw first, then image/auto)
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    if (result && result.result === 'not found') {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error('❌ Failed to delete file from Cloudinary:', err.message);
  }
};

// --- CREATE ---
export const createActRegulation = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const newActRegulation = await ActRegulation.create({
      title,
      docUrl: req.file ? req.file.path : null,
      cloudinaryId: req.file ? req.file.filename : null
    });

    res.status(201).json({
      success: true,
      message: 'Act & Regulation created successfully',
      data: newActRegulation
    });
  } catch (err) {
    if (req.file && req.file.filename) {
      await deleteFromCloudinary(req.file.filename);
    }
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- GET ALL ---
export const getAllActRegulations = async (req, res) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const sortOption = { [sortBy]: order === 'asc' ? 1 : -1 };
    const actRegulations = await ActRegulation.find(filter).sort(sortOption);

    res.status(200).json(actRegulations);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- GET BY ID ---
export const getActRegulationById = async (req, res) => {
  try {
    const { id } = req.params;
    const actRegulation = await ActRegulation.findById(id);

    if (!actRegulation) {
      return res.status(404).json({ success: false, message: 'Act & Regulation not found' });
    }

    res.status(200).json(actRegulation);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- UPDATE ---
export const updateActRegulation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const actRegulation = await ActRegulation.findById(id);
    if (!actRegulation) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(404).json({ success: false, message: 'Act & Regulation not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;

    // Handle new document file upload
    if (req.file) {
      // Delete old file from Cloudinary if exists
      if (actRegulation.cloudinaryId) {
        await deleteFromCloudinary(actRegulation.cloudinaryId);
      }
      updateData.docUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedActRegulation = await ActRegulation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Act & Regulation updated successfully',
      data: updatedActRegulation
    });
  } catch (err) {
    if (req.file && req.file.filename) {
      await deleteFromCloudinary(req.file.filename);
    }
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- DELETE ---
export const deleteActRegulation = async (req, res) => {
  try {
    const { id } = req.params;
    const actRegulation = await ActRegulation.findById(id);

    if (!actRegulation) {
      return res.status(404).json({ success: false, message: 'Act & Regulation not found' });
    }

    // Delete associated file from Cloudinary
    if (actRegulation.cloudinaryId) {
      await deleteFromCloudinary(actRegulation.cloudinaryId);
    }

    // Delete record from database
    await ActRegulation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Act & Regulation and associated document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};
