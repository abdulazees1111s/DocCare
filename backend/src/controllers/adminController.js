import Appointment from "../models/Appointment.js";
import DoctorProfile from "../models/DoctorProfile.js";
import User from "../models/User.js";
import { createNotification } from "../services/notificationService.js";

export async function dashboard(req, res) {
  const [users, doctors, pendingDoctors, appointments] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "doctor" }),
    DoctorProfile.countDocuments({ approvalStatus: "pending" }),
    Appointment.countDocuments()
  ]);
  res.json({ users, doctors, pendingDoctors, appointments });
}

export async function listUsers(req, res) {
  const users = await User.find({ role: "user" }).select("-password").sort("-createdAt");
  res.json(users);
}

export async function listDoctorProfiles(req, res) {
  const doctors = await DoctorProfile.find().populate("user", "name email phone").sort("-createdAt");
  res.json(doctors);
}

export async function listAppointments(req, res) {
  const appointments = await Appointment.find()
    .populate("user", "name email")
    .populate("doctor", "name email")
    .sort("-createdAt");
  res.json(appointments);
}

export async function reviewDoctor(req, res) {
  const status = req.body.status;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  const profile = await DoctorProfile.findByIdAndUpdate(
    req.params.id,
    { approvalStatus: status, rejectionReason: req.body.rejectionReason || "" },
    { new: true }
  );
  if (!profile) return res.status(404).json({ message: "Doctor profile not found" });
  await createNotification({
    recipient: profile.user,
    title: `Doctor profile ${status}`,
    message: status === "approved" ? "You can now create slots." : req.body.rejectionReason || "Your application was rejected.",
    type: "approval"
  });
  res.json(profile);
}
