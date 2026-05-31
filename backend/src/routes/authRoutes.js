import { Router } from "express";
import { login, me, registerDoctor, registerUser } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/register/user", registerUser);
router.post("/register/doctor", upload.single("certificate"), registerDoctor);
router.post("/login", login);
router.get("/me", protect, me);

export default router;
