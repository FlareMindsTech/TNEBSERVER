import TechnicalParameter from '../Models/TechnicalParameter.js';
import { cloudinary, upload } from '../config/Cloudinary.js';

// Multer upload middleware for single document (accepts field name 'document')
export const technicalParameterUpload = upload.single('document');

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
export const createTechnicalParameter = async (req, res) => {
  try {
    const { title, category, tag, tags } = req.body;

    if (!title || !title.trim()) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (!category || !category.trim()) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const { parsedTag, parsedTags } = parseTagData(tag, tags);

    // Validate 30 characters limit on tag and each item in tags
    if (parsedTag && parsedTag.length > 30) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(400).json({ success: false, message: 'Tag cannot exceed 30 characters' });
    }

    for (const t of parsedTags) {
      if (t.length > 30) {
        if (req.file && req.file.filename) {
          await deleteFromCloudinary(req.file.filename);
        }
        return res.status(400).json({
          success: false,
          message: `Tag "${t}" exceeds maximum allowed length of 30 characters`
        });
      }
    }

    const newTechnicalParameter = await TechnicalParameter.create({
      title: title.trim(),
      category: category.trim(),
      tag: parsedTag || (parsedTags.length > 0 ? parsedTags[0] : ''),
      tags: parsedTags,
      docUrl: req.file ? req.file.path : null,
      cloudinaryId: req.file ? req.file.filename : null
    });

    res.status(201).json({
      success: true,
      message: 'Technical Parameter created successfully',
      data: newTechnicalParameter
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
export const getAllTechnicalParameters = async (req, res) => {
  try {
    const { category, search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const filter = {};

    if (category && category.toLowerCase() !== 'all') {
      filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tag: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOption = { [sortBy]: order === 'asc' ? 1 : -1 };
    const technicalParameters = await TechnicalParameter.find(filter).sort(sortOption);

    res.status(200).json(technicalParameters);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- GET BY ID ---
export const getTechnicalParameterById = async (req, res) => {
  try {
    const { id } = req.params;
    const technicalParameter = await TechnicalParameter.findById(id);

    if (!technicalParameter) {
      return res.status(404).json({ success: false, message: 'Technical Parameter not found' });
    }

    res.status(200).json(technicalParameter);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};

// --- UPDATE ---
export const updateTechnicalParameter = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, tag, tags } = req.body;

    const technicalParameter = await TechnicalParameter.findById(id);
    if (!technicalParameter) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename);
      }
      return res.status(404).json({ success: false, message: 'Technical Parameter not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (category !== undefined) updateData.category = category.trim();

    if (tag !== undefined || tags !== undefined) {
      const { parsedTag, parsedTags } = parseTagData(tag ?? technicalParameter.tag, tags ?? technicalParameter.tags);

      if (parsedTag && parsedTag.length > 30) {
        if (req.file && req.file.filename) {
          await deleteFromCloudinary(req.file.filename);
        }
        return res.status(400).json({ success: false, message: 'Tag cannot exceed 30 characters' });
      }

      for (const t of parsedTags) {
        if (t.length > 30) {
          if (req.file && req.file.filename) {
            await deleteFromCloudinary(req.file.filename);
          }
          return res.status(400).json({
            success: false,
            message: `Tag "${t}" exceeds maximum allowed length of 30 characters`
          });
        }
      }

      updateData.tag = parsedTag || (parsedTags.length > 0 ? parsedTags[0] : '');
      updateData.tags = parsedTags;
    }

    // Handle new document file upload
    if (req.file) {
      // Delete old file from Cloudinary if exists
      if (technicalParameter.cloudinaryId) {
        await deleteFromCloudinary(technicalParameter.cloudinaryId);
      }
      updateData.docUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedTechnicalParameter = await TechnicalParameter.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Technical Parameter updated successfully',
      data: updatedTechnicalParameter
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
export const deleteTechnicalParameter = async (req, res) => {
  try {
    const { id } = req.params;
    const technicalParameter = await TechnicalParameter.findById(id);

    if (!technicalParameter) {
      return res.status(404).json({ success: false, message: 'Technical Parameter not found' });
    }

    // Delete associated file from Cloudinary
    if (technicalParameter.cloudinaryId) {
      await deleteFromCloudinary(technicalParameter.cloudinaryId);
    }

    // Delete record from database
    await TechnicalParameter.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Technical Parameter and associated document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || err
    });
  }
};
