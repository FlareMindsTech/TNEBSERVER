import express from "express";
import {
    createGallery,
    getAllGalleries,
    getGalleryBySlug,
    updateGallery,
    deleteGallery,
} from "../Controllers/GalleryController.js";
import { upload } from "../Config/Cloudinary.js";
import { protect } from "../Middleware/authMiddleware.js";
import { authorize } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getAllGalleries);
router.get("/:slug", getGalleryBySlug);

router.post(
    "/",
    protect,
    authorize("user"),
    upload.array("images", 10),
    createGallery
);

router.put(
    "/:id",
    protect,
    authorize("user"),
    upload.array("images", 10),
    updateGallery
);

router.delete("/:id", protect, authorize("user"), deleteGallery);

export default router;
