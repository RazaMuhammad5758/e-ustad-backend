import mongoose from "mongoose";

const gigCommentSchema = new mongoose.Schema(
  {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

gigCommentSchema.index({ gigId: 1, createdAt: -1 });

export default mongoose.model("GigComment", gigCommentSchema);
