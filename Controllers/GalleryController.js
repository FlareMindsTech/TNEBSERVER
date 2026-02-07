import Gallery from "../Models/Gallery.js";
import { cloudinary } from "../Config/Cloudinary.js";

export const createGallery = async (req, res) => {
    try {
        const { title, description, slug, caption } = req.body;

        if (!title || !description || !slug) {
            return res.status(400).json({ message: "Title, description, and slug are required" });
        }

        const existingGallery = await Gallery.findOne({ slug });
        if (existingGallery) {
            return res.status(400).json({ message: "A gallery with this slug already exists" });
        }

        const images = [];

        if (req.files) {
            req.files.forEach((file) => {
                images.push({
                    url: file.path,
                    public_id: file.filename,
                    caption: caption || title, 
                    format: file.mimetype.split("/")[1],
                });
            });
        }


        const gallery = new Gallery({
            title,
            description,
            slug,
            images,
        });

        const savedGallery = await gallery.save();
        res.status(201).json(savedGallery);
    } catch (error) {
        console.error("Create Gallery Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllGalleries = async (req, res) => {
    try {
        const galleries = await Gallery.find().sort({ date: -1 });
        res.status(200).json(galleries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getGalleryBySlug = async (req, res) => {
    try {
        const gallery = await Gallery.findOne({ slug: req.params.slug });
        if (!gallery) {
            return res.status(404).json({ message: "Gallery not found" });
        }
        res.status(200).json(gallery);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateGallery = async (req, res) => {
    try {
        const { title, description, slug } = req.body;
        const gallery = await Gallery.findById(req.params.id);

        if (!gallery) {
            return res.status(404).json({ message: "Gallery not found" });
        }

        if (title) gallery.title = title;
        if (description) gallery.description = description;
        if (slug) gallery.slug = slug;

        if (req.files) {
            req.files.forEach((file) => {
                gallery.images.push({
                    url: file.path,
                    public_id: file.filename,
                    caption: title || gallery.title,
                    format: file.mimetype.split("/")[1],
                });
            });
        }


        const updatedGallery = await gallery.save();
        res.status(200).json(updatedGallery);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteGallery = async (req, res) => {
    try {
        const gallery = await Gallery.findById(req.params.id);

        if (!gallery) {
            return res.status(404).json({ message: "Gallery not found" });
        }

        const deleteImages = gallery.images.map((img) =>
            cloudinary.uploader.destroy(img.public_id)
        );

        await Promise.all(deleteImages);


        await Gallery.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Gallery and associated files deleted" });
    } catch (error) {
        console.error("Delete Gallery Error:", error);
        res.status(500).json({ message: error.message });
    }
};
