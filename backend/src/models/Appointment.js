import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", required: true, unique: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    doctorFee: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    totalFee: { type: Number, required: true },
    status: {
      type: String,
      enum: ["booked", "completed", "cancelled", "reschedule_requested", "rescheduled"],
      default: "booked"
    },
    rescheduleSuggestion: { type: mongoose.Schema.Types.ObjectId, ref: "Slot" },
    reminderFlags: {
      day: { type: Boolean, default: false },
      hour: { type: Boolean, default: false },
      quarter: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
