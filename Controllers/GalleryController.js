import Gallery from "../Models/Gallery.js";
import { cloudinary } from "../Config/Cloudinary.js";

export const createGallery = async (req, res) => {
    try {
        const { title, description, caption } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        // Generate base slug from title
        let slug = generateSlug(title);

        // Ensure slug uniqueness
        let slugExists = await Gallery.findOne({ slug });
        let counter = 1;

        while (slugExists) {
            slug = `${generateSlug(title)}-${counter}`;
            slugExists = await Gallery.findOne({ slug });
            counter++;
        }

        const images = [];

        if (req.files?.length) {
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
        const { title, description } = req.body;
        const gallery = await Gallery.findById(req.params.id);

        if (!gallery) {
            return res.status(404).json({ message: "Gallery not found" });
        }

        if (title && title !== gallery.title) {
            gallery.title = title;

            let newSlug = generateSlug(title);
            let slugExists = await Gallery.findOne({
                slug: newSlug,
                _id: { $ne: gallery._id }
            });

            let counter = 1;
            while (slugExists) {
                newSlug = `${generateSlug(title)}-${counter}`;
                slugExists = await Gallery.findOne({
                    slug: newSlug,
                    _id: { $ne: gallery._id }
                });
                counter++;
            }

            gallery.slug = newSlug;
        }

        if (description) gallery.description = description;

        if (req.files?.length) {
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
