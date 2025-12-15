import { Router } from "express";
import Booking from "../models/Booking.js";
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

// CLIENT → CREATE BOOKING (message + optional attachment)
router.post("/", requireAuth, maybeUploadSingle("attachment"), async (req, res) => {
  try {
    const { professionalId, message } = req.body;

    if (!professionalId) {
      return res.status(400).json({ message: "Missing professional" });
    }

    const attachment = req.file?.filename || ""; // ✅ uploaded file name

    const booking = await Booking.create({
      clientId: req.user._id,
      professionalId,
      message: message || "",
      attachment, // ✅ will save only if Booking model has this field
    });

    return res.json({ booking });
  } catch (e) {
    console.log("BOOKING CREATE ERROR:", e);
    return res.status(500).json({ message: "Failed to create booking" });
  }
});

// CLIENT → VIEW MY SENT REQUESTS (✅ professional phone privacy applied)
router.get("/client", requireAuth, async (req, res) => {
  const items = await Booking.find({ clientId: req.user._id })
    .populate("professionalId", "name phone")
    .sort({ createdAt: -1 })
    .lean();

  const sanitized = items.map((b) => {
    const pro = b.professionalId || null;

    let professionalPhone = null;
    if (b.status === "accepted" && pro?.phone) {
      professionalPhone = pro.phone;
    }

    const professionalSafe = pro ? { _id: pro._id, name: pro.name } : null;

    return {
      ...b,
      professionalId: professionalSafe,
      professionalPhone,
    };
  });

  res.json({ bookings: sanitized });
});

// PROFESSIONAL → VIEW REQUESTS (✅ client phone privacy applied)
router.get("/professional", requireAuth, async (req, res) => {
  const items = await Booking.find({ professionalId: req.user._id })
    .populate("clientId", "name phone profilePic")
    .sort({ createdAt: -1 })
    .lean();

  const sanitized = items.map((b) => {
    const client = b.clientId || null;

    let clientPhone = null;
    if (b.status === "accepted" && client?.phone) {
      clientPhone = client.phone;
    }

    const clientSafe = client
      ? { _id: client._id, name: client.name, profilePic: client.profilePic || "" }
      : null;

    return {
      ...b,
      clientId: clientSafe,
      clientPhone,
    };
  });

  res.json({ bookings: sanitized });
});

// UPDATE STATUS
router.post("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!["accepted", "rejected"].includes(status))
    return res.status(400).json({ message: "Invalid status" });

  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Not found" });

  if (booking.professionalId.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Forbidden" });

  booking.status = status;
  await booking.save();

  res.json({ ok: true });
});

export default router;
