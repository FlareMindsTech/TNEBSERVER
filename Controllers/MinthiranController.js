import Minthiran from "../Models/Minthiran.js";
import { cloudinary } from "../config/Cloudinary.js";

export const createMinthiran = async (req, res) => {
    try {
        const { year, month } = req.body;

        if (!year || !month) {
            return res.status(400).json({ message: "Year and month are required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Please upload a PDF file" });
        }

        const existingEntry = await Minthiran.findOne({ year, month });
        if (existingEntry) {
            return res.status(400).json({ message: `An entry for ${month} ${year} already exists` });
        }

        const newMinthiran = new Minthiran({
            year,
            month,
            pdf: {
                url: req.file.path,
                public_id: req.file.filename,
            },
        });

        const savedMinthiran = await newMinthiran.save();
        res.status(201).json(savedMinthiran);
    } catch (error) {
        console.error("Create Minthiran Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllMinthirans = async (req, res) => {
    try {
        const minthirans = await Minthiran.find().sort({ year: -1, month: -1 });

        const grouped = minthirans.reduce((acc, curr) => {
            const year = curr.year;
            if (!acc[year]) acc[year] = [];
            acc[year].push(curr);
            return acc;
        }, {});

        res.status(200).json(grouped);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMinthiransByYear = async (req, res) => {
    try {
        const { year } = req.params;
        const minthirans = await Minthiran.find({ year }).sort({ createdAt: -1 });
        res.status(200).json(minthirans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteMinthiran = async (req, res) => {
    try {
        const minthiran = await Minthiran.findById(req.params.id);

        if (!minthiran) {
            return res.status(404).json({ message: "Minthiran entry not found" });
        }

        await cloudinary.uploader.destroy(minthiran.pdf.public_id, { resource_type: 'raw' });

        await Minthiran.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Minthiran entry and PDF deleted successfully" });
    } catch (error) {
        console.error("Delete Minthiran Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateMinthiran = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, month } = req.body;

        let minthiran = await Minthiran.findById(id);

        if (!minthiran) {
            return res.status(404).json({ message: "Minthiran entry not found" });
        }

        // Check if year/month combination already exists for ANOTHER entry
        if (year && month) {
            const existingEntry = await Minthiran.findOne({ year, month, _id: { $ne: id } });
            if (existingEntry) {
                return res.status(400).json({ message: `An entry for ${month} ${year} already exists` });
            }
        }

        // Update fields
        if (year) minthiran.year = year;
        if (month) minthiran.month = month;

        // If a new file is uploaded
        if (req.file) {
            // Delete old file from Cloudinary
            if (minthiran.pdf && minthiran.pdf.public_id) {
                await cloudinary.uploader.destroy(minthiran.pdf.public_id, { resource_type: 'raw' });
            }

            // Set new file data
            minthiran.pdf = {
                url: req.file.path,
                public_id: req.file.filename,
            };
        }

        const updatedMinthiran = await minthiran.save();
        res.status(200).json(updatedMinthiran);
    } catch (error) {
        console.error("Update Minthiran Error:", error);
        res.status(500).json({ message: error.message });
    }
};
