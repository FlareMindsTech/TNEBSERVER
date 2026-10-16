import mongoose from 'mongoose';
import multer from 'multer';
import Grievance from '../Models/Grievance.js';
import { uploadGrievance, deleteFromBunny } from '../config/Bunny.js';

// Multer middleware wrapper with error handling for file size limit (10MB) & supported formats
const uploadFields = uploadGrievance.fields([
  { name: 'attachment', maxCount: 1 },
  { name: 'supportingAttachment', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'document', maxCount: 1 },
]);

export const grievanceAttachmentUpload = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Attachment exceeds the 10 MB limit. Please upload a file smaller than 10 MB.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Only 1 attachment file is allowed.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file',
      });
    }

    // Normalize req.file from any of the allowed field names
    if (req.files) {
      const uploadedFile =
        req.files['attachment']?.[0] ||
        req.files['supportingAttachment']?.[0] ||
        req.files['file']?.[0] ||
        req.files['document']?.[0];

      if (uploadedFile) {
        req.file = uploadedFile;
      }
    }

    next();
  });
};

// Helper: Safely delete file from Bunny CDN
const cleanupUploadedFile = async (fileKeyOrUrl) => {
  if (!fileKeyOrUrl) return;
  try {
    await deleteFromBunny(fileKeyOrUrl);
  } catch (err) {
    console.error('❌ Failed to delete file from Bunny:', err.message);
  }
};

/**
 * @desc    Submit a new Grievance
 * @route   POST /api/grievances
 * @access  Public
 */
