import mongoose from "mongoose";

const slotSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ["available", "booked", "blocked"], default: "available" }
  },
  { timestamps: true }
);

slotSchema.index({ doctor: 1, startsAt: 1 }, { unique: true });

export default mongoose.model("Slot", slotSchema);
