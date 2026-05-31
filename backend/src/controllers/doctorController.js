import DoctorProfile from "../models/DoctorProfile.js";
import Slot from "../models/Slot.js";
import Appointment from "../models/Appointment.js";
import Prescription from "../models/Prescription.js";

export async function listDoctors(req, res) {
  const q = { approvalStatus: "approved" };
  if (req.query.specialization) q.specialization = new RegExp(req.query.specialization, "i");
  const doctors = await DoctorProfile.find(q).populate("user", "name email phone").sort("-createdAt");
  res.json(doctors);
}

export async function getDoctor(req, res) {
  const doctor = await DoctorProfile.findOne({ user: req.params.id, approvalStatus: "approved" }).populate(
    "user",
    "name email phone"
  );
  if (!doctor) return res.status(404).json({ message: "Doctor not found" });
  const slots = await Slot.find({ doctor: req.params.id, status: "available", startsAt: { $gt: new Date() } }).sort(
    "startsAt"
  );
  res.json({ doctor, slots });
}

export async function updateProfile(req, res) {
  const profile = await DoctorProfile.findOneAndUpdate({ user: req.user._id }, req.body, {
    new: true,
    runValidators: true
  });
  res.json(profile);
}

export async function createSlot(req, res) {
  const profile = await DoctorProfile.findOne({ user: req.user._id, approvalStatus: "approved" });
  if (!profile) return res.status(403).json({ message: "Doctor approval required" });
  const startsAt = new Date(req.body.startsAt);
  const endsAt = req.body.endsAt ? new Date(req.body.endsAt) : new Date(startsAt.getTime() + 30 * 60 * 1000);
  if (startsAt <= new Date() || endsAt <= startsAt) return res.status(400).json({ message: "Invalid slot time" });
  const slot = await Slot.create({ doctor: req.user._id, startsAt, endsAt });
  res.status(201).json(slot);
}

export async function mySlots(req, res) {
  const slots = await Slot.find({ doctor: req.user._id }).sort("startsAt");
  res.json(slots);
}

export async function doctorAppointments(req, res) {
  const appointments = await Appointment.find({ doctor: req.user._id })
    .populate("user", "name email phone")
    .populate("slot")
    .populate("rescheduleSuggestion")
    .sort("startsAt");
  const withPrescriptions = await Promise.all(
    appointments.map(async (appointment) => {
      const data = appointment.toObject();
      data.prescription = await Prescription.findOne({ appointment: appointment._id });
      return data;
    })
  );
  res.json(withPrescriptions);
}