export const createGrievance = async (req, res) => {
  try {
    // Support multiple naming conventions from UI forms
    const lmNumber = (req.body.lmNumber || req.body['LM Number'] || req.body.LMNumber || '').trim();
    const name = (req.body.name || req.body.Name || '').trim();
    const district = (req.body.district || req.body.District || '').trim();
    const grievanceDetails = (
      req.body.grievanceDetails ||
      req.body['Grievance Details'] ||
      req.body.grievance_details ||
      req.body.details ||
      ''
    ).trim();

    // Validate required fields
    const missingFields = [];
    if (!lmNumber) missingFields.push('LM Number');
    if (!name) missingFields.push('Name');
    if (!grievanceDetails) missingFields.push('Grievance Details');

    if (missingFields.length > 0) {
      // If a file was uploaded before validation failure, clean it up
      if (req.file) {
        await cleanupUploadedFile(req.file.filename || req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(', ')}`,
      });
    }

    // Prepare grievance payload
    const grievancePayload = {
      lmNumber,
      name,
      district,
      grievanceDetails,
      status: 'Pending',
    };

    // Attach supporting file details if uploaded
    if (req.file) {
      grievancePayload.attachmentUrl = req.file.path || req.file.url;
      grievancePayload.attachmentKey = req.file.filename || req.file.public_id;
      grievancePayload.fileName = req.file.originalname;
      grievancePayload.fileSize = req.file.size;
      grievancePayload.fileType = req.file.mimetype;
    }

    const newGrievance = await Grievance.create(grievancePayload);

    return res.status(201).json({
      success: true,
      message: 'Grievance submitted successfully',
      data: newGrievance,
    });
  } catch (err) {
    // Clean up uploaded file if DB save fails
    if (req.file) {
      await cleanupUploadedFile(req.file.filename || req.file.path);
    }
    console.error('❌ Error creating grievance:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit grievance',
      error: err.message,
    });
  }
};

/**
 * @desc    Get all Grievances with filters, search, and pagination
 * @route   GET /api/grievances
 * @access  Public / Admin
 */
export const getAllGrievances = async (req, res) => {
  try {
    const {
      status,
      district,
      lmNumber,
      isVerified,
      verified,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
      all,
    } = req.query;

    const query = {};

    // Filter by status
    if (status && status !== 'All') {
      query.status = status;
    }

    // Filter by verification status (admin dashboard)
    const verifyFilter = isVerified !== undefined ? isVerified : verified;
    if (verifyFilter !== undefined && verifyFilter !== 'All') {
      query.isVerified = verifyFilter === 'true' || verifyFilter === true;
    }

    // Filter by district (case-insensitive exact or regex)
    if (district && district !== 'All') {
      query.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
    }

    // Filter by LM Number
    if (lmNumber) {
      query.lmNumber = { $regex: new RegExp(lmNumber.trim(), 'i') };
    }

    // General search across LM Number, Name, District, Grievance Details
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { lmNumber: searchRegex },
        { name: searchRegex },
        { district: searchRegex },
        { grievanceDetails: searchRegex },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    // Check if returning all results without pagination
    const isAll = all === 'true' || Number(limit) === 0;

    const totalCount = await Grievance.countDocuments(query);

    let grievancesQuery = Grievance.find(query).sort(sortOptions);

    if (!isAll) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      grievancesQuery = grievancesQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const grievances = await grievancesQuery;

    return res.status(200).json({
      success: true,
      count: grievances.length,
      total: totalCount,
      totalPages: isAll ? 1 : Math.ceil(totalCount / (parseInt(limit, 10) || 20)),
      currentPage: isAll ? 1 : parseInt(page, 10) || 1,
      data: grievances,
    });
  } catch (err) {
    console.error('❌ Error fetching grievances:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve grievances',
      error: err.message,
    });
  }
};

/**
 * @desc    Get summary statistics of grievances by status
 * @route   GET /api/grievances/stats
 * @access  Public / Admin
 */
export const getGrievanceStats = async (req, res) => {
  try {
    const [total, pending, verified, inProgress, resolved, rejected] = await Promise.all([
      Grievance.countDocuments(),
      Grievance.countDocuments({ status: 'Pending' }),
      Grievance.countDocuments({ isVerified: true }),
      Grievance.countDocuments({ status: 'In Progress' }),
      Grievance.countDocuments({ status: 'Resolved' }),
      Grievance.countDocuments({ status: 'Rejected' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        verified,
        inProgress,
        resolved,
        rejected,
      },
    });
  } catch (err) {
    console.error('❌ Error fetching grievance stats:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve grievance statistics',
      error: err.message,
    });
  }
};

/**
 * @desc    Get a single Grievance by ID
 * @route   GET /api/grievances/:id
 * @access  Public / Admin
 */
export const getGrievanceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Grievance ID format',
      });
    }

    const grievance = await Grievance.findById(id);

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: grievance,
    });
  } catch (err) {
    console.error('❌ Error fetching grievance by ID:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve grievance',
      error: err.message,
    });
  }
};

/**
 * @desc    Update a Grievance (details, status, verification, remarks, or replace attachment)
 * @route   PUT /api/grievances/:id
 * @access  Admin / Authorized
 */
export const updateGrievance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      if (req.file) await cleanupUploadedFile(req.file.filename || req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid Grievance ID format',
      });
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      if (req.file) await cleanupUploadedFile(req.file.filename || req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Grievance not found',
      });
    }

    const {
      lmNumber,
      name,
      district,
      grievanceDetails,
      status,
      isVerified,
      verifiedBy,
      verifiedByName,
      remarks,
      removeAttachment,
    } = req.body;

    // Update text fields if provided
    if (lmNumber !== undefined) grievance.lmNumber = lmNumber.trim();
    if (name !== undefined) grievance.name = name.trim();
    if (district !== undefined) grievance.district = district.trim();
    if (grievanceDetails !== undefined) grievance.grievanceDetails = grievanceDetails.trim();
    if (remarks !== undefined) grievance.remarks = remarks.trim();

    // Verification fields handling for admin dashboard
    if (isVerified !== undefined) {
      const verifyBool = isVerified === true || isVerified === 'true';
      grievance.isVerified = verifyBool;
      grievance.verifiedAt = verifyBool ? (grievance.verifiedAt || new Date()) : null;
    }
    if (verifiedBy !== undefined) grievance.verifiedBy = verifiedBy;
    if (verifiedByName !== undefined) grievance.verifiedByName = verifiedByName.trim();

    // Status update handling
    if (status !== undefined) {
      const validStatuses = ['Pending', 'Verified', 'In Progress', 'Resolved', 'Rejected'];
      if (!validStatuses.includes(status)) {
        if (req.file) await cleanupUploadedFile(req.file.filename || req.file.path);
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        });
      }

      grievance.status = status;
      if (status === 'Verified') {
        grievance.isVerified = true;
        grievance.verifiedAt = grievance.verifiedAt || new Date();
      }
      if (status === 'Resolved' && !grievance.resolvedAt) {
        grievance.resolvedAt = new Date();
      } else if (status !== 'Resolved') {
        grievance.resolvedAt = null;
      }
    }

    // Handle new attachment upload
    if (req.file) {
      // Cleanup old attachment from Bunny CDN if exists
      if (grievance.attachmentKey || grievance.attachmentUrl) {
        await cleanupUploadedFile(grievance.attachmentKey || grievance.attachmentUrl);
      }

      grievance.attachmentUrl = req.file.path || req.file.url;
      grievance.attachmentKey = req.file.filename || req.file.public_id;
      grievance.fileName = req.file.originalname;
      grievance.fileSize = req.file.size;
      grievance.fileType = req.file.mimetype;
    } else if (removeAttachment === true || removeAttachment === 'true') {
      // Remove attachment explicitly requested
      if (grievance.attachmentKey || grievance.attachmentUrl) {
        await cleanupUploadedFile(grievance.attachmentKey || grievance.attachmentUrl);
      }
      grievance.attachmentUrl = null;
      grievance.attachmentKey = null;
      grievance.fileName = null;
      grievance.fileSize = null;
      grievance.fileType = null;
    }

    const updatedGrievance = await grievance.save();

    return res.status(200).json({
      success: true,
      message: 'Grievance updated successfully',
      data: updatedGrievance,
    });
  } catch (err) {
    if (req.file) {
      await cleanupUploadedFile(req.file.filename || req.file.path);
    }
    console.error('❌ Error updating grievance:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update grievance',
      error: err.message,
    });
  }
};

/**
 * @desc    Quick status and remarks update for a Grievance
 * @route   PATCH /api/grievances/:id/status
 * @access  Admin
 */
export const updateGrievanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Grievance ID format',
      });
    }

    const validStatuses = ['Pending', 'Verified', 'In Progress', 'Resolved', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status is required and must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance not found',
      });
    }

    grievance.status = status;
    if (remarks !== undefined) {
      grievance.remarks = remarks.trim();
    }

    if (status === 'Verified') {
      grievance.isVerified = true;
      grievance.verifiedAt = grievance.verifiedAt || new Date();
    } else if (status === 'Resolved') {
      grievance.resolvedAt = grievance.resolvedAt || new Date();
    } else {
      grievance.resolvedAt = null;
    }

    const updated = await grievance.save();

    return res.status(200).json({
      success: true,
      message: `Grievance status updated to "${status}"`,
      data: updated,
    });
  } catch (err) {
    console.error('❌ Error updating grievance status:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update grievance status',
      error: err.message,
    });
  }
};

/**
 * @desc    Admin verification for a Grievance
 * @route   PATCH /api/grievances/:id/verify
 * @access  Admin
 */
export const verifyGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified = true, verifiedBy, verifiedByName, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Grievance ID format',
      });
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance not found',
      });
    }

    const verifyStatus = isVerified === true || isVerified === 'true';
    grievance.isVerified = verifyStatus;
    grievance.verifiedAt = verifyStatus ? new Date() : null;

    if (verifiedBy && mongoose.Types.ObjectId.isValid(verifiedBy)) {
      grievance.verifiedBy = verifiedBy;
    }
    if (verifiedByName) {
      grievance.verifiedByName = verifiedByName.trim();
    }
    if (remarks !== undefined) {
      grievance.remarks = remarks.trim();
    }

    // Auto-update status if marking verified from Pending
    if (verifyStatus && grievance.status === 'Pending') {
      grievance.status = 'Verified';
    } else if (!verifyStatus && grievance.status === 'Verified') {
      grievance.status = 'Pending';
    }

    const updated = await grievance.save();

    return res.status(200).json({
      success: true,
      message: verifyStatus ? 'Grievance verified successfully by admin' : 'Grievance verification revoked',
      data: updated,
    });
  } catch (err) {
    console.error('❌ Error verifying grievance:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify grievance',
      error: err.message,
    });
  }
};

/**
 * @desc    Delete a Grievance and remove its attachment from Bunny CDN
 * @route   DELETE /api/grievances/:id
 * @access  Admin / Authorized
 */
export const deleteGrievance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Grievance ID format',
      });
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: 'Grievance not found',
      });
    }

    // Clean up attachment from Bunny CDN storage
    const fileKey = grievance.attachmentKey || grievance.attachmentUrl;
    if (fileKey) {
      console.log(`🗑️ Deleting Bunny storage file for grievance [${id}]:`, fileKey);
      await cleanupUploadedFile(fileKey);
    }

    await Grievance.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Grievance and associated storage file deleted successfully',
    });
  } catch (err) {
    console.error('❌ Error deleting grievance:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete grievance',
      error: err.message,
    });
  }
};
