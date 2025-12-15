import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    professionalId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    message: { type: String, default: "" },

    // ✅ NEW: booking attachment image filename
    attachment: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
