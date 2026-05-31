import app from "./src/app.js";
import { connectDb } from "./src/config/db.js";
import { startReminderJob } from "./src/jobs/reminderJob.js";
import { createMemoryApp } from "./src/memoryApp.js";

const port = process.env.PORT || 5000;

connectDb()
  .then(() => {
    startReminderJob();
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed.");
    console.error("Start MongoDB locally or set MONGO_URI in backend/.env to your MongoDB Atlas connection string.");
    console.error(err.message);
    if (process.env.ALLOW_MEMORY_FALLBACK === "false") process.exit(1);
    const memoryApp = createMemoryApp();
    memoryApp.listen(port, () => {
      console.log(`API running in memory demo mode on http://localhost:${port}`);
    });
  });
