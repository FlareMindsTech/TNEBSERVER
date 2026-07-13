import LMNumber from '../Models/LMNumber.js';

// Create a new LM Number
export const createLMNumber = async (req, res) => {
  try {
    const { number, role } = req.body;

    if (!number || !role) {
      return res.status(400).json({ message: 'Number and role are required' });
    }

    const existingLM = await LMNumber.findOne({ number });
    if (existingLM) {
      return res.status(400).json({ message: 'LM Number already exists' });
    }

    const newLM = await LMNumber.create({ number, role });
    res.status(201).json(newLM);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all LM Numbers
export const getAllLMNumbers = async (req, res) => {
  try {
    const lmNumbers = await LMNumber.find().sort({ createdAt: -1 });
    res.status(200).json(lmNumbers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get LM Number by ID
export const getLMNumberById = async (req, res) => {
  try {
    const lmNumber = await LMNumber.findById(req.params.id);
    if (!lmNumber) {
      return res.status(404).json({ message: 'LM Number not found' });
    }
    res.status(200).json(lmNumber);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update LM Number
export const updateLMNumber = async (req, res) => {
  try {
    const { number, role, isUsed, usedBy } = req.body;
    const lmNumber = await LMNumber.findById(req.params.id);

    if (!lmNumber) {
      return res.status(404).json({ message: 'LM Number not found' });
    }

    if (number !== undefined) lmNumber.number = number;
    if (role !== undefined) lmNumber.role = role;
    if (isUsed !== undefined) lmNumber.isUsed = isUsed;
    if (usedBy !== undefined) lmNumber.usedBy = usedBy || null;

    const updatedLM = await lmNumber.save();
    res.status(200).json(updatedLM);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete LM Number
export const deleteLMNumber = async (req, res) => {
  try {
    const lmNumber = await LMNumber.findByIdAndDelete(req.params.id);
    if (!lmNumber) {
      return res.status(404).json({ message: 'LM Number not found' });
    }
    res.status(200).json({ message: 'LM Number deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bulk create/upload LM Numbers
export const bulkCreateLMNumbers = async (req, res) => {
  try {
    const { lmNumbers } = req.body; // Array of { number, role }
    if (!lmNumbers || !Array.isArray(lmNumbers)) {
      return res.status(400).json({ message: 'lmNumbers array is required' });
    }

    const inserted = await LMNumber.insertMany(lmNumbers, { ordered: false });
    res.status(201).json({ message: 'LM Numbers created successfully', count: inserted.length });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Some LM Numbers were duplicate and skipped', error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};
