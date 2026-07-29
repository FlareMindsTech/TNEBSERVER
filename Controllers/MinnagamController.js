import Minnagam from '../Models/Minnagam.js';
import { cloudinary } from '../config/Cloudinary.js';

export const createMinnagam = async (req, res) => {
  try {
    const { nomineeName, relation, units, utrNumber } = req.body;

    if (!nomineeName || !relation || !units || !utrNumber) {
      return res.status(400).json({ message: "All fields (nomineeName, relation, units, utrNumber) are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Document (Image/PDF) is required" });
    }

    const calculatedAmount = Number(units) * 20000;

    const newMinnagam = new Minnagam({
      nomineeName,
      relation,
      units: Number(units),
      amount: calculatedAmount,
      utrNumber,
      document: {
        url: req.file.path,
        public_id: req.file.filename
      }
    });

    const savedMinnagam = await newMinnagam.save();
    res.status(201).json({ message: "Minnagam entry created successfully", data: savedMinnagam });
  } catch (error) {
    res.status(500).json({ message: "Error creating Minnagam entry", error: error.message });
  }
};

export const getMinnagams = async (req, res) => {
  try {
    const minnagams = await Minnagam.find().sort({ createdAt: -1 });
    res.status(200).json(minnagams);
  } catch (error) {
    res.status(500).json({ message: "Error fetching Minnagam entries", error: error.message });
  }
};

export const getMinnagamById = async (req, res) => {
  try {
    const minnagam = await Minnagam.findById(req.params.id);
    if (!minnagam) {
      return res.status(404).json({ message: "Minnagam entry not found" });
    }
    res.status(200).json(minnagam);
  } catch (error) {
    res.status(500).json({ message: "Error fetching Minnagam entry", error: error.message });
  }
};

export const updateMinnagam = async (req, res) => {
  try {
    const minnagam = await Minnagam.findById(req.params.id);
    if (!minnagam) {
      return res.status(404).json({ message: "Minnagam entry not found" });
    }

    const { nomineeName, relation, units, utrNumber } = req.body;

    if (nomineeName) minnagam.nomineeName = nomineeName;
    if (relation) minnagam.relation = relation;
    if (utrNumber) minnagam.utrNumber = utrNumber;
    
    if (units) {
      minnagam.units = Number(units);
    }

    if (req.file) {
      if (minnagam.document && minnagam.document.public_id) {
        await cloudinary.uploader.destroy(minnagam.document.public_id);
      }
      minnagam.document = {
        url: req.file.path,
        public_id: req.file.filename
      };
    }

    const updatedMinnagam = await minnagam.save();
    res.status(200).json({ message: "Minnagam entry updated successfully", data: updatedMinnagam });
  } catch (error) {
    res.status(500).json({ message: "Error updating Minnagam entry", error: error.message });
  }
};

export const deleteMinnagam = async (req, res) => {
  try {
    const minnagam = await Minnagam.findById(req.params.id);
    if (!minnagam) {
      return res.status(404).json({ message: "Minnagam entry not found" });
    }

    if (minnagam.document && minnagam.document.public_id) {
      await cloudinary.uploader.destroy(minnagam.document.public_id);
    }

    await Minnagam.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Minnagam entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting Minnagam entry", error: error.message });
  }
};
