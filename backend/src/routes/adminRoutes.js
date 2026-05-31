import { Router } from "express";
import { dashboard, listAppointments, listDoctorProfiles, listUsers, reviewDoctor } from "../controllers/adminController.js";
import { permit, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect, permit("admin"));
router.get("/dashboard", dashboard);
router.get("/users", listUsers);
router.get("/doctors", listDoctorProfiles);
router.get("/appointments", listAppointments);
router.patch("/doctors/:id/review", reviewDoctor);

export default router;
