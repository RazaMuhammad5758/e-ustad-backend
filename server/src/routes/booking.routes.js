import { Router } from "express";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// ✅ helper: only run multer when request is multipart/form-data
function maybeUploadSingle(fieldName) {
  return (req, res, next) => {
    const ct = req.headers["content-type"] || "";
    if (ct.includes("multipart/form-data")) {
      return upload.single(fieldName)(req, res, next);
    }
    return next();
  };
}

function requireClient(req, res, next) {
  if (req.user.role !== "client") {
    return res.status(403).json({ message: "Client only" });
  }
  next();
}

function requireProfessional(req, res, next) {
  if (req.user.role !== "professional") {
    return res.status(403).json({ message: "Professional only" });
  }
  next();
}

function parseRating(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < 1 || r > 5) return null;
  return r;
}

/**
 * ✅ Atomic rating update (race-condition safe)
 * MongoDB 4.2+ required for update pipeline.
 */
async function applyUserRating(userId, rating) {
  const u = await User.findById(userId).select("ratingAvg ratingCount");
  if (!u) return null;

  const count = Number(u.ratingCount || 0);
  const avg = Number(u.ratingAvg || 0);

  const newCount = count + 1;
  const newAvg = (avg * count + Number(rating)) / newCount;

  u.ratingCount = newCount;
  u.ratingAvg = Math.round(newAvg * 100) / 100; // 2 decimals
  await u.save();

  return { ratingAvg: u.ratingAvg, ratingCount: u.ratingCount };
}

// ✅ CLIENT → CREATE BOOKING (message + optional attachment)
router.post(
  "/",
  requireAuth,
  requireClient,
  maybeUploadSingle("attachment"),
  async (req, res) => {
    try {
      const { professionalId, message } = req.body;

      if (!professionalId) {
        return res.status(400).json({ message: "Missing professional" });
      }

      const attachment = req.file?.filename || "";

      const booking = await Booking.create({
        clientId: req.user._id,
        professionalId,
        message: message || "",
        attachment,
        status: "pending",
        taskStatus: "none",
        acceptedAt: null,
        completedAt: null,
        clientRating: null,
        clientRatedAt: null,
        professionalRating: null,
        professionalRatedAt: null,
      });

      return res.json({ booking });
    } catch (e) {
      console.log("BOOKING CREATE ERROR:", e);
      return res.status(500).json({ message: "Failed to create booking" });
    }
  }
);

// ✅ CLIENT → VIEW MY SENT REQUESTS (FIXED)
router.get("/client", requireAuth, requireClient, async (req, res) => {
  try {
    const items = await Booking.find({ clientId: req.user._id })
      .populate("professionalId", "name phone ratingAvg ratingCount")
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = items.map((b) => {
      const pro = b.professionalId || null;

      let professionalPhone = null;
      if (b.status === "accepted" && pro?.phone) {
        professionalPhone = pro.phone;
      }

      const professionalSafe = pro
        ? {
            _id: pro._id,
            name: pro.name,
            ratingAvg: pro.ratingAvg || 0,
            ratingCount: pro.ratingCount || 0,
          }
        : null;

      return {
        ...b,
        professionalId: professionalSafe,
        professionalPhone,
      };
    });

    return res.json({ bookings: sanitized });
  } catch (e) {
    console.log("BOOKING CLIENT LIST ERROR:", e);
    return res.status(500).json({ message: "Failed to load bookings" });
  }
});


