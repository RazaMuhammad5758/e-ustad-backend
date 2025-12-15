import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import GigComment from "../models/GigComment.js";
import mongoose from "mongoose";

const router = Router();

// ✅ add comment
router.post("/", requireAuth, async (req, res) => {
  try {
    const { gigId, text } = req.body;

    if (!gigId || !text?.trim()) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const c = await GigComment.create({
      gigId,
      userId: req.user._id,
      text: text.trim(),
    });

    const total = await GigComment.countDocuments({ gigId });

    return res.json({ comment: c, total });
  } catch (e) {
    console.log("ADD COMMENT ERROR:", e);
    return res.status(500).json({ message: "Comment failed" });
  }
});

// ✅ get comments by gig + total
router.get("/:gigId", async (req, res) => {
  try {
    const gigId = req.params.gigId;

    const [items, total] = await Promise.all([
      GigComment.find({ gigId })
        .populate("userId", "name profilePic")
        .sort({ createdAt: -1 }),
      GigComment.countDocuments({ gigId }),
    ]);

    return res.json({ comments: items, total });
  } catch (e) {
    console.log("GET COMMENTS ERROR:", e);
    return res.status(500).json({ message: "Failed to load comments" });
  }
});

// ✅ bulk counts (Dashboard etc)
// GET /api/gig-comments?gigIds=1,2,3
router.get("/", async (req, res) => {
  try {
    const raw = String(req.query.gigIds || "").trim();
    if (!raw) return res.json({ counts: {} });

    const gigIds = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));

    const agg = await GigComment.aggregate([
      { $match: { gigId: { $in: gigIds } } },
      { $group: { _id: "$gigId", total: { $sum: 1 } } },
    ]);

    const counts = {};
    for (const a of agg) counts[String(a._id)] = a.total;

    return res.json({ counts });
  } catch (e) {
    console.log("BULK COUNT ERROR:", e);
    return res.status(500).json({ message: "Failed to load counts" });
  }
});

export default router;
