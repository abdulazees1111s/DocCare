import Appointment from "../models/Appointment.js";
import { createNotification } from "../services/notificationService.js";

const reminders = [
  { key: "day", ms: 24 * 60 * 60 * 1000, label: "1 day" },
  { key: "hour", ms: 60 * 60 * 1000, label: "1 hour" },
  { key: "quarter", ms: 15 * 60 * 1000, label: "15 minutes" }
];

export function startReminderJob() {
  const run = async () => {
    const now = Date.now();
    const upcoming = await Appointment.find({
      status: { $in: ["booked", "rescheduled"] },
      startsAt: { $gt: new Date(), $lt: new Date(now + 24 * 60 * 60 * 1000 + 5 * 60 * 1000) }
    });

    for (const appointment of upcoming) {
      const diff = new Date(appointment.startsAt).getTime() - now;
      for (const reminder of reminders) {
        if (!appointment.reminderFlags[reminder.key] && diff <= reminder.ms) {
          appointment.reminderFlags[reminder.key] = true;
          await createNotification({
            recipient: appointment.user,
            title: "Appointment reminder",
            message: `Your appointment starts in about ${reminder.label}.`,
            type: "reminder"
          });
          await createNotification({
            recipient: appointment.doctor,
            title: "Appointment reminder",
            message: `Your appointment starts in about ${reminder.label}.`,
            type: "reminder"
          });
        }
      }
      await appointment.save();
    }
  };

  run().catch((err) => console.error("Reminder job failed", err));
  setInterval(() => run().catch((err) => console.error("Reminder job failed", err)), 5 * 60 * 1000);
}
