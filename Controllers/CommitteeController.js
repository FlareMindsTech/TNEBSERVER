import CommitteeMember from '../Models/Cec_Ebf/CommitteeMember.js';
import CommitteeTerm from '../Models/Cec_Ebf/CommitteeTerm.js';
import CommitteeResponsibility from '../Models/Cec_Ebf/CommitteeResponsibility.js';

import { cloudinary, upload } from '../config/Cloudinary.js';

// Multer upload middleware for member photo
export const memberPhotoUpload = upload.single('photo');

// Helper to normalize and validate committee type
const parseCommitteeType = (typeParam) => {
  if (!typeParam) return null;
  const upper = typeParam.toString().toUpperCase().trim();
  if (upper === 'CEC' || upper === 'EBF') {
    return upper;
  }
  return null;
};

// Phone validation helper
const isValidPhone = (phone) => {
  if (!phone) return true; // Optional field check
  const phoneRegex = /^[+0-9\s-]{7,15}$/;
  return phoneRegex.test(phone.toString().trim());
};

// ==========================================
// 1. PUBLIC AGGREGATED API (GET /api/committees/:type)
// ==========================================
export const getPublicCommitteeData = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    // Execute parallel lean queries for high performance
    const [members, responsibilities, termDoc] = await Promise.all([
      CommitteeMember.find({ committeeType, isActive: true })
        .select('_id photo name post designation branch phone displayOrder isQueryContact')
        .sort({ displayOrder: 1, name: 1 })
        .lean(),
      CommitteeResponsibility.find({ committeeType, isActive: true })
        .select('_id title description displayOrder')
        .sort({ displayOrder: 1 })
        .lean(),
      CommitteeTerm.findOne({ committeeType }).lean()
    ]);

    // Calculate total member count dynamically from active members
    const memberCount = members.length;

    const responseData = {
      committee: {
        type: committeeType,
        name: committeeType === 'CEC' ? 'Central Executive Committee' : 'EBF Committee'
      },
      term: {
        currentTerm: termDoc ? termDoc.currentTerm : '',
        electedDate: termDoc ? termDoc.electedDate : '',
        nextElectionDate: termDoc ? termDoc.nextElectionDate : '',
        totalMembers: memberCount
      },
      memberCount,
      members,
      responsibilities
    };

    res.status(200).json(responseData);
  } catch (err) {
    console.error('❌ Error fetching public committee data:', err);
    res.status(500).json({ error: err.message || 'Server Error' });
  }
};

// ==========================================
// 2. ADMIN APIs - MEMBERS
// ==========================================

// Create Member
export const createMember = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const { name, post, designation, branch, phone, displayOrder, isActive, isQueryContact } = req.body;

    if (!name || !name.trim()) {
      if (req.file && req.file.filename) await cloudinary.uploader.destroy(req.file.filename);
      return res.status(400).json({ message: 'Member name is required' });
    }

    if (!post || !post.trim()) {
      if (req.file && req.file.filename) await cloudinary.uploader.destroy(req.file.filename);
      return res.status(400).json({ message: 'Post / Position is required' });
    }

    if (phone && !isValidPhone(phone)) {
      if (req.file && req.file.filename) await cloudinary.uploader.destroy(req.file.filename);
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const photoUrl = req.file ? req.file.path : (req.body.photo || '');
    const cloudinaryId = req.file ? req.file.filename : '';

    const newMember = await CommitteeMember.create({
      committeeType,
      name: name.trim(),
      post: post.trim(),
      designation: designation ? designation.trim() : '',
      branch: branch ? branch.trim() : '',
      phone: phone ? phone.trim() : '',
      photo: photoUrl,
      cloudinaryId,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      isActive: isActive !== undefined ? String(isActive) === 'true' || isActive === true : true,
      isQueryContact: isQueryContact !== undefined ? String(isQueryContact) === 'true' || isQueryContact === true : false
    });

    res.status(201).json(newMember);
  } catch (err) {
    if (req.file && req.file.filename) {
      try { await cloudinary.uploader.destroy(req.file.filename); } catch (e) { }
    }
    res.status(500).json({ error: err.message || err });
  }
};

