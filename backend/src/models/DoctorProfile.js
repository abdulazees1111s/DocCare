import mongoose from "mongoose";

const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    specialization: { type: String, required: true },
    qualification: { type: String, required: true },
    experienceYears: { type: Number, default: 0 },
    bio: String,
    clinicAddress: String,
    consultationFee: { type: Number, required: true, min: 0 },
    certificateUrl: { type: String, required: true },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: String
  },
  { timestamps: true }
);

export default mongoose.model("DoctorProfile", doctorProfileSchema);
