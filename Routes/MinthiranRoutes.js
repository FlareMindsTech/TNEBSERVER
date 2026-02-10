import express from "express";
import {
    createMinthiran,
    getAllMinthirans,
    getMinthiransByYear,
    deleteMinthiran,
    updateMinthiran,
} from "../Controllers/MinthiranController.js";
import { upload } from "../config/Cloudinary.js";
import { protect } from "../Middleware/authMiddleware.js";
import { authorize } from "../Middleware/roleMiddleware.js";

const router = express.Router();


router.get("/", getAllMinthirans);
router.get("/year/:year", getMinthiransByYear);

router.post(
    "/",protect,
    authorize("admin"),
    upload.single("pdf"),
    createMinthiran
);

router.put("/:id",protect, authorize("admin"), upload.single("pdf"), updateMinthiran);

router.delete("/:id",protect, authorize("admin"), deleteMinthiran);

export default router;
