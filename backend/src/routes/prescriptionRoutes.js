import { Router } from "express";
import { createPrescription, myPrescriptions } from "../controllers/prescriptionController.js";
import { permit, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/my", permit("user"), myPrescriptions);
router.post("/", permit("doctor"), createPrescription);

export default router;
