import { Visitor, Counter } from "../Models/Visitor.js";

export const trackVisitor = async (req, res) => {
    try {
        const { visitorId } = req.body;

        if (!visitorId) {
            return res.status(400).json({
                success: false,
                message: "visitorId is required"
            });
        }

        // Cooldown time → 1 hour
        const cooldown = 60 * 60 * 1000;

        let visitor = await Visitor.findOne({ visitorId });

        // Ensure counter exists
        let counter = await Counter.findOne();
        if (!counter) {
            counter = await Counter.create({ totalVisitors: 0 });
        }

        // ⭐ New visitor
        if (!visitor) {
            await Visitor.create({
                visitorId,
                lastVisit: new Date()
            });

            counter.totalVisitors += 1;
            await counter.save();
        }

        // ⭐ Existing visitor
        else {
            const now = new Date();
            const diff = now - visitor.lastVisit;

            if (diff > cooldown) {
                visitor.lastVisit = now;
                await visitor.save();

                counter.totalVisitors += 1;
                await counter.save();
            }
        }

        return res.status(200).json({
            success: true,
            totalVisitors: counter.totalVisitors
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
