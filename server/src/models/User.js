import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["client", "professional", "admin"],
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    phone: { type: String, required: true, trim: true },

    phoneCountryCode: { type: String, default: "+92" },
    phoneNational: { type: String, default: "" },

    passwordHash: { type: String, default: "" },

    address: { type: String, default: "" },

    // ✅ keep safe for old users, but API enforces required
    city: { type: String, default: "", index: true },

    profilePic: { type: String, default: "" },

    status: {
      type: String,
      enum: ["active", "pending", "rejected"],
      default: "active",
      index: true,
    },
    approvedAt: { type: Date, default: null },

    // ✅ NEW: overall rating (profile display)
    // updated after completed task + ratings
    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
