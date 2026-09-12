import TechnicalBook from '../Models/TechnicalBook.js';
import { cloudinary, upload } from '../config/Cloudinary.js';

// Multer upload middleware for single document (accepts field name 'document')
export const technicalBookUpload = upload.single('document');

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

// Helper to parse tag and tags
const parseTagData = (tag, tags) => {
  let parsedTag = typeof tag === 'string' ? tag.trim() : '';
  let parsedTags = [];

  if (Array.isArray(tags)) {
    parsedTags = tags.map(t => String(t).trim()).filter(Boolean);
  } else if (typeof tags === 'string' && tags.trim().length > 0) {
    try {
      const jsonParsed = JSON.parse(tags);
      if (Array.isArray(jsonParsed)) {
        parsedTags = jsonParsed.map(t => String(t).trim()).filter(Boolean);
      } else {
        parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    } catch {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  } else if (parsedTag) {
    parsedTags = parsedTag.split(',').map(t => t.trim()).filter(Boolean);
  }

  return { parsedTag, parsedTags };
};

// --- CREATE ---
export const createTechnicalBook = async (req, res) => {
  try {
    const { title, tag, tags } = req.body;

    if (!title || !title.trim()) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const { parsedTag, parsedTags } = parseTagData(tag, tags);

    // Validate 30 characters limit on each individual tag
    for (const t of parsedTags) {
      if (t.length > 30) {
        if (req.file && req.file.filename) {
          await deleteFromCloudinary(req.file.filename);
        }
        return res.status(400).json({
          success: false,
          message: `Each tag cannot exceed 30 characters (Tag "${t}" exceeds 30 characters)`
        });
      }
    }

    const newTechnicalBook = await TechnicalBook.create({
      title: title.trim(),
      tag: parsedTag || (parsedTags.length > 0 ? parsedTags[0] : ''),
      tags: parsedTags,
      docUrl: req.file ? req.file.path : null,
      cloudinaryId: req.file ? req.file.filename : null
    });

    res.status(201).json({
      success: true,
      message: 'Technical Book created successfully',
      data: newTechnicalBook
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
export const getAllTechnicalBooks = async (req, res) => {
  try {
    const { tag, search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};

    if (tag && tag.toLowerCase() !== 'all') {
      filter.$or = [
        { tag: { $regex: new RegExp(`^${tag}$`, 'i') } },
        { tags: { $in: [new RegExp(`^${tag}$`, 'i')] } }
      ];
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tag: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOption = { [sortBy]: order === 'asc' ? 1 : -1 };
    const technicalBooks = await TechnicalBook.find(filter).sort(sortOption);

    res.status(200).json(technicalBooks);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- GET BY ID ---
export const getTechnicalBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const technicalBook = await TechnicalBook.findById(id);

    if (!technicalBook) {
      return res.status(404).json({ success: false, message: 'Technical Book not found' });
    }

    res.status(200).json(technicalBook);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- UPDATE ---
export const updateTechnicalBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, tag, tags } = req.body;

    const technicalBook = await TechnicalBook.findById(id);
    if (!technicalBook) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(404).json({ success: false, message: 'Technical Book not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();

    if (tag !== undefined || tags !== undefined) {
      const { parsedTag, parsedTags } = parseTagData(tag ?? technicalBook.tag, tags ?? technicalBook.tags);

      // Validate 30 characters limit on each individual tag
      for (const t of parsedTags) {
        if (t.length > 30) {
          if (req.file && req.file.filename) {
            await deleteFromCloudinary(req.file.filename);
          }
          return res.status(400).json({
            success: false,
            message: `Each tag cannot exceed 30 characters (Tag "${t}" exceeds 30 characters)`
          });
        }
      }

      updateData.tag = parsedTag || (parsedTags.length > 0 ? parsedTags[0] : '');
      updateData.tags = parsedTags;
    }

    // Handle new document file upload
    if (req.file) {
      // Delete old file from Cloudinary if exists
      if (technicalBook.cloudinaryId) {
        await deleteFromCloudinary(technicalBook.cloudinaryId);
      }
      updateData.docUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedTechnicalBook = await TechnicalBook.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Technical Book updated successfully',
      data: updatedTechnicalBook
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
export const deleteTechnicalBook = async (req, res) => {
  try {
    const { id } = req.params;
    const technicalBook = await TechnicalBook.findById(id);

    if (!technicalBook) {
      return res.status(404).json({ success: false, message: 'Technical Book not found' });
    }

    // Delete associated file from Cloudinary
    if (technicalBook.cloudinaryId) {
      await deleteFromCloudinary(technicalBook.cloudinaryId);
    }

    // Delete record from database
    await TechnicalBook.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Technical Book and associated document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};
