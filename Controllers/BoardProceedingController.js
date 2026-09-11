import BoardProceeding from '../Models/BoardProceeding.js';
import { cloudinary, upload } from '../config/Cloudinary.js';

// Multer upload middleware for single document (accepts field name 'document')
export const boardProceedingUpload = upload.single('document');

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
export const createBoardProceeding = async (req, res) => {
  try {
    const { title, category, type, description, date } = req.body;

    if (!title) {
      // If file was uploaded but validation failed, cleanup Cloudinary upload
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(400).json({ message: 'Title is required' });
    }

    const newBoardProceeding = await BoardProceeding.create({
      title,
      category: category || type || "BP's & Orders", // default to "BP's & Orders"
      description: description || undefined,
      date: date || Date.now(),
      docUrl: req.file ? req.file.path : null, // Cloudinary file URL
      cloudinaryId: req.file ? req.file.filename : null // Cloudinary public ID
    });

    res.status(201).json({
      success: true,
      message: 'Board Proceeding created successfully',
      data: newBoardProceeding
    });
  } catch (err) {
    // Cleanup Cloudinary file if database insertion fails
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
export const getAllBoardProceedings = async (req, res) => {
  try {
    const { category, type, search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};

    // Filter by category (e.g. "BP's & Orders" or "Panels & Promotion")
    const selectedCategory = category || type;
    if (selectedCategory) {
      filter.category = selectedCategory;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOption = { [sortBy]: order === 'asc' ? 1 : -1 };

    const boardProceedings = await BoardProceeding.find(filter).sort(sortOption);
    res.status(200).json(boardProceedings);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- GET BY ID ---
export const getBoardProceedingById = async (req, res) => {
  try {
    const { id } = req.params;
    const boardProceeding = await BoardProceeding.findById(id);

    if (!boardProceeding) {
      return res.status(404).json({ message: 'Board Proceeding not found' });
    }

    res.status(200).json(boardProceeding);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- UPDATE ---
export const updateBoardProceeding = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, type, description, date } = req.body;

    const boardProceeding = await BoardProceeding.findById(id);
    if (!boardProceeding) {
      // Cleanup any newly uploaded file if document is not found
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(404).json({ message: 'Board Proceeding not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined || type !== undefined) updateData.category = category || type;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = date;

    // Handle new document file upload
    if (req.file) {
      // Delete old file from Cloudinary if it exists
      if (boardProceeding.cloudinaryId) {
        await deleteFromCloudinary(boardProceeding.cloudinaryId);
      }
      updateData.docUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedBoardProceeding = await BoardProceeding.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Board Proceeding updated successfully',
      data: updatedBoardProceeding
    });
  } catch (err) {
    // Cleanup newly uploaded Cloudinary file if update fails
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
export const deleteBoardProceeding = async (req, res) => {
  try {
    const { id } = req.params;
    const boardProceeding = await BoardProceeding.findById(id);

    if (!boardProceeding) {
      return res.status(404).json({ message: 'Board Proceeding not found' });
    }

    // Delete associated file from Cloudinary
    if (boardProceeding.cloudinaryId) {
      await deleteFromCloudinary(boardProceeding.cloudinaryId);
    }

    // Delete record from database
    await BoardProceeding.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Board Proceeding and associated document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};
