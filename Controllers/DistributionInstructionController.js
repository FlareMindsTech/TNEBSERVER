import DistributionInstruction from '../Models/General_Info/DistributionInstruction.js';
import { upload, deleteFromBunny } from '../config/Bunny.js';

// Multer upload middleware for single document
export const instructionUpload = upload.single('document');
export const distributionInstructionUpload = upload.single('document');

// Helper to safely delete file from Bunny
const deleteFile = async (fileKeyOrUrl) => {
  if (!fileKeyOrUrl) return;
  await deleteFromBunny(fileKeyOrUrl);
};

// --- CREATE ---
export const createDistributionInstruction = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      if (req.file && req.file.filename) {
        await deleteFile(req.file.filename);
      }
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const newDistributionInstruction = await DistributionInstruction.create({
      title,
      docUrl: req.file ? req.file.path : null,
      cloudinaryId: req.file ? req.file.filename : null
    });

    res.status(201).json({
      success: true,
      message: 'Distribution Instruction created successfully',
      data: newDistributionInstruction
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
export const getAllDistributionInstructions = async (req, res) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const sortOption = { [sortBy]: order === 'asc' ? 1 : -1 };
    const instructions = await DistributionInstruction.find(filter).sort(sortOption);

    res.status(200).json(instructions);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- GET BY ID ---
export const getDistributionInstructionById = async (req, res) => {
  try {
    const { id } = req.params;
    const instruction = await DistributionInstruction.findById(id);

    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Distribution Instruction not found' });
    }

    res.status(200).json(instruction);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- UPDATE ---
export const updateDistributionInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const instruction = await DistributionInstruction.findById(id);
    if (!instruction) {
      if (req.file && req.file.filename) {
        await deleteFile(req.file.filename);
      }
      return res.status(404).json({ success: false, message: 'Distribution Instruction not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;

    // Handle new document file upload
    if (req.file) {
      // Delete old file from Cloudinary if exists
      if (instruction.cloudinaryId) {
        await deleteFile(instruction.cloudinaryId);
      }
      updateData.docUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedInstruction = await DistributionInstruction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Distribution Instruction updated successfully',
      data: updatedInstruction
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
export const deleteDistributionInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const instruction = await DistributionInstruction.findById(id);

    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Distribution Instruction not found' });
    }

    // Delete associated file from Cloudinary
    if (instruction.cloudinaryId) {
      await deleteFile(instruction.cloudinaryId);
    }

    // Delete record from database
    await DistributionInstruction.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Distribution Instruction and associated document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};
