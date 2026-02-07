import express from "express";
import {
    createMinthiran,
    getAllMinthirans,
    getMinthiransByYear,
    deleteMinthiran,
} from "../Controllers/MinthiranController.js";
import { upload } from "../Config/Cloudinary.js";
import { protect } from "../Middleware/authMiddleware.js";
import { authorize } from "../Middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getAllMinthirans);
router.get("/year/:year", getMinthiransByYear);

router.post(
    "/",
    protect,
    authorize("user"),
    upload.single("pdf"),
    createMinthiran
);

router.delete("/:id", protect, authorize("user"), deleteMinthiran);

export default router;
