import { Router } from "express";
import {
  createSlot,
  doctorAppointments,
  getDoctor,
  listDoctors,
  mySlots,
  updateProfile
} from "../controllers/doctorController.js";
import { permit, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", listDoctors);
router.get("/me/slots", protect, permit("doctor"), mySlots);
router.get("/me/appointments", protect, permit("doctor"), doctorAppointments);
router.put("/me/profile", protect, permit("doctor"), updateProfile);
router.post("/me/slots", protect, permit("doctor"), createSlot);
router.get("/:id", getDoctor);

export default router;
