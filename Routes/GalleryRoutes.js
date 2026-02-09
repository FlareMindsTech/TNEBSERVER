import express from "express";
import {
    createGallery,
    getAllGalleries,
    getGalleryById,
    updateGallery,
    deleteGallery,
    deleteGalleryImage
} from "../Controllers/GalleryController.js";

import { upload } from "../Config/Cloudinary.js";

const router = express.Router();

/* GET ALL */
router.get("/", getAllGalleries);

/* GET BY ID */
router.get("/:id", getGalleryById);

/* CREATE */
router.post("/", upload.array("images", 10), createGallery);

/* UPDATE */
router.put("/:id", upload.array("images", 10), updateGallery);

/* DELETE SINGLE IMAGE */
router.delete("/:galleryId/image/:imageId", deleteGalleryImage);

/* DELETE GALLERY */
router.delete("/:id", deleteGallery);

export default router;
