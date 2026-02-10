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
import { protect } from "../Middleware/authMiddleware.js";
import { authorize } from "../Middleware/roleMiddleware.js";

const router = express.Router();



/* GET ALL */
router.get("/", getAllGalleries);

/* GET BY ID */
router.get("/:id", getGalleryById);

/* CREATE */
router.post("/",protect ,authorize("admin"), upload.array("images", 10), createGallery);

/* UPDATE */
router.put("/:id",protect, authorize("admin"), upload.array("images", 10), updateGallery);

/* DELETE SINGLE IMAGE */
router.delete("/:galleryId/image/:imageId",protect, authorize("admin"), deleteGalleryImage);

/* DELETE GALLERY */
router.delete("/:id",protect, authorize("admin"), deleteGallery);

export default router;
