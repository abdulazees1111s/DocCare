import dotenv from "dotenv";
import { connectDb } from "../config/db.js";
import User from "../models/User.js";
import { getSettings } from "../services/settingsService.js";

dotenv.config();

await connectDb();
const existing = await User.findOne({ email: "admin@docapp.com" });
if (!existing) {
  await User.create({
    name: "System Admin",
    email: "admin@docapp.com",
    password: "Admin@123",
    role: "admin"
  });
  console.log("Admin created: admin@docapp.com / Admin@123");
} else {
  console.log("Admin already exists");
}
await getSettings();
process.exit(0);
