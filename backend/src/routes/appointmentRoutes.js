import { Router } from "express";
import {
  approveReschedule,
  book,
  cancel,
  complete,
  myAppointments,
  reschedule
} from "../controllers/appointmentController.js";
import { permit, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.post("/book", permit("user"), book);
router.get("/my", permit("user", "doctor"), myAppointments);
router.patch("/:id/cancel", permit("user"), cancel);
router.patch("/:id/reschedule", permit("user"), reschedule);
router.patch("/:id/reschedule/confirm", permit("doctor"), approveReschedule);
router.patch("/:id/complete", permit("doctor"), complete);

export default router;
