import Notification from "../models/Notification.js";

export function createNotification(data) {
  return Notification.create(data);
}

export async function notifyMany(recipients, payload) {
  return Notification.insertMany(recipients.map((recipient) => ({ recipient, ...payload })));
}
