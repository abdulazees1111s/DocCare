import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { upload } from "./middleware/upload.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const secret = process.env.JWT_SECRET || "dev_secret";
const dataDir = process.env.VERCEL ? "/tmp/doccare-data" : path.join(__dirname, "../data");
const dataFile = path.join(dataDir, "memory-db.json");

function defaultDb() {
  const futureStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const futureEnd = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
  return {
    users: [
      { _id: "admin-1", name: "System Admin", email: "admin@docapp.com", password: "Admin@123", role: "admin", phone: "" },
      { _id: "doctor-demo", name: "Demo Doctor", email: "doctor@gmail.com", password: "12345678", role: "doctor", phone: "9000000000" },
      { _id: "patient-demo", name: "Demo Patient", email: "patient@gmail.com", password: "12345678", role: "user", phone: "9111111111" }
    ],
    profiles: [
      {
        _id: "profile-demo",
        user: "doctor-demo",
        specialization: "General Medicine",
        qualification: "MBBS",
        experienceYears: 5,
        consultationFee: 500,
        certificateUrl: "",
        approvalStatus: "approved",
        bio: "Demo approved doctor account.",
        clinicAddress: "Demo Clinic"
      }
    ],
    slots: [
      {
        _id: "slot-demo",
        doctor: "doctor-demo",
        startsAt: futureStart.toISOString(),
        endsAt: futureEnd.toISOString(),
        status: "available"
      }
    ],
    appointments: [],
    prescriptions: [],
    notifications: [],
    settings: { _id: "settings-1", appName: "DocCare", commissionType: "percentage", commissionValue: 10, logoUrl: "" }
  };
}

function loadDb() {
  try {
    if (!fs.existsSync(dataFile)) return defaultDb();
    const stored = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    const initial = defaultDb();
    return {
      ...initial,
      ...stored,
      settings: { ...initial.settings, ...(stored.settings || {}) },
      users: stored.users?.some((user) => user.email === "admin@docapp.com")
        ? stored.users.map((user) => ({ ...user, email: String(user.email || "").trim().toLowerCase() }))
        : [...initial.users, ...(stored.users || [])].map((user) => ({ ...user, email: String(user.email || "").trim().toLowerCase() }))
    };
  } catch {
    return defaultDb();
  }
}

function saveDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

const db = loadDb();

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sign(user) {
  return jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: "7d" });
}

