import Notification from "../models/Notification.js";

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ recipient: req.user._id }).sort("-createdAt").limit(50);
  res.json(notifications);
}

export async function markRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true },
    { new: true }
  );
  res.json(notification);
}
