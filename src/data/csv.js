// src/data/csv.js

// CSV simple -> array de objetos
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    // Soporta comillas básicas. Si tenés comas dentro de campos con comillas, avisame y lo robustecemos.
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (values[i] ?? "").trim()));
    return obj;
  });
}

function splitCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function toNumber(x) {
  // soporta "3,000" o "$3,000" o "3000"
  const clean = String(x ?? "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}
