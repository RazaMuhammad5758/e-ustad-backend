// server/src/routes/notification.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Notification from "../models/Notification.js";

const router = Router();

// ✅ list notifications (latest first)
router.get("/", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 50);

    const items = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      readAt: null,
    });

    return res.json({ notifications: items, unreadCount });
  } catch (e) {
    console.log("NOTIFICATIONS LIST ERROR:", e);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
});

// ✅ mark one as read
router.post("/:id/read", requireAuth, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    return res.json({ ok: true, notification: n });
  } catch (e) {
    console.log("NOTIFICATIONS READ ERROR:", e);
    return res.status(500).json({ message: "Failed to mark read" });
  }
});

// ✅ mark all as read
router.post("/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return res.json({ ok: true });
  } catch (e) {
    console.log("NOTIFICATIONS READ-ALL ERROR:", e);
    return res.status(500).json({ message: "Failed to mark all read" });
  }
});

export default router;
