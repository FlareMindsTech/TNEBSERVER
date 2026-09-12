import TechnicalBook from '../Models/TechnicalBook.js';
import { cloudinary, upload } from '../config/Cloudinary.js';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';

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

// Helper to count PDF pages using pdf-lib
const getPdfPageCount = async (pdfUrl) => {
  try {
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const pdfDoc = await PDFDocument.load(response.data);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error counting PDF pages for Technical Book:', error);
    return 1;
  }
};

// Helper to construct Cloudinary page JPG URLs for 3D flipbook
const buildCloudinaryPageUrls = (publicId, pageCount) => {
  const safePageCount = Math.max(1, Number(pageCount) || 1);
  const pagesArray = [];

  for (let i = 1; i <= safePageCount; i++) {
    const pageUrl = cloudinary.url(publicId, {
      resource_type: 'image',
      type: 'upload',
      page: i,
      format: 'jpg',
      secure: true
    });
    pagesArray.push(pageUrl);
  }

  return pagesArray;
};

// Helper to ensure existing books have flipbook pages generated
const ensureTechnicalBookPages = async (bookDoc) => {
  if (!bookDoc?.docUrl || !bookDoc?.cloudinaryId) {
    return bookDoc;
  }

  const isPdf = typeof bookDoc.docUrl === 'string' && (bookDoc.docUrl.toLowerCase().includes('.pdf') || bookDoc.docUrl.toLowerCase().includes('/raw/upload/'));
  if (!isPdf) {
    return bookDoc;
  }

  const hasPages = Array.isArray(bookDoc.pages) && bookDoc.pages.length > 0;
  if (hasPages) {
    return bookDoc;
  }

  try {
    const pageCount = await getPdfPageCount(bookDoc.docUrl);
    const pages = buildCloudinaryPageUrls(bookDoc.cloudinaryId, pageCount);
    bookDoc.pageCount = pageCount;
    bookDoc.pages = pages;
    await bookDoc.save();
  } catch (e) {
    console.error('Failed to generate flipbook pages for book:', bookDoc.title, e);
  }
  return bookDoc;
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

    let pages = [];
    let pageCount = 0;
    if (req.file && req.file.path && (req.file.path.toLowerCase().includes('.pdf') || req.file.mimetype === 'application/pdf')) {
      pageCount = await getPdfPageCount(req.file.path);
      pages = buildCloudinaryPageUrls(req.file.filename, pageCount);
    }

    const newTechnicalBook = await TechnicalBook.create({
      title: title.trim(),
      tag: parsedTag || (parsedTags.length > 0 ? parsedTags[0] : ''),
      tags: parsedTags,
      docUrl: req.file ? req.file.path : null,
      cloudinaryId: req.file ? req.file.filename : null,
      pages,
      pageCount
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

    await Promise.all(technicalBooks.map((item) => ensureTechnicalBookPages(item)));

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
    let technicalBook = await TechnicalBook.findById(id);

    if (!technicalBook) {
      return res.status(404).json({ success: false, message: 'Technical Book not found' });
    }

    technicalBook = await ensureTechnicalBookPages(technicalBook);

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

      if (req.file.path && (req.file.path.toLowerCase().includes('.pdf') || req.file.mimetype === 'application/pdf')) {
        const pageCount = await getPdfPageCount(req.file.path);
        updateData.pageCount = pageCount;
        updateData.pages = buildCloudinaryPageUrls(req.file.filename, pageCount);
      }
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
