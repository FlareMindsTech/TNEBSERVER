import Gallery from "../Models/Gallery.js";
import { cloudinary } from "../Config/Cloudinary.js";

/* ================= CREATE ================= */

export const createGallery = async (req, res) => {
    try {
        const { title, description, caption } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        const images = req.files?.map((file) => ({
            url: file.path,
            public_id: file.filename,
            caption: caption || title,
            format: file.mimetype?.split("/")[1] || "unknown",
        })) || [];

        const gallery = await Gallery.create({
            title,
            description,
            images
        });

        res.status(201).json(gallery);

    } catch (error) {
        console.error("Create Gallery Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/* ================= GET ALL ================= */

export const getAllGalleries = async (req, res) => {
    try {
        const galleries = await Gallery.find().sort({ createdAt: -1 });

        res.status(200).json(galleries);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ================= GET BY ID ================= */

export const getGalleryById = async (req, res) => {
    try {
        const gallery = await Gallery.findById(req.params.id);

        if (!gallery) {
            return res.status(404).json({ message: "Gallery not found" });
        }

        res.status(200).json(gallery);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ================= UPDATE ================= */

export const updateGallery = async (req, res) => {
    try {
        const { title, description } = req.body;

        const gallery = await Gallery.findById(req.params.id);

        if (!gallery) {
            return res.status(404).json({ message: "Gallery not found" });
        }

        if (title) gallery.title = title;
        if (description) gallery.description = description;

        /* Add New Images */
        if (req.files?.length) {

            const newImages = req.files.map((file) => ({
                url: file.path,
                public_id: file.filename,
                caption: title || gallery.title,
                format: file.mimetype?.split("/")[1] || "unknown"
            }));

            gallery.images.push(...newImages);
        }

        const updatedGallery = await gallery.save();

        res.status(200).json(updatedGallery);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ================= DELETE SINGLE IMAGE ================= */

export const deleteGalleryImage = async (req, res) => {
    try {

        const { galleryId, imageId } = req.params;

        const gallery = await Gallery.findById(galleryId);

        if (!gallery)
            return res.status(404).json({ message: "Gallery not found" });

        const image = gallery.images.id(imageId);

        if (!image)
            return res.status(404).json({ message: "Image not found" });

        await cloudinary.uploader.destroy(image.public_id);

        gallery.images.pull(imageId);
        await gallery.save();

        res.json({ message: "Image deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ================= DELETE FULL GALLERY ================= */

export const deleteGallery = async (req, res) => {
    try {

        const gallery = await Gallery.findById(req.params.id);

        if (!gallery)
            return res.status(404).json({ message: "Gallery not found" });

        await Promise.all(
            gallery.images.map((img) =>
                cloudinary.uploader.destroy(img.public_id)
            )
        );

        await gallery.deleteOne();

        res.json({
            message: "Gallery and all images deleted successfully"
        });

    } catch (error) {
        console.error("Delete Gallery Error:", error);
        res.status(500).json({ message: error.message });
    }
};
