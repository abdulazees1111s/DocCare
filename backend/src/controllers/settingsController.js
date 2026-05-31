import { getSettings } from "../services/settingsService.js";

export async function readSettings(_req, res) {
  res.json(await getSettings());
}

export async function updateSettings(req, res) {
  const settings = await getSettings();
  const updates = req.body;
  if (req.file) updates.logoUrl = `/uploads/${req.file.filename}`;
  Object.assign(settings, updates);
  await settings.save();
  res.json(settings);
}
