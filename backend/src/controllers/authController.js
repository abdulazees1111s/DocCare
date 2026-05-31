import jwt from "jsonwebtoken";
import DoctorProfile from "../models/DoctorProfile.js";
import User from "../models/User.js";

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone };
}

export async function registerUser(req, res, next) {
  try {
    const user = await User.create({ ...req.body, role: "user" });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function registerDoctor(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "Certificate is required" });
    const { name, email, password, phone, specialization, qualification, experienceYears, consultationFee } = req.body;
    const user = await User.create({ name, email, password, phone, role: "doctor" });
    await DoctorProfile.create({
      user: user._id,
      specialization,
      qualification,
      experienceYears,
      consultationFee,
      certificateUrl: `/uploads/${req.file.filename}`
    });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await user.matchPassword(req.body.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  let profile = null;
  if (req.user.role === "doctor") profile = await DoctorProfile.findOne({ user: req.user._id });
  res.json({ user: publicUser(req.user), profile });
}
