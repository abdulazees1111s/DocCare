import Appointment from "../models/Appointment.js";
import DoctorProfile from "../models/DoctorProfile.js";
import Slot from "../models/Slot.js";
import { createNotification, notifyMany } from "./notificationService.js";
import { calculateCommission, getSettings } from "./settingsService.js";

export function isWithin24Hours(date) {
  return new Date(date).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

export async function bookSlot({ userId, slotId }) {
  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, status: "available", startsAt: { $gt: new Date() } },
    { status: "booked" },
    { new: true }
  );
  if (!slot) {
    const err = new Error("Slot is not available");
    err.status = 409;
    throw err;
  }

  const profile = await DoctorProfile.findOne({ user: slot.doctor, approvalStatus: "approved" });
  if (!profile) {
    await Slot.findByIdAndUpdate(slot._id, { status: "available" });
    const err = new Error("Doctor is not approved");
    err.status = 400;
    throw err;
  }

  const settings = await getSettings();
  const commissionAmount = calculateCommission(profile.consultationFee, settings);
  const appointment = await Appointment.create({
    user: userId,
    doctor: slot.doctor,
    slot: slot._id,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    doctorFee: profile.consultationFee,
    commissionAmount,
    totalFee: profile.consultationFee + commissionAmount
  });

  await notifyMany([userId, slot.doctor], {
    title: "Appointment booked",
    message: `Appointment confirmed for ${slot.startsAt.toLocaleString()}.`,
    type: "booking"
  });

  return appointment;
}

export async function requestReschedule({ appointmentId, userId }) {
  const appointment = await Appointment.findOne({ _id: appointmentId, user: userId, status: "booked" });
  if (!appointment) throw Object.assign(new Error("Appointment not found"), { status: 404 });
  if (isWithin24Hours(appointment.startsAt)) {
    throw Object.assign(new Error("Cannot reschedule within 24 hours"), { status: 400 });
  }

  const nextSlot = await Slot.findOne({
    doctor: appointment.doctor,
    status: "available",
    startsAt: { $gt: appointment.startsAt }
  }).sort("startsAt");

  if (!nextSlot) throw Object.assign(new Error("No next available slot found"), { status: 404 });

  appointment.status = "reschedule_requested";
  appointment.rescheduleSuggestion = nextSlot._id;
  await appointment.save();

  await createNotification({
    recipient: appointment.doctor,
    title: "Reschedule requested",
    message: "A patient requested the next available appointment slot.",
    type: "system"
  });

  return appointment.populate("rescheduleSuggestion");
}

export async function confirmReschedule({ appointmentId, doctorId }) {
  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctor: doctorId,
    status: "reschedule_requested"
  });
  if (!appointment) throw Object.assign(new Error("Appointment not found"), { status: 404 });

  const newSlot = await Slot.findOneAndUpdate(
    { _id: appointment.rescheduleSuggestion, status: "available" },
    { status: "booked" },
    { new: true }
  );
  if (!newSlot) throw Object.assign(new Error("Suggested slot is no longer available"), { status: 409 });

  await Slot.findByIdAndUpdate(appointment.slot, { status: "available" });
  appointment.slot = newSlot._id;
  appointment.startsAt = newSlot.startsAt;
  appointment.endsAt = newSlot.endsAt;
  appointment.status = "rescheduled";
  appointment.rescheduleSuggestion = undefined;
  appointment.reminderFlags = { day: false, hour: false, quarter: false };
  await appointment.save();

  await notifyMany([appointment.user, appointment.doctor], {
    title: "Appointment rescheduled",
    message: `New appointment time is ${newSlot.startsAt.toLocaleString()}.`,
    type: "booking"
  });

  return appointment;
}
