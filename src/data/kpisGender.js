// src/data/kpisGender.js
import { KPIS_GENDER_URL } from "./sheet";
import { parseCSV, toNumber } from "./csv";

function normalizeSegment(s) {
  const key = String(s || "").toLowerCase().trim();
  if (key.includes("boy")) return "boys";
  if (key.includes("girl")) return "girls";
  return "club";
}

// Espera columnas (como tu sheet):
// Segment, Total 24/25, Total 25/26, Net Change, Retained, Lost, New, Avg Fee, Revenue Lost
export async function fetchKpisGender() {
  const res = await fetch(KPIS_GENDER_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`KPIs_Gender fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);

  const data = { club: null, boys: null, girls: null };

  for (const r of rows) {
    const seg = normalizeSegment(r["Segment"]);
    data[seg] = {
      totalLastYear: toNumber(r["Total 24/25"]),
      totalThisYear: toNumber(r["Total 25/26"]),
      netChange: toNumber(r["Net Change"]),
      retained: toNumber(r["Retained"]),
      lost: toNumber(r["Lost"]),
      new: toNumber(r["New"]),
      avgFee: toNumber(r["Avg Fee"]),
      revenueLost: toNumber(r["Revenue Lost"]), // opcional (si querés usarlo directo)
    };
  }

  // fallback por si falta alguno
  const fallback = {
    totalLastYear: 0,
    totalThisYear: 0,
    netChange: 0,
    retained: 0,
    lost: 0,
    new: 0,
    avgFee: 0,
    revenueLost: 0,
  };

  return {
    club: data.club ?? fallback,
    boys: data.boys ?? fallback,
    girls: data.girls ?? fallback,
  };
}
