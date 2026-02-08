import express from "express";
import { trackVisitor } from "../Controllers/VisitorCountroller.js";

const router = express.Router();

router.post("/track", trackVisitor);

// Optional: Get current count without tracking
import { Counter } from "../Models/Visitor.js";
router.get("/count", async (req, res) => {
    try {
        let counter = await Counter.findOne();
        if (!counter) {
            counter = await Counter.create({ totalVisitors: 0 });
        }
        res.status(200).json({ success: true, totalVisitors: counter.totalVisitors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
