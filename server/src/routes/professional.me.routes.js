import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import ProfessionalProfile from "../models/ProfessionalProfile.js";
import Booking from "../models/Booking.js";
import Gig from "../models/Gig.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "professional") {
      return res.status(403).json({ message: "Professional only" });
    }

    const userId = req.user._id;

    const user = await User.findById(userId).select("-passwordHash").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const professional =
      (await ProfessionalProfile.findOne({ userId }).lean()) || {
        userId,
        category: "",
        shortIntro: "",
        cnicPic: "",
        feeScreenshot: "",
      };

    const [total, pending, accepted, rejected, gigs] = await Promise.all([
      Booking.countDocuments({ professionalId: userId }),
      Booking.countDocuments({ professionalId: userId, status: "pending" }),
      Booking.countDocuments({ professionalId: userId, status: "accepted" }),
      Booking.countDocuments({ professionalId: userId, status: "rejected" }),
      Gig.find({ professionalId: userId }).sort({ createdAt: -1 }).lean(),
    ]);

    return res.json({
      user,
      professional,                 // ✅ frontend should read professional.shortIntro
      shortIntro: professional.shortIntro || "", // ✅ extra safety
      stats: { total, pending, accepted, rejected },
      gigs,
    });
  } catch (e) {
    console.log("PRO ME ERROR:", e);
    return res.status(500).json({ message: "Failed to load profile" });
  }
});

export default router;
