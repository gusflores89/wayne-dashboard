// src/data/kpis.js
import { KPIS_URL } from "./sheet";

// Convierte "1,234" / "$1,234" / "56.2%" a número
function toNumber(v) {
  if (v == null) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const cleaned = s
    .replace(/\$/g, "")
    .replace(/%/g, "")
    .replace(/,/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Lee un CSV simple y devuelve filas como objetos usando headers
function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? "").trim()));
    return obj;
  });
}

/**
 * Espera que tu hoja KPIs tenga columnas (headers) como:
 * segment,totalLastYear,totalThisYear,netChange,retained,lost,new,avgFee
 *
 * segment: club | boys | girls
 */
export async function fetchKpis() {
  const res = await fetch(KPIS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`KPIS fetch failed: ${res.status}`);
  const csv = await res.text();
  const rows = parseCSV(csv);

  // Convertimos a diccionario por segment
  const out = {};
  for (const r of rows) {
    const segment = (r.segment || "").toLowerCase().trim();
    if (!segment) continue;

    out[segment] = {
      totalLastYear: toNumber(r.totalLastYear),
      totalThisYear: toNumber(r.totalThisYear),
      netChange: toNumber(r.netChange),
      retained: toNumber(r.retained),
      lost: toNumber(r.lost),
      new: toNumber(r.new),
      avgFee: toNumber(r.avgFee) || 3000,
    };
  }

  return out; // { club: {...}, boys: {...}, girls: {...} }
}
