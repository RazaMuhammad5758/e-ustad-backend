import mongoose from "mongoose";

const gigSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // ✅ faster deletes & lookups
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

// optional compound index (admin stats / pro profile)
gigSchema.index({ professionalId: 1, createdAt: -1 });

export default mongoose.model("Gig", gigSchema);
