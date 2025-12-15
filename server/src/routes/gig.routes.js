import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import Gig from "../models/Gig.js";
import GigComment from "../models/GigComment.js"; // ✅ cascade delete comments

const router = Router();

function requireProfessional(req, res, next) {
  if (req.user.role !== "professional") {
    return res.status(403).json({ message: "Professional only" });
  }
  next();
}

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

/* ------------------ CREATE ------------------ */
// Create gig (professional)
router.post("/", requireAuth, requireProfessional, upload.single("image"), async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: "Title required" });

    const p = toNumber(price);
    if (!Number.isFinite(p) || p < 0) return res.status(400).json({ message: "Valid price required" });

    const gig = await Gig.create({
      professionalId: req.user._id,
      title: title.trim(),
      description: description ? String(description) : "",
      price: p,
      image: req.file?.filename || "",
    });

    return res.json({ gig });
  } catch (e) {
    console.log("CREATE GIG ERROR:", e);
    return res.status(500).json({ message: "Failed to create gig" });
  }
});

/* ------------------ READ ------------------ */
// Professional: my gigs
router.get("/me", requireAuth, requireProfessional, async (req, res) => {
  try {
    const gigs = await Gig.find({ professionalId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ gigs });
  } catch (e) {
    console.log("MY GIGS ERROR:", e);
    return res.status(500).json({ message: "Failed to load gigs" });
  }
});

// Public: gigs by professionalId
router.get("/by/:professionalId", async (req, res) => {
  try {
    const gigs = await Gig.find({ professionalId: req.params.professionalId }).sort({ createdAt: -1 });
    return res.json({ gigs });
  } catch (e) {
    console.log("GIGS BY PRO ERROR:", e);
    return res.status(500).json({ message: "Failed to load gigs" });
  }
});

/* ------------------ UPDATE ------------------ */
/**
 * ✅ Update gig (only owner professional)
 * Accepts:
 * - title, description, price
 * - image (optional file)
 * - removeImage = "1" to clear image (optional)
 */
router.put("/:gigId", requireAuth, requireProfessional, upload.single("image"), async (req, res) => {
  try {
    const { gigId } = req.params;

    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ message: "Gig not found" });

    // ✅ only owner can edit
    if (String(gig.professionalId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { title, description, price, removeImage } = req.body || {};

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: "Title required" });
      gig.title = String(title).trim();
    }

    if (description !== undefined) {
      gig.description = String(description);
    }

    if (price !== undefined) {
      const p = toNumber(price);
      if (!Number.isFinite(p) || p < 0) return res.status(400).json({ message: "Valid price required" });
      gig.price = p;
    }

    // image update
    if (req.file?.filename) {
      gig.image = req.file.filename;
    } else if (removeImage === "1" || removeImage === "true") {
      gig.image = "";
    }

    await gig.save();

    return res.json({ gig });
  } catch (e) {
    console.log("UPDATE GIG ERROR:", e);
    return res.status(500).json({ message: "Failed to update gig" });
  }
});

/* ------------------ DELETE ------------------ */
/**
 * ✅ Delete gig (only owner professional)
 * Also deletes comments of that gig.
 */
router.delete("/:gigId", requireAuth, requireProfessional, async (req, res) => {
  try {
    const { gigId } = req.params;

    const gig = await Gig.findById(gigId);
    if (!gig) return res.status(404).json({ message: "Gig not found" });

    // ✅ only owner can delete
    if (String(gig.professionalId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Promise.all([
      GigComment.deleteMany({ gigId }), // ✅ cascade comments
      Gig.deleteOne({ _id: gigId }),
    ]);

    return res.json({ ok: true });
  } catch (e) {
    console.log("DELETE GIG ERROR:", e);
    return res.status(500).json({ message: "Failed to delete gig" });
  }
});

export default router;
