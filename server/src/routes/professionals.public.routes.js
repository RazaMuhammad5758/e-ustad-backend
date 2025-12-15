import { Router } from "express";
import User from "../models/User.js";
import ProfessionalProfile from "../models/ProfessionalProfile.js";

const router = Router();

/**
 * Public list: ONLY ACTIVE professionals
 * Supports q, city, category
 */
router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const city = String(req.query.city || "").trim();
    const category = String(req.query.category || "").trim();

    const userFilter = {
      role: "professional",
      status: "active", // ✅ ONLY ACTIVE
    };

    if (q) userFilter.name = { $regex: q, $options: "i" };
    if (city) userFilter.city = city;

    // ✅ If category filter exists, we will filter profiles, then map back to users
    if (category) {
      const profiles = await ProfessionalProfile.find({ category })
        .select("userId")
        .lean();

      const ids = profiles.map((p) => p.userId);
      userFilter._id = { $in: ids };
    }

    const pros = await User.find(userFilter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean();

    const ids = pros.map((p) => p._id);

    const profiles = await ProfessionalProfile.find({ userId: { $in: ids } }).lean();
    const map = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return res.json({
      professionals: pros.map((p) => ({
        ...p,
        professional: map.get(p._id.toString()) || null,
      })),
    });
  } catch (e) {
    console.log("PUBLIC PROFESSIONALS ERROR:", e);
    return res.status(500).json({ message: "Failed to load professionals" });
  }
});

export default router;
