import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: { type: String, default: "" },

    // ✅ booking attachment image filename
    attachment: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },

    // ✅ Task workflow
    taskStatus: {
      type: String,
      enum: ["none", "pending", "completed"],
      default: "none",
      index: true,
    },

    // ✅ timestamps for task flow (safe for old records)
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    // ✅ NEW: ratings (only after task completed)
    // client -> professional rating
    clientRating: { type: Number, default: null, min: 1, max: 5, index: true },
    clientRatedAt: { type: Date, default: null },

    // professional -> client rating
    professionalRating: { type: Number, default: null, min: 1, max: 5, index: true },
    professionalRatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// useful indexes
bookingSchema.index({ professionalId: 1, createdAt: -1 });
bookingSchema.index({ clientId: 1, createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