// Get Admin Members (with pagination and search)
export const getAdminMembers = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 100);
    const skip = (page - 1) * limit;

    const filter = { committeeType };
    if (req.query.isActive !== undefined) {
      filter.isActive = String(req.query.isActive) === 'true';
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { post: searchRegex },
        { designation: searchRegex },
        { branch: searchRegex },
        { phone: searchRegex }
      ];
    }

    const [members, total] = await Promise.all([
      CommitteeMember.find(filter)
        .sort({ displayOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommitteeMember.countDocuments(filter)
    ]);

    res.status(200).json({
      members,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Member
export const updateMember = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      if (req.file && req.file.filename) await cloudinary.uploader.destroy(req.file.filename);
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const { id } = req.params;
    const member = await CommitteeMember.findOne({ _id: id, committeeType });

    if (!member) {
      if (req.file && req.file.filename) await cloudinary.uploader.destroy(req.file.filename);
      return res.status(404).json({ message: 'Committee member not found' });
    }

    const { name, post, designation, branch, phone, displayOrder, isActive, isQueryContact, photo } = req.body;

    if (phone && !isValidPhone(phone)) {
      if (req.file && req.file.filename) await cloudinary.uploader.destroy(req.file.filename);
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (post !== undefined) updateData.post = post.trim();
    if (designation !== undefined) updateData.designation = designation.trim();
    if (branch !== undefined) updateData.branch = branch.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updateData.isActive = String(isActive) === 'true' || isActive === true;
    if (isQueryContact !== undefined) updateData.isQueryContact = String(isQueryContact) === 'true' || isQueryContact === true;

    // File update handling
    if (req.file) {
      if (member.cloudinaryId) {
        try { await cloudinary.uploader.destroy(member.cloudinaryId); } catch (e) { }
      }
      updateData.photo = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    } else if (photo !== undefined) {
      updateData.photo = photo;
    }

    const updatedMember = await CommitteeMember.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    res.status(200).json(updatedMember);
  } catch (err) {
    if (req.file && req.file.filename) {
      try { await cloudinary.uploader.destroy(req.file.filename); } catch (e) { }
    }
    res.status(500).json({ error: err.message || err });
  }
};

// Delete Member
export const deleteMember = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const { id } = req.params;
    const member = await CommitteeMember.findOne({ _id: id, committeeType });

    if (!member) {
      return res.status(404).json({ message: 'Committee member not found' });
    }

    if (member.cloudinaryId) {
      try { await cloudinary.uploader.destroy(member.cloudinaryId); } catch (e) { }
    }

    await CommitteeMember.findByIdAndDelete(id);

    res.status(200).json({ message: 'Member deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 3. ADMIN APIs - TERM
// ==========================================

// Get Term
export const getTerm = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    let termDoc = await CommitteeTerm.findOne({ committeeType }).lean();
    const activeMemberCount = await CommitteeMember.countDocuments({ committeeType, isActive: true });

    res.status(200).json({
      committeeType,
      currentTerm: termDoc ? termDoc.currentTerm : '',
      electedDate: termDoc ? termDoc.electedDate : '',
      nextElectionDate: termDoc ? termDoc.nextElectionDate : '',
      totalMembers: activeMemberCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upsert Term
export const updateTerm = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const { currentTerm, electedDate, nextElectionDate } = req.body;

    const termDoc = await CommitteeTerm.findOneAndUpdate(
      { committeeType },
      {
        committeeType,
        currentTerm: currentTerm !== undefined ? currentTerm.trim() : '',
        electedDate: electedDate !== undefined ? electedDate.trim() : '',
        nextElectionDate: nextElectionDate !== undefined ? nextElectionDate.trim() : ''
      },
      { new: true, upsert: true, runValidators: true }
    );

    const activeMemberCount = await CommitteeMember.countDocuments({ committeeType, isActive: true });

    res.status(200).json({
      committeeType: termDoc.committeeType,
      currentTerm: termDoc.currentTerm,
      electedDate: termDoc.electedDate,
      nextElectionDate: termDoc.nextElectionDate,
      totalMembers: activeMemberCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 4. ADMIN APIs - RESPONSIBILITIES
// ==========================================

// Create Responsibility
export const createResponsibility = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const { title, description, displayOrder, isActive } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Responsibility title is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Responsibility description is required' });
    }

    const responsibility = await CommitteeResponsibility.create({
      committeeType,
      title: title.trim(),
      description: description.trim(),
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      isActive: isActive !== undefined ? String(isActive) === 'true' || isActive === true : true
    });

    res.status(201).json(responsibility);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Admin Responsibilities
export const getAdminResponsibilities = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const responsibilities = await CommitteeResponsibility.find({ committeeType })
      .sort({ displayOrder: 1 })
      .lean();

    res.status(200).json(responsibilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Responsibility
export const updateResponsibility = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const { id } = req.params;
    const { title, description, displayOrder, isActive } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updateData.isActive = String(isActive) === 'true' || isActive === true;

    const updated = await CommitteeResponsibility.findOneAndUpdate(
      { _id: id, committeeType },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Responsibility not found' });
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Responsibility
export const deleteResponsibility = async (req, res) => {
  try {
    const committeeType = parseCommitteeType(req.params.type);
    if (!committeeType) {
      return res.status(400).json({ message: "Invalid committee type. Must be 'CEC' or 'EBF'." });
    }

    const { id } = req.params;
    const deleted = await CommitteeResponsibility.findOneAndDelete({ _id: id, committeeType });

    if (!deleted) {
      return res.status(404).json({ message: 'Responsibility not found' });
    }

    res.status(200).json({ message: 'Responsibility deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
