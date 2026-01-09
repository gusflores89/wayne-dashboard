// src/data/sheet.js

export const KPIS_URL = import.meta.env.VITE_SHEET_KPIS_CSV;
export const PROGRAMS_URL = import.meta.env.VITE_SHEET_PROGRAMS_CSV;
export const AGE_URL = import.meta.env.VITE_SHEET_AGE_CSV;
export const TEAMS_URL = import.meta.env.VITE_SHEET_TEAMS_CSV;
export const PLAYERS_URL = import.meta.env.VITE_SHEET_PLAYERS_CSV;

export function assertEnv() {
  const missing = [];
  if (!KPIS_URL) missing.push("VITE_SHEET_KPIS_CSV");
  if (!PROGRAMS_URL) missing.push("VITE_SHEET_PROGRAMS_CSV");
  if (!AGE_URL) missing.push("VITE_SHEET_AGE_CSV");
  if (!TEAMS_URL) missing.push("VITE_SHEET_TEAMS_CSV");
  if (!PLAYERS_URL) missing.push("VITE_SHEET_PLAYERS_CSV");

  if (missing.length) {
    throw new Error(
      `Missing env vars: ${missing.join(", ")}. Check your .env (root) and restart npm run dev.`
    );
  }
}
