import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["client", "professional", "admin"], required: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },

    phone: { type: String, required: true, trim: true },

    phoneCountryCode: { type: String, default: "+92" },
    phoneNational: { type: String, default: "" },

    passwordHash: { type: String, default: "" },

    address: { type: String, default: "" },

    // ✅ keep safe for old users, but API enforces required
    city: { type: String, default: "" },

    profilePic: { type: String, default: "" },

    status: { type: String, enum: ["active", "pending", "rejected"], default: "active" },
    approvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