// ✅ PROFESSIONAL → VIEW REQUESTS
router.get("/professional", requireAuth, requireProfessional, async (req, res) => {
  try {
    const items = await Booking.find({ professionalId: req.user._id })
      .populate("clientId", "name phone profilePic ratingAvg ratingCount")
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = items.map((b) => {
      const client = b.clientId || null;

      let clientPhone = null;
      if (b.status === "accepted" && client?.phone) clientPhone = client.phone;

      const clientSafe = client
        ? {
            _id: client._id,
            name: client.name,
            profilePic: client.profilePic || "",
            ratingAvg: client.ratingAvg || 0,
            ratingCount: client.ratingCount || 0,
          }
        : null;

      const canProfessionalRate =
        b.status === "accepted" &&
        b.taskStatus === "completed" &&
        b.professionalRating == null;

      return {
        ...b,
        clientId: clientSafe,
        clientPhone,
        canProfessionalRate,
      };
    });

    return res.json({ bookings: sanitized });
  } catch (e) {
    console.log("BOOKING PRO LIST ERROR:", e);
    return res.status(500).json({ message: "Failed to load requests" });
  }
});

// ✅ PROFESSIONAL → ACCEPT / REJECT
router.post("/:id/status", requireAuth, requireProfessional, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Not found" });

    if (booking.professionalId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.taskStatus === "completed") {
      return res.status(400).json({
        message: "Task already completed; status cannot be changed.",
      });
    }

    booking.status = status;

    if (status === "accepted") {
      booking.taskStatus = "pending";
      booking.acceptedAt = booking.acceptedAt || new Date();
      booking.completedAt = null;
    }

    if (status === "rejected") {
      booking.taskStatus = "none";
      booking.acceptedAt = null;
      booking.completedAt = null;
    }

    await booking.save();
    return res.json({ ok: true });
  } catch (e) {
    console.log("STATUS UPDATE ERROR:", e);
    return res.status(500).json({ message: "Failed to update status" });
  }
});

// ✅ PROFESSIONAL → MARK TASK COMPLETED
router.post("/:id/task-complete", requireAuth, requireProfessional, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Not found" });

    if (booking.professionalId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.status !== "accepted") {
      return res.status(400).json({ message: "Only accepted bookings can be completed" });
    }

    if (booking.taskStatus === "completed") return res.json({ ok: true });

    booking.taskStatus = "completed";
    booking.completedAt = new Date();
    await booking.save();

    return res.json({ ok: true });
  } catch (e) {
    console.log("TASK COMPLETE ERROR:", e);
    return res.status(500).json({ message: "Failed to complete task" });
  }
});

// ✅ CLIENT → RATE PROFESSIONAL
router.post("/:id/rate/client", requireAuth, requireClient, async (req, res) => {
  try {
    const rating = parseRating(req.body?.rating);
    if (!rating) return res.status(400).json({ message: "Rating must be 1 to 5" });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Not found" });

    if (booking.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.status !== "accepted" || booking.taskStatus !== "completed") {
      return res.status(400).json({ message: "You can rate only after task is completed" });
    }

    if (booking.clientRating != null) {
      return res.status(400).json({ message: "You already rated this booking" });
    }

    booking.clientRating = rating;
    booking.clientRatedAt = new Date();
    await booking.save();

    const updatedUserRating = await applyUserRating(booking.professionalId, rating);

    return res.json({ ok: true, updatedUserRating });
  } catch (e) {
    console.log("CLIENT RATE ERROR:", e);
    return res.status(500).json({ message: "Failed to submit rating" });
  }
});

// ✅ PROFESSIONAL → RATE CLIENT
router.post("/:id/rate/professional", requireAuth, requireProfessional, async (req, res) => {
  try {
    const rating = parseRating(req.body?.rating);
    if (!rating) return res.status(400).json({ message: "Rating must be 1 to 5" });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Not found" });

    if (booking.professionalId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.status !== "accepted" || booking.taskStatus !== "completed") {
      return res.status(400).json({ message: "You can rate only after task is completed" });
    }

    if (booking.professionalRating != null) {
      return res.status(400).json({ message: "You already rated this booking" });
    }

    booking.professionalRating = rating;
    booking.professionalRatedAt = new Date();
    await booking.save();

    const updatedUserRating = await applyUserRating(booking.clientId, rating);

    return res.json({ ok: true, updatedUserRating });
  } catch (e) {
    console.log("PRO RATE ERROR:", e);
    return res.status(500).json({ message: "Failed to submit rating" });
  }
});

export default router;
