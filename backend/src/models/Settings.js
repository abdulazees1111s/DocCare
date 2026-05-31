import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    appName: { type: String, default: "DocCare" },
    logoUrl: String,
    commissionType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    commissionValue: { type: Number, default: 10, min: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
