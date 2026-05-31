import Appointment from "../models/Appointment.js";
import Prescription from "../models/Prescription.js";
import { createNotification } from "../services/notificationService.js";

export async function createPrescription(req, res) {
  const appointment = await Appointment.findOne({ _id: req.body.appointmentId, doctor: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found" });

  const prescription = await Prescription.findOneAndUpdate(
    { appointment: appointment._id },
    {
      appointment: appointment._id,
      doctor: req.user._id,
      user: appointment.user,
      diagnosis: req.body.diagnosis,
      medicines: req.body.medicines || [],
      advice: req.body.advice,
      followUpDate: req.body.followUpDate
    },
    { upsert: true, new: true, runValidators: true }
  );

  await createNotification({
    recipient: appointment.user,
    title: "Prescription added",
    message: "Your doctor has added a prescription.",
    type: "completion"
  });

  res.status(201).json(prescription);
}

export async function myPrescriptions(req, res) {
  const prescriptions = await Prescription.find({ user: req.user._id })
    .populate("appointment")
    .populate("doctor", "name email")
    .populate("user", "name email")
    .sort("-createdAt");
  res.json(prescriptions);
}
