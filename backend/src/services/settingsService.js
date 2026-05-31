import Settings from "../models/Settings.js";

export async function getSettings() {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
}

export function calculateCommission(fee, settings) {
  const raw = settings.commissionType === "fixed" ? settings.commissionValue : (fee * settings.commissionValue) / 100;
  return Math.round(raw * 100) / 100;
}
