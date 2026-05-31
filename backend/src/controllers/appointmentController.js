import Appointment from "../models/Appointment.js";
import Prescription from "../models/Prescription.js";
import Slot from "../models/Slot.js";
import { bookSlot, confirmReschedule, isWithin24Hours, requestReschedule } from "../services/appointmentService.js";
import { createNotification, notifyMany } from "../services/notificationService.js";

export async function book(req, res, next) {
  try {
    const appointment = await bookSlot({ userId: req.user._id, slotId: req.body.slotId });
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function myAppointments(req, res) {
  const filter = req.user.role === "doctor" ? { doctor: req.user._id } : { user: req.user._id };
  const appointments = await Appointment.find(filter)
    .populate("doctor", "name email")
    .populate("user", "name email")
    .populate("slot")
    .populate("rescheduleSuggestion")
    .sort("-startsAt");
  const withPrescriptions = await Promise.all(
    appointments.map(async (appointment) => {
      const data = appointment.toObject();
      data.prescription = await Prescription.findOne({ appointment: appointment._id });
      return data;
    })
  );
  res.json(withPrescriptions);
}

export async function cancel(req, res) {
  const appointment = await Appointment.findOne({ _id: req.params.id, user: req.user._id, status: "booked" });
  if (!appointment) return res.status(404).json({ message: "Appointment not found" });
  if (isWithin24Hours(appointment.startsAt)) return res.status(400).json({ message: "Cannot cancel within 24 hours" });
  appointment.status = "cancelled";
  await appointment.save();
  await Slot.findByIdAndUpdate(appointment.slot, { status: "available" });
  await notifyMany([appointment.user, appointment.doctor], {
    title: "Appointment cancelled",
    message: "The appointment has been cancelled.",
    type: "system"
  });
  res.json(appointment);
}

export async function reschedule(req, res, next) {
  try {
    const appointment = await requestReschedule({ appointmentId: req.params.id, userId: req.user._id });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function approveReschedule(req, res, next) {
  try {
    const appointment = await confirmReschedule({ appointmentId: req.params.id, doctorId: req.user._id });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
}

export async function complete(req, res) {
  const appointment = await Appointment.findOne({ _id: req.params.id, doctor: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found" });
  appointment.status = "completed";
  await appointment.save();
  await createNotification({
    recipient: appointment.user,
    title: "Appointment completed",
    message: "Your appointment has been marked as completed.",
    type: "completion"
  });
  res.json(appointment);
}