function publicUser(user) {
  return { id: user._id, _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone };
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(token, secret);
    const user = db.users.find((item) => item._id === payload.id);
    if (!user) return res.status(401).json({ message: "Invalid session" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function permit(...roles) {
  return (req, res, next) => (roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Forbidden" }));
}

function notify(recipient, title, message, type = "system") {
  db.notifications.unshift({ _id: id("notification"), recipient, title, message, type, read: false, createdAt: new Date() });
  saveDb();
}

function profileWithUser(profile) {
  return { ...profile, user: publicUser(db.users.find((user) => user._id === profile.user)) };
}

function appointmentView(appointment) {
  const prescription = db.prescriptions.find((item) => item.appointment === appointment._id) || null;
  return {
    ...appointment,
    user: publicUser(db.users.find((user) => user._id === appointment.user)),
    doctor: publicUser(db.users.find((user) => user._id === appointment.doctor)),
    slot: db.slots.find((slot) => slot._id === appointment.slot),
    rescheduleSuggestion: db.slots.find((slot) => slot._id === appointment.rescheduleSuggestion),
    prescription
  };
}

function commission(fee) {
  const value = Number(db.settings.commissionValue || 0);
  return db.settings.commissionType === "fixed" ? value : Math.round(((Number(fee) * value) / 100) * 100) / 100;
}

function within24Hours(date) {
  return new Date(date).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

export function createMemoryApp() {
  saveDb();
  const app = express();
  const allowedOrigins = new Set([
    process.env.CLIENT_URL || "https://frontend-phi-flame-38.vercel.app",
    "https://frontend-phi-flame-38.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]);
  function isAllowedOrigin(origin) {
    try {
      const { hostname } = new URL(origin);
      return allowedOrigins.has(origin) || hostname.endsWith(".vercel.app");
    } catch {
      return false;
    }
  }
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  app.get("/", (_req, res) =>
    res.json({
      ok: true,
      app: "doctor-appointment-system",
      mode: "memory-demo",
      message: "DocCare API is running",
      health: "/health",
      endpoints: ["/api/auth/login", "/api/doctors", "/api/appointments/my", "/api/settings"]
    })
  );
  app.get("/health", (_req, res) => res.json({ ok: true, mode: "memory-demo" }));

  app.post("/api/auth/login", (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = db.users.find((item) => item.email === email && item.password === req.body.password);
    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    res.json({ token: sign(user), user: publicUser(user) });
  });

  app.post("/api/auth/register/user", (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (db.users.some((user) => user.email === email)) return res.status(409).json({ message: "Email already exists" });
    const user = { _id: id("user"), ...req.body, email, role: "user" };
    db.users.push(user);
    saveDb();
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  });

  app.post("/api/auth/register/doctor", upload.single("certificate"), (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (db.users.some((user) => user.email === email)) return res.status(409).json({ message: "Email already exists" });
    const user = {
      _id: id("doctor"),
      name: req.body.name,
      email,
      password: req.body.password,
      phone: req.body.phone,
      role: "doctor"
    };
    db.users.push(user);
    db.profiles.push({
      _id: id("profile"),
      user: user._id,
      specialization: req.body.specialization,
      qualification: req.body.qualification,
      experienceYears: Number(req.body.experienceYears || 0),
      consultationFee: Number(req.body.consultationFee || 0),
      certificateUrl: req.file ? `/uploads/${req.file.filename}` : "",
      approvalStatus: "pending",
      bio: "",
      clinicAddress: ""
    });
    saveDb();
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  });

  app.get("/api/auth/me", auth, (req, res) => {
    res.json({ user: publicUser(req.user), profile: db.profiles.find((profile) => profile.user === req.user._id) || null });
  });

  app.get("/api/settings", (_req, res) => res.json(db.settings));
  app.put("/api/settings", auth, permit("admin"), upload.single("logo"), (req, res) => {
    Object.assign(db.settings, req.body);
    if (req.file) db.settings.logoUrl = `/uploads/${req.file.filename}`;
    saveDb();
    res.json(db.settings);
  });

  app.get("/api/doctors", (_req, res) => {
    res.json(db.profiles.filter((profile) => profile.approvalStatus === "approved").map(profileWithUser));
  });

  app.get("/api/doctors/:doctorId", (req, res) => {
    const profile = db.profiles.find((item) => item.user === req.params.doctorId && item.approvalStatus === "approved");
    if (!profile) return res.status(404).json({ message: "Doctor not found" });
    const slots = db.slots.filter((slot) => slot.doctor === req.params.doctorId && slot.status === "available" && new Date(slot.startsAt) > new Date());
    res.json({ doctor: profileWithUser(profile), slots });
  });

  app.get("/api/doctors/me/slots", auth, permit("doctor"), (req, res) => {
    res.json(db.slots.filter((slot) => slot.doctor === req.user._id));
  });

  app.post("/api/doctors/me/slots", auth, permit("doctor"), (req, res) => {
    const profile = db.profiles.find((item) => item.user === req.user._id && item.approvalStatus === "approved");
    if (!profile) return res.status(403).json({ message: "Doctor approval required" });
    const startsAt = new Date(req.body.startsAt);
    const endsAt = req.body.endsAt ? new Date(req.body.endsAt) : new Date(startsAt.getTime() + 30 * 60 * 1000);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return res.status(400).json({ message: "Invalid slot date" });
    }
    if (startsAt <= new Date()) {
      return res.status(400).json({ message: "Slot must be in the future" });
    }
    if (endsAt <= startsAt) {
      return res.status(400).json({ message: "End time must be after start time" });
    }
    const duplicate = db.slots.some(
      (slot) => slot.doctor === req.user._id && new Date(slot.startsAt).getTime() === startsAt.getTime()
    );
    if (duplicate) return res.status(409).json({ message: "This slot already exists" });
    const slot = { _id: id("slot"), doctor: req.user._id, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), status: "available" };
    db.slots.push(slot);
    saveDb();
    res.status(201).json(slot);
  });

  app.put("/api/doctors/me/profile", auth, permit("doctor"), (req, res) => {
    const profile = db.profiles.find((item) => item.user === req.user._id);
    Object.assign(profile, req.body);
    if (req.body.consultationFee) profile.consultationFee = Number(req.body.consultationFee);
    saveDb();
    res.json(profile);
  });

  app.get("/api/doctors/me/appointments", auth, permit("doctor"), (req, res) => {
    res.json(db.appointments.filter((item) => item.doctor === req.user._id).map(appointmentView));
  });

  app.post("/api/appointments/book", auth, permit("user"), (req, res) => {
    const slot = db.slots.find((item) => item._id === req.body.slotId && item.status === "available");
    if (!slot) return res.status(409).json({ message: "Slot is not available" });
    const profile = db.profiles.find((item) => item.user === slot.doctor && item.approvalStatus === "approved");
    const commissionAmount = commission(profile.consultationFee);
    slot.status = "booked";
    const appointment = {
      _id: id("appointment"),
      user: req.user._id,
      doctor: slot.doctor,
      slot: slot._id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      doctorFee: Number(profile.consultationFee),
      commissionAmount,
      totalFee: Number(profile.consultationFee) + commissionAmount,
      status: "booked"
    };
    db.appointments.push(appointment);
    saveDb();
    notify(req.user._id, "Appointment booked", "Your appointment has been confirmed.", "booking");
    notify(slot.doctor, "Appointment booked", "A patient booked your slot.", "booking");
    res.status(201).json(appointment);
  });

  app.get("/api/appointments/my", auth, permit("user", "doctor"), (req, res) => {
    const key = req.user.role === "doctor" ? "doctor" : "user";
    res.json(db.appointments.filter((item) => item[key] === req.user._id).map(appointmentView));
  });

  app.patch("/api/appointments/:appointmentId/cancel", auth, permit("user"), (req, res) => {
    const appointment = db.appointments.find((item) => item._id === req.params.appointmentId && item.user === req.user._id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (within24Hours(appointment.startsAt)) return res.status(400).json({ message: "Cannot cancel within 24 hours" });
    appointment.status = "cancelled";
    const slot = db.slots.find((item) => item._id === appointment.slot);
    if (slot) slot.status = "available";
    saveDb();
    res.json(appointmentView(appointment));
  });

  app.patch("/api/appointments/:appointmentId/reschedule", auth, permit("user"), (req, res) => {
    const appointment = db.appointments.find((item) => item._id === req.params.appointmentId && item.user === req.user._id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (within24Hours(appointment.startsAt)) return res.status(400).json({ message: "Cannot reschedule within 24 hours" });
    const nextSlot = db.slots.find((slot) => slot.doctor === appointment.doctor && slot.status === "available" && new Date(slot.startsAt) > new Date(appointment.startsAt));
    if (!nextSlot) return res.status(404).json({ message: "No next available slot found" });
    appointment.status = "reschedule_requested";
    appointment.rescheduleSuggestion = nextSlot._id;
    saveDb();
    notify(appointment.doctor, "Reschedule requested", "A patient requested the next available slot.");
    res.json(appointmentView(appointment));
  });

  app.patch("/api/appointments/:appointmentId/reschedule/confirm", auth, permit("doctor"), (req, res) => {
    const appointment = db.appointments.find((item) => item._id === req.params.appointmentId && item.doctor === req.user._id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    const newSlot = db.slots.find((slot) => slot._id === appointment.rescheduleSuggestion && slot.status === "available");
    if (!newSlot) return res.status(409).json({ message: "Suggested slot is no longer available" });
    const oldSlot = db.slots.find((slot) => slot._id === appointment.slot);
    if (oldSlot) oldSlot.status = "available";
    newSlot.status = "booked";
    appointment.slot = newSlot._id;
    appointment.startsAt = newSlot.startsAt;
    appointment.endsAt = newSlot.endsAt;
    appointment.status = "rescheduled";
    delete appointment.rescheduleSuggestion;
    saveDb();
    res.json(appointmentView(appointment));
  });

  app.patch("/api/appointments/:appointmentId/complete", auth, permit("doctor"), (req, res) => {
    const appointment = db.appointments.find((item) => item._id === req.params.appointmentId && item.doctor === req.user._id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    appointment.status = "completed";
    saveDb();
    notify(appointment.user, "Appointment completed", "Your appointment has been marked completed.", "completion");
    res.json(appointmentView(appointment));
  });

  app.post("/api/prescriptions", auth, permit("doctor"), (req, res) => {
    const appointment = db.appointments.find((item) => item._id === req.body.appointmentId && item.doctor === req.user._id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    const existing = db.prescriptions.find((item) => item.appointment === appointment._id);
    const prescription = { _id: existing?._id || id("prescription"), ...req.body, appointment: appointment._id, doctor: req.user._id, user: appointment.user };
    if (existing) Object.assign(existing, prescription);
    else db.prescriptions.unshift(prescription);
    saveDb();
    notify(appointment.user, "Prescription added", "Your prescription is ready.", "completion");
    res.status(201).json(prescription);
  });

  app.get("/api/prescriptions/my", auth, permit("user"), (req, res) => {
    res.json(db.prescriptions.filter((item) => item.user === req.user._id).map((item) => ({ ...item, doctor: publicUser(db.users.find((u) => u._id === item.doctor)), user: publicUser(db.users.find((u) => u._id === item.user)) })));
  });

  app.get("/api/notifications", auth, (req, res) => {
    res.json(db.notifications.filter((item) => item.recipient === req.user._id).slice(0, 50));
  });

  app.patch("/api/notifications/:notificationId/read", auth, (req, res) => {
    const notification = db.notifications.find((item) => item._id === req.params.notificationId && item.recipient === req.user._id);
    if (notification) notification.read = true;
    saveDb();
    res.json(notification);
  });

  app.get("/api/admin/dashboard", auth, permit("admin"), (_req, res) => {
    res.json({
      users: db.users.filter((user) => user.role === "user").length,
      doctors: db.users.filter((user) => user.role === "doctor").length,
      pendingDoctors: db.profiles.filter((profile) => profile.approvalStatus === "pending").length,
      appointments: db.appointments.length
    });
  });

  app.get("/api/admin/users", auth, permit("admin"), (_req, res) => {
    res.json(db.users.filter((user) => user.role === "user").map(publicUser));
  });

  app.get("/api/admin/doctors", auth, permit("admin"), (_req, res) => {
    res.json(db.profiles.map(profileWithUser));
  });

  app.get("/api/admin/appointments", auth, permit("admin"), (_req, res) => {
    res.json(db.appointments.map(appointmentView));
  });

  app.patch("/api/admin/doctors/:profileId/review", auth, permit("admin"), (req, res) => {
    const profile = db.profiles.find((item) => item._id === req.params.profileId);
    if (!profile) return res.status(404).json({ message: "Doctor profile not found" });
    profile.approvalStatus = req.body.status;
    profile.rejectionReason = req.body.rejectionReason || "";
    saveDb();
    notify(profile.user, `Doctor profile ${req.body.status}`, req.body.status === "approved" ? "You can now create slots." : "Your application was rejected.", "approval");
    res.json(profile);
  });

  return app;
}
