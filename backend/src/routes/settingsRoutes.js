import { Router } from "express";
import { readSettings, updateSettings } from "../controllers/settingsController.js";
import { permit, protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", readSettings);
router.put("/", protect, permit("admin"), upload.single("logo"), updateSettings);

export default router;
