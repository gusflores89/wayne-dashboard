// src/data/kpis.js

function parseCSV(text) {
  // parser simple (ok si el CSV no trae comillas con comas internas)
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (cols[i] ?? "").trim()));
    return row;
  });
}

function normGender(g) {
  const s = String(g || "").toLowerCase();
  if (s.startsWith("b")) return "boys";
  if (s.startsWith("g")) return "girls";
  return "club";
}

function isYes(v) {
  return String(v || "").trim().toUpperCase() === "Y";
}

// Espera headers típicos del RAW_PlayerMaster:
// Gender, Registered Last Yr (Y/N), Registered This Yr (Y/N)
export function buildGenderKpisFromPlayers(rows) {
  const base = {
    totalLastYear: 0,
    totalThisYear: 0,
    retained: 0,
    lost: 0,
    new: 0,
  };

  const out = {
    club: { ...base },
    boys: { ...base },
    girls: { ...base },
  };

  for (const r of rows) {
    const g = normGender(r["Gender"]);
    const regLast = isYes(r["Registered Last Yr (Y/N)"]);
    const regThis = isYes(r["Registered This Yr (Y/N)"]);

    // club
    if (regLast) out.club.totalLastYear += 1;
    if (regThis) out.club.totalThisYear += 1;
    if (regLast && regThis) out.club.retained += 1;
    if (regLast && !regThis) out.club.lost += 1;
    if (!regLast && regThis) out.club.new += 1;

    // boys / girls
    if (g === "boys" || g === "girls") {
      if (regLast) out[g].totalLastYear += 1;
      if (regThis) out[g].totalThisYear += 1;
      if (regLast && regThis) out[g].retained += 1;
      if (regLast && !regThis) out[g].lost += 1;
      if (!regLast && regThis) out[g].new += 1;
    }
  }

  // netChange
  for (const key of ["club", "boys", "girls"]) {
    out[key].netChange = out[key].totalThisYear - out[key].totalLastYear;
  }

  return out;
}

export async function fetchPlayersAndBuildKpis(playersCsvUrl) {
  const res = await fetch(playersCsvUrl);
  if (!res.ok) throw new Error(`Players CSV fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  return buildGenderKpisFromPlayers(rows);
}
