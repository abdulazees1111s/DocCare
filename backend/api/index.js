import app from "../src/app.js";
import { connectDb } from "../src/config/db.js";
import { createMemoryApp } from "../src/memoryApp.js";

let activeApp = app;
let ready = connectDb().catch((err) => {
  console.error("MongoDB connection failed in Vercel function:", err.message);
  if (process.env.ALLOW_MEMORY_FALLBACK === "false") throw err;
  activeApp = createMemoryApp();
});

export default async function handler(req, res) {
  await ready;
  return activeApp(req, res);
}
