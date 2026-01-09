// server/src/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // e.g. "booking.accepted"
    type: { type: String, default: "general" },

    title: { type: String, default: "" },
    message: { type: String, default: "" },

    // front-end open link like "/my-bookings"
    link: { type: String, default: "" },

    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

export default mongoose.model("Notification", notificationSchema);
