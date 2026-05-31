import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    diagnosis: { type: String, required: true },
    medicines: [{ name: String, dosage: String, duration: String, notes: String }],
    advice: String,
    followUpDate: Date
  },
  { timestamps: true }
);

export default mongoose.model("Prescription", prescriptionSchema);
