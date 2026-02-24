import Minthiran from "../Models/Minthiran.js";
import { cloudinary } from "../config/Cloudinary.js";
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';

const getPdfPageCount = async (pdfUrl) => {
    try {
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const pdfDoc = await PDFDocument.load(response.data);
        return pdfDoc.getPageCount();
    } catch (error) {
        console.error('Error counting PDF pages:', error);
        return 1;
    }
};

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

const ensureMinthiranPages = async (minthiranDoc) => {
    if (!minthiranDoc?.pdf?.url || !minthiranDoc?.pdf?.public_id) {
        return minthiranDoc;
    }

    const hasPages = Array.isArray(minthiranDoc.pdf.pages) && minthiranDoc.pdf.pages.length > 0;
    if (hasPages) {
        return minthiranDoc;
    }

    const pageCount = await getPdfPageCount(minthiranDoc.pdf.url);
    minthiranDoc.pdf.pages = buildCloudinaryPageUrls(minthiranDoc.pdf.public_id, pageCount);
    await minthiranDoc.save();
    return minthiranDoc;
};


export const createMinthiran = async (req, res) => {
    try {
        const { year, month } = req.body;

        if (!year || !month) {
            return res.status(400).json({ message: "Year and month are required" });
        }

        const pdfUrl = req.file.path;
        const publicId = req.file.filename;

        // Get page count for flip animation
        let pageCount = req.body.pageCount ? parseInt(req.body.pageCount) : 0;
        if (!pageCount) {
            pageCount = await getPdfPageCount(pdfUrl);
        }

        const pagesArray = buildCloudinaryPageUrls(publicId, pageCount);

        const newMinthiran = new Minthiran({
            year,
            month,
            pdf: {
                url: pdfUrl,
                public_id: publicId,
                pages: pagesArray
            },
            totalWeight: (req.file.size / 1024 / 1024).toFixed(2) + ' MB'
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

        await Promise.all(minthirans.map((item) => ensureMinthiranPages(item)));

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
        await Promise.all(minthirans.map((item) => ensureMinthiranPages(item)));
        res.status(200).json(minthirans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMinthiranById = async (req, res) => {
    try {
        const minthiran = await Minthiran.findById(req.params.id);

        if (!minthiran) {
            return res.status(404).json({ message: 'Minthiran entry not found' });
        }

        await ensureMinthiranPages(minthiran);

        res.status(200).json(minthiran);
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
                await cloudinary.uploader.destroy(minthiran.pdf.public_id, { resource_type: 'raw' }).catch(() => { });
            }

            const pdfUrl = req.file.path;
            const publicId = req.file.filename;

            // Get page count for flip animation
            let pageCount = req.body.pageCount ? parseInt(req.body.pageCount) : 0;
            if (!pageCount) {
                pageCount = await getPdfPageCount(pdfUrl);
            }

            const pagesArray = buildCloudinaryPageUrls(publicId, pageCount);

            // Set new file data
            minthiran.pdf = {
                url: pdfUrl,
                public_id: publicId,
                pages: pagesArray
            };
            minthiran.totalWeight = (req.file.size / 1024 / 1024).toFixed(2) + ' MB';
        }

        await ensureMinthiranPages(minthiran);

        const updatedMinthiran = await minthiran.save();
        res.status(200).json(updatedMinthiran);
    } catch (error) {
        console.error("Update Minthiran Error:", error);
        res.status(500).json({ message: error.message });
    }
};
