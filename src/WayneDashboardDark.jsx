import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  UserMinus, TrendingUp, Award, Search, ShieldCheck,
  ClipboardList, Briefcase, ChevronRight, DollarSign, X, Users, Target,
  AlertTriangle, TrendingDown, UserPlus, UserCheck, LogOut, Info, FileSpreadsheet
} from "lucide-react";
import * as XLSX from 'xlsx';

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                               */
/* -------------------------------------------------------------------------- */
const getEnvVar = (key) => {
  try {
    return import.meta.env[key] || "";
  } catch (e) {
    return "";
  }
};

const URLS = {
  KPIS_GENDER: getEnvVar("VITE_SHEET_KPIS_GENDER_CSV"),
  PROGRAMS: getEnvVar("VITE_SHEET_PROGRAMS_CSV"),
  AGE: getEnvVar("VITE_SHEET_AGE_CSV"),
  TEAMS: getEnvVar("VITE_SHEET_TEAMS_CSV"),
  PLAYERS: getEnvVar("VITE_SHEET_PLAYERS_CSV")
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                     */
/* -------------------------------------------------------------------------- */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { row.push(cur); cur = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = ""; continue;
    }
    cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
}

function rowsToObjects(rows) {
  if (!rows?.length) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
    out.push(obj);
  }
  return out;
}

function toNumber(x) {
  if (typeof x === "number") return x;
  const clean = String(x ?? "").replace(/\$/g, "").replace(/,/g, "").replace(/%/g, "").trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function pick(obj, candidates) {
  const keys = Object.keys(obj || {});
  for (const c of candidates) {
    const found = keys.find((k) => k.toLowerCase().trim() === c.toLowerCase().trim());
    if (found) return obj[found];
  }
  return "";
}

function normalizePercent(val) {
  const n = toNumber(val);
  if (n > 1 && n <= 100) return n;
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return n;
}

// Export to Excel with formatting
function exportToExcel(data, filename, sheetName = "Data") {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }
  
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    // Auto-width columns
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length + 2,
        ...data.map(row => String(row[key] || '').length + 2)
      )
    }));
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel sheet names max 31 chars
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error("Export error:", error);
    alert("Error exporting file. Please try again.");
  }
}

// Export multiple sheets to Excel
function exportMultipleSheetsToExcel(sheets, filename) {
  try {
    const wb = XLSX.utils.book_new();
    
    sheets.forEach(({ data, name }) => {
      if (data && data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data);
        const colWidths = Object.keys(data[0]).map(key => ({
          wch: Math.max(
            key.length + 2,
            ...data.map(row => String(row[key] || '').length + 2)
          )
        }));
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
      }
    });
    
    if (wb.SheetNames.length === 0) {
      alert("No data to export");
      return;
    }
    
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error("Export error:", error);
    alert("Error exporting file. Please try again.");
  }
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                  */
/* -------------------------------------------------------------------------- */

const PlayerModal = ({ isOpen, onClose, title, players, subtitle }) => {
  if (!isOpen) return null;
  
  const handleExport = () => {
    exportToExcel(players.map(p => ({
      Name: p.name,
      Status: p.status,
      Team: p.team || p.teamLast || '',
      Gender: p.gender || ''
    })), title.replace(/[^a-zA-Z0-9]/g, '_'), 'Players');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#070D1F] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#3A7FC3]/50">
        <div className="p-5 border-b border-[#3A7FC3]/30 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-lg">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle || `${players.length} players`}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#3A7FC3]/20 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {players.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">No players found.</p>
          ) : (
            <ul className="space-y-2">
              {players.map((p, i) => (
                <li key={i} className="flex items-center justify-between p-3 bg-[#0C1B46] rounded-xl border border-[#3A7FC3]/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      p.status === 'Lost' ? 'bg-rose-500/20 text-rose-400' : 
                      p.status === 'New' ? 'bg-emerald-500/20 text-emerald-400' : 
                      'bg-[#3A7FC3]/20 text-[#5DB3F5]'
                    }`}>
                      {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <span className="font-medium text-white text-sm">{p.name}</span>
                      {p.team && <span className="block text-xs text-slate-500">{p.team}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.gender && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.gender.toLowerCase() === 'boys' || p.gender.toUpperCase() === 'M' 
                          ? 'bg-[#3A7FC3]/20 text-[#5DB3F5]' 
                          : 'bg-pink-500/20 text-pink-400'
                      }`}>
                        {p.gender.toLowerCase() === 'boys' || p.gender.toUpperCase() === 'M' ? '♂' : '♀'}
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                      p.status === 'Lost' ? 'bg-rose-500/20 text-rose-400' : 
                      p.status === 'New' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-[#3A7FC3]/20 text-[#5DB3F5]'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 bg-[#0C1B46] border-t border-[#3A7FC3]/30 flex justify-between items-center">
          <button onClick={handleExport} className="text-xs font-bold text-[#5DB3F5] hover:text-[#82C3FF] flex items-center gap-1">
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Scorecard = ({ label, value, sub, highlight, colorClass = "" }) => (
  <div className={`p-6 rounded-2xl flex flex-col justify-center transition-all duration-300 border ${
    highlight 
      ? "bg-gradient-to-br from-[#3A7FC3] to-[#2F6DB3] border-[#5DB3F5]/50 shadow-lg shadow-[#3A7FC3]/20" 
      : "bg-[#070D1F] border-[#3A7FC3]/30"
  }`}>
    <span className={`text-xs font-bold uppercase tracking-wider mb-2 ${highlight ? "text-[#D2E6F5]" : "text-slate-500"}`}>
      {label}
    </span>
    <span className={`text-4xl font-black leading-none ${highlight ? "text-white" : colorClass || "text-white"}`}>
      {value}
    </span>
    <span className={`text-xs font-medium mt-2 ${highlight ? "text-[#D2E6F5]" : "text-slate-500"}`}>
      {sub}
    </span>
  </div>
);

const KPIBox = ({ title, value, sub, percent, icon: Icon, color, trend, onClick, clickable, tooltip }) => (
  <div 
    className={`bg-[#070D1F] p-5 rounded-2xl border border-[#3A7FC3]/30 flex flex-col justify-between ${
      clickable ? "cursor-pointer hover:border-[#5DB3F5]/50 transition-all" : ""
    }`}
    onClick={clickable ? onClick : undefined}
  >
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-20`}>
        <Icon size={20} className={color.replace('bg-', 'text-').replace('-600', '-400').replace('-500', '-400')} />
      </div>
      <div className="flex items-center gap-2">
        {tooltip && (
          <div className="group relative">
            <Info size={14} className="text-slate-500 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-[#070D1F] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-[#3A7FC3]/50 pointer-events-none">
              {tooltip}
            </div>
          </div>
        )}
        {percent && (
          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
            trend === "up" ? "bg-emerald-500/20 text-emerald-400" : 
            trend === "down" ? "bg-rose-500/20 text-rose-400" : 
            "bg-slate-700 text-slate-400"
          }`}>
            {percent}
          </span>
        )}
      </div>
    </div>
    <div className="mt-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-white">{value}</h3>
      <p className={`text-xs mt-1 font-medium ${
        trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-slate-500"
      }`}>{sub}</p>
    </div>
    {clickable && <p className="text-xs mt-3 text-[#5DB3F5] font-medium">Click for details →</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#070D1F] border border-[#3A7FC3]/50 rounded-xl p-3 shadow-xl">
        <p className="text-white font-bold text-sm mb-1">{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="text-sm" style={{ color: item.color }}>
            {item.name}: {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            {item.name?.toLowerCase().includes('rate') ? '%' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                              */
/* -------------------------------------------------------------------------- */
export default function WayneDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [genderFilter, setGenderFilter] = useState("club");
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState({ open: false, title: "", players: [], subtitle: "" });
  const [selectedEntity, setSelectedEntity] = useState({ type: 'coach', id: '' });
  
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [kpisGender, setKpisGender] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [ageDiag, setAgeDiag] = useState([]);
  const [teams, setTeams] = useState([]);
  const [playerList, setPlayerList] = useState([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (!URLS.KPIS_GENDER) {
          // Demo data
          setKpisGender({
            club: { totalLast: 916, totalThis: 868, net: -48, retained: 524, lost: 374, new: 344, fee: 3891, agedOut: 18 },
            boys: { totalLast: 600, totalThis: 565, net: -35, retained: 347, lost: 243, new: 218, fee: 3891, agedOut: 10 },
            girls: { totalLast: 316, totalThis: 303, net: -13, retained: 177, lost: 131, new: 126, fee: 3891, agedOut: 8 }
          });
          setPrograms([
            { name: "ECNL", retained: 140, lost: 113, retained_boys: 0, lost_boys: 0, retained_girls: 140, lost_girls: 113 },
            { name: "MLS NEXT", retained: 100, lost: 95, retained_boys: 100, lost_boys: 95, retained_girls: 0, lost_girls: 0 },
            { name: "Club", retained: 277, lost: 145, retained_boys: 240, lost_boys: 127, retained_girls: 37, lost_girls: 18 },
            { name: "NPL", retained: 7, lost: 21, retained_boys: 7, lost_boys: 21, retained_girls: 0, lost_girls: 0 }
          ]);
          setAgeDiag([
            { year: "2012", rate: 69, playersLast: 101, playersThis: 128, boysLast: 68, boysThis: 90, girlsLast: 33, girlsThis: 38, boysRate: 72, girlsRate: 64 },
            { year: "2013", rate: 75, playersLast: 101, playersThis: 100, boysLast: 75, boysThis: 68, girlsLast: 26, girlsThis: 32, boysRate: 78, girlsRate: 69 },
            { year: "2014", rate: 72, playersLast: 75, playersThis: 95, boysLast: 63, boysThis: 74, girlsLast: 12, girlsThis: 21, boysRate: 75, girlsRate: 65 },
            { year: "2015", rate: 68, playersLast: 80, playersThis: 72, boysLast: 50, boysThis: 45, girlsLast: 30, girlsThis: 27, boysRate: 70, girlsRate: 63 },
            { year: "2016", rate: 55, playersLast: 65, playersThis: 58, boysLast: 40, boysThis: 35, girlsLast: 25, girlsThis: 23, boysRate: 58, girlsRate: 50 },
          ]);
          setTeams([
            { name: "08 ELITE ECNL", program: "ECNL", coach: "Yvan Trevino", count: 44, retained: 30, lost: 14, gender: "F", fee: 4200 },
            { name: "2012 MLS Next", program: "MLS NEXT", coach: "Coach A", count: 18, retained: 12, lost: 6, gender: "M", fee: 4200 },
            { name: "2013 Boys Academy", program: "Club", coach: "Coach B", count: 16, retained: 10, lost: 6, gender: "M", fee: 3500 },
            { name: "2014 Girls Academy", program: "Club", coach: "Coach C", count: 14, retained: 8, lost: 6, gender: "F", fee: 3500 },
          ]);
          setPlayerList([]);
          setLoading(false);
          return;
        }

        const responses = await Promise.all([
          fetch(URLS.KPIS_GENDER).then(res => res.text()),
          fetch(URLS.PROGRAMS).then(res => res.text()),
          fetch(URLS.AGE).then(res => res.text()),
          fetch(URLS.TEAMS).then(res => res.text()),
          fetch(URLS.PLAYERS).then(res => res.text()),
        ]);

        const [kpiText, progText, ageText, teamText, playerText] = responses;

        // KPIs
        const kpiRows = rowsToObjects(parseCSV(kpiText));
        const kpiMap = {};
        kpiRows.forEach(r => {
          const key = (pick(r, ["Segment", "segment"]) || "club").toLowerCase();
          kpiMap[key] = {
            totalLast: toNumber(pick(r, ["Total 24/25"])),
            totalThis: toNumber(pick(r, ["Total 25/26"])),
            net: toNumber(pick(r, ["Net Change"])),
            retained: toNumber(pick(r, ["Retained"])),
            lost: toNumber(pick(r, ["Lost"])),
            new: toNumber(pick(r, ["New"])),
            fee: toNumber(pick(r, ["Avg Fee"])) || 3000,
            agedOut: toNumber(pick(r, ["Aged Out"])) || 0
          };
        });
        setKpisGender(kpiMap);

        // Programs with gender columns
        const progRows = rowsToObjects(parseCSV(progText));
        setPrograms(progRows.map(r => ({
          name: pick(r, ["name"]),
          retained: toNumber(pick(r, ["retained"])),
          lost: toNumber(pick(r, ["lost"])),
          retained_boys: toNumber(pick(r, ["retained_boys"])),
          lost_boys: toNumber(pick(r, ["lost_boys"])),
          retained_girls: toNumber(pick(r, ["retained_girls"])),
          lost_girls: toNumber(pick(r, ["lost_girls"]))
        })));

        // Age Diagnostic with gender columns
        // Age Diagnostic with gender columns
  
        // Age Diagnostic with gender columns - FIXED: Proper column reading
const ageRows = rowsToObjects(parseCSV(ageText));
setAgeDiag(ageRows.map(r => {
  const playersLast = toNumber(pick(r, ["playersLast", "Players"]));
  const playersThis = toNumber(pick(r, ["playersThis"]));
  const boysLast = toNumber(pick(r, ["boysLast"]));
  const boysThis = toNumber(pick(r, ["boysThis"]));
  const girlsLast = toNumber(pick(r, ["girlsLast"]));
  const girlsThis = toNumber(pick(r, ["girlsThis"]));
  const rate = normalizePercent(pick(r, ["rate"]));
  
  // Calculate gender-specific retention rates
  const boysRetained = Math.min(boysLast, boysThis);
  const girlsRetained = Math.min(girlsLast, girlsThis);
  
  return {
    year: String(pick(r, ["year"])),
    rate: rate,
    playersLast,
    playersThis,
    boysLast,
    boysThis,
    girlsLast,
    girlsThis,
    boysRate: boysLast > 0 ? Math.round((boysRetained / boysLast) * 100) : 0,
    girlsRate: girlsLast > 0 ? Math.round((girlsRetained / girlsLast) * 100) : 0,
    risk: pick(r, ["risk"])
  };
}));

        // Teams (25/26 only)
        const teamRows = rowsToObjects(parseCSV(teamText));
        setTeams(teamRows.map(r => {
          const name = pick(r, ["name"]) || "";
          let gender = pick(r, ["gender"]) || "";
          if (gender.toUpperCase() === 'M') gender = 'M';
          else if (gender.toUpperCase() === 'F') gender = 'F';
          else gender = name.toLowerCase().includes("girl") ? 'F' : 'M';
          
          return {
            name,
            program: pick(r, ["program"]),
            coach: pick(r, ["coach"]) || "Unassigned",
            count: toNumber(pick(r, ["count"])),
            retained: toNumber(pick(r, ["retained"])),
            lost: toNumber(pick(r, ["lost"])),
            gender,
            fee: toNumber(pick(r, ["Fee"])) || 3000
          };
        }));

        // Players
       // Players
        const playerRows = rowsToObjects(parseCSV(playerText));
        setPlayerList(playerRows.map(r => {
          let status = pick(r, ["status"]) || "Unknown";
          const agedOutVal = pick(r, ["aged_out"]);
          const isAgedOut = agedOutVal === 'Y' || agedOutVal === 'Yes';
          
          // --- MEJORA: DETECCIÓN DE GÉNERO UNIVERSAL ---
          let genderRaw = pick(r, ["gender"]) || "";
          let gender = "M"; // Por defecto (si falla todo)
          
          const g = genderRaw.toLowerCase().trim();
          
          // Entiende cualquier variante
          if (g === 'f' || g === 'female' || g === 'girl' || g === 'girls' || g === 'mujer') {
            gender = "F";
          } else {
            // Asumimos Masculino para 'm', 'male', 'boy', 'boys' o vacío
            gender = "M";
          }
          // ---------------------------------------------

          return {
            name: `${pick(r, ["first_name"])} ${pick(r, ["last_name"])}`.trim(),
            status,
            teamLast: pick(r, ["Team (Last Yr)"]),
            teamThis: pick(r, ["Team (This Yr)"]),
            gender, // Aquí ya va limpio como "M" o "F"
            agedOut: isAgedOut
          };
        }));

      } catch (e) {
        console.error("Fetch Error:", e);
        setErr("Failed to load data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeData = kpisGender?.[genderFilter] ?? {
    totalLast: 0, totalThis: 0, net: 0, retained: 0, lost: 0, new: 0, fee: 3000, agedOut: 0
  };

  const agedOut = activeData.agedOut || 0;
  const lostExcludingAgedOut = Math.max(0, activeData.lost - agedOut);
  const retentionPercent = activeData.totalLast > 0 ? Math.round((activeData.retained / activeData.totalLast) * 100) : 0;
  const churnPercent = activeData.totalLast > 0 ? Math.round((lostExcludingAgedOut / activeData.totalLast) * 100) : 0;
  const eligibleBase = activeData.totalLast - agedOut;
  const eligibleRetentionPercent = eligibleBase > 0 ? Math.round((activeData.retained / eligibleBase) * 100) : 0;
  const changePercent = activeData.totalLast > 0 ? Math.round(((activeData.totalThis - activeData.totalLast) / activeData.totalLast) * 100) : 0;

  // FILTERED Programs
  const filteredPrograms = useMemo(() => {
    return programs.map(p => {
      if (genderFilter === 'club') {
        const total = p.retained + p.lost;
        return { ...p, displayRetained: p.retained, displayLost: p.lost, displayRate: total > 0 ? Math.round((p.retained / total) * 100) : 0 };
      } else if (genderFilter === 'boys') {
        const total = p.retained_boys + p.lost_boys;
        return { ...p, displayRetained: p.retained_boys, displayLost: p.lost_boys, displayRate: total > 0 ? Math.round((p.retained_boys / total) * 100) : 0 };
      } else {
        const total = p.retained_girls + p.lost_girls;
        return { ...p, displayRetained: p.retained_girls, displayLost: p.lost_girls, displayRate: total > 0 ? Math.round((p.retained_girls / total) * 100) : 0 };
      }
    }).filter(p => p.displayRetained > 0 || p.displayLost > 0);
  }, [programs, genderFilter]);

  // FILTERED Age Diagnostic - FIXED: Shows different data for boys/girls
  const filteredAgeDiag = useMemo(() => {
    return ageDiag.map(a => {
      if (genderFilter === 'club') {
        return { 
          ...a, 
          displayLast: a.playersLast, 
          displayThis: a.playersThis, 
          displayRate: a.rate 
        };
      } else if (genderFilter === 'boys') {
        return { 
          ...a, 
          displayLast: a.boysLast, 
          displayThis: a.boysThis, 
          displayRate: a.boysRate || (a.boysLast > 0 ? Math.round((Math.min(a.boysThis, a.boysLast) / a.boysLast) * 100) : 0)
        };
      } else {
        return { 
          ...a, 
          displayLast: a.girlsLast, 
          displayThis: a.girlsThis, 
          displayRate: a.girlsRate || (a.girlsLast > 0 ? Math.round((Math.min(a.girlsThis, a.girlsLast) / a.girlsLast) * 100) : 0)
        };
      }
    });
  }, [ageDiag, genderFilter]);

  // Age comparison data - ESTE ES EL NUEVO BLOQUE CORREGIDO
  // FIXED: Age comparison data with proper gender filtering
  const ageComparisonData = useMemo(() => {
  return ageDiag.map(a => {
    let pLast, pThis, displayRate;
    
    if (genderFilter === 'club') {
      pLast = a.playersLast;
      pThis = a.playersThis;
      displayRate = a.rate;
    } else if (genderFilter === 'boys') {
      pLast = a.boysLast;
      pThis = a.boysThis;
      displayRate = a.boysLast > 0 ? Math.round((Math.min(a.boysThis, a.boysLast) / a.boysLast) * 100) : 0;
    } else {
      pLast = a.girlsLast;
      pThis = a.girlsThis;
      displayRate = a.girlsLast > 0 ? Math.round((Math.min(a.girlsThis, a.girlsLast) / a.girlsLast) * 100) : 0;
    }

    return {
      year: a.year,
      playersLast: pLast,
      playersThis: pThis,
      rate: displayRate,
      change: pLast > 0 ? Math.round(((pThis - pLast) / pLast) * 100) : 0,
      risk: a.risk
    };
  }).filter(a => a.playersLast > 0 || a.playersThis > 0);
}, [ageDiag, genderFilter]);

  // Filter teams by gender - FIXED
  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return teams.filter((t) => {
      const matchesSearch = (t.name || "").toLowerCase().includes(q) || (t.coach || "").toLowerCase().includes(q);
      let matchesGender = true;
      if (genderFilter === 'boys') matchesGender = t.gender === 'M';
      else if (genderFilter === 'girls') matchesGender = t.gender === 'F';
      return matchesSearch && matchesGender;
    });
  }, [teams, searchTerm, genderFilter]);

  // Revenue - calculated from filtered teams
  const exactRevenueLost = useMemo(() => {
    return filteredTeams.reduce((total, team) => total + (team.lost * team.fee), 0);
  }, [filteredTeams]);

  const displayRevenueLost = exactRevenueLost > 0 ? exactRevenueLost : (lostExcludingAgedOut * activeData.fee);
  const potentialRecovery = Math.round(displayRevenueLost * 0.3);

  // Gender comparison
  const genderComparisonData = useMemo(() => {
    if (!kpisGender) return [];
    return [
      { name: "Boys", lastYear: kpisGender.boys?.totalLast || 0, thisYear: kpisGender.boys?.totalThis || 0,
        change: kpisGender.boys && kpisGender.boys.totalLast > 0 ? Math.round(((kpisGender.boys.totalThis - kpisGender.boys.totalLast) / kpisGender.boys.totalLast) * 100) : 0 },
      { name: "Girls", lastYear: kpisGender.girls?.totalLast || 0, thisYear: kpisGender.girls?.totalThis || 0,
        change: kpisGender.girls && kpisGender.girls.totalLast > 0 ? Math.round(((kpisGender.girls.totalThis - kpisGender.girls.totalLast) / kpisGender.girls.totalLast) * 100) : 0 }
    ];
  }, [kpisGender]);

  const genderPieData = useMemo(() => {
    if (!kpisGender) return [];
    return [
      { name: "Boys", value: kpisGender.boys?.totalThis || 0, color: "#3b82f6" },
      { name: "Girls", value: kpisGender.girls?.totalThis || 0, color: "#ec4899" }
    ];
  }, [kpisGender]);

  // COACH STATS - FOCUS ON REVENUE LOST ONLY (No positive "saved" metrics)
  const coachStats = useMemo(() => {
    if (filteredTeams.length === 0) return { coaches: [], totalRevenueLost: 0, avgFee: 3000 };
    
    const avgFee = activeData.fee || 3000;
    
    const coachMap = {};
    filteredTeams.forEach(t => {
      const coachName = t.coach || "Unassigned";
      if (!coachMap[coachName]) {
        coachMap[coachName] = { name: coachName, teams: [], totalPlayers: 0, retained: 0, lost: 0, revenueLost: 0 };
      }
      coachMap[coachName].teams.push(t);
      coachMap[coachName].totalPlayers += t.count;
      coachMap[coachName].retained += t.retained;
      coachMap[coachName].lost += t.lost;
      coachMap[coachName].revenueLost += t.lost * t.fee;
    });
    
    // Sort by revenue lost (highest first) - focus on the problem
    const coaches = Object.values(coachMap).map(coach => {
      const total = coach.retained + coach.lost;
      return { 
        ...coach, 
        rate: total > 0 ? Math.round((coach.retained / total) * 100) : 0, 
        churnRate: total > 0 ? Math.round((coach.lost / total) * 100) : 0,
        avgFee
      };
    }).sort((a, b) => b.revenueLost - a.revenueLost);
    
    return {
      coaches,
      totalRevenueLost: coaches.reduce((acc, c) => acc + c.revenueLost, 0),
      avgFee
    };
  }, [filteredTeams, activeData.fee]);

  // Deep Dive
  const deepDiveStats = useMemo(() => {
    if (!selectedEntity.id) return null;
    const relevantTeams = selectedEntity.type === 'coach' 
      ? filteredTeams.filter(t => t.coach === selectedEntity.id)
      : filteredTeams.filter(t => t.name === selectedEntity.id);
    if (relevantTeams.length === 0) return null;
    const totalLost = relevantTeams.reduce((acc, curr) => acc + curr.lost, 0);
    const totalRet = relevantTeams.reduce((acc, curr) => acc + curr.retained, 0);
    const totalCount = relevantTeams.reduce((acc, curr) => acc + curr.count, 0);
    const lostRevenue = relevantTeams.reduce((acc, curr) => acc + (curr.lost * curr.fee), 0);
    return {
      name: selectedEntity.id,
      teams: relevantTeams,
      retentionRate: (totalRet + totalLost) > 0 ? Math.round((totalRet / (totalRet + totalLost)) * 100) : 0,
      totalRetained: totalRet,
      totalLost,
      totalPlayers: totalCount,
      lostRevenue
    };
  }, [selectedEntity, filteredTeams]);

  const uniqueCoaches = useMemo(() => [...new Set(filteredTeams.map(t => t.coach).filter(c => c && c !== "Unassigned"))].sort(), [filteredTeams]);
  const uniqueTeams = useMemo(() => [...new Set(filteredTeams.map(t => t.name))].sort(), [filteredTeams]);

  const handleOpenPlayerList = (filter, title) => {
    let matchedPlayers = typeof filter === 'string' 
      ? playerList.filter(p => p.status === filter)
      : playerList.filter(p => (p.teamLast === filter.team || p.teamThis === filter.team) && p.status === filter.status);
    
    if (filter === 'Lost' || filter.status === 'Lost') matchedPlayers = matchedPlayers.filter(p => !p.agedOut);
    if (genderFilter === 'boys') matchedPlayers = matchedPlayers.filter(p => p.gender === 'M');
    else if (genderFilter === 'girls') matchedPlayers = matchedPlayers.filter(p => p.gender === 'F');

    setModal({
      open: true,
      title,
      players: matchedPlayers.map(p => ({ ...p, team: p.teamLast || p.teamThis, gender: p.gender === 'M' ? 'Boys' : 'Girls' })),
      subtitle: `${genderFilter !== 'club' ? genderFilter.charAt(0).toUpperCase() + genderFilter.slice(1) + ' - ' : ''}${matchedPlayers.length} players`
    });
  };

  const handleExportAll = () => {
    const lostPlayers = playerList.filter(p => p.status === 'Lost' && !p.agedOut).map(p => ({
      Name: p.name, Gender: p.gender === 'M' ? 'Boys' : 'Girls', 'Team (Last Year)': p.teamLast, Status: 'Lost'
    }));
    const retainedPlayers = playerList.filter(p => p.status === 'Retained').map(p => ({
      Name: p.name, Gender: p.gender === 'M' ? 'Boys' : 'Girls', 'Team (Last Year)': p.teamLast, 'Team (This Year)': p.teamThis, Status: 'Retained'
    }));
    const newPlayers = playerList.filter(p => p.status === 'New').map(p => ({
      Name: p.name, Gender: p.gender === 'M' ? 'Boys' : 'Girls', 'Team (This Year)': p.teamThis, Status: 'New'
    }));
    const teamsSummary = filteredTeams.map(t => ({
      Team: t.name, Program: t.program, Coach: t.coach, Gender: t.gender === 'M' ? 'Boys' : 'Girls',
      'Total Players': t.count, Retained: t.retained, Lost: t.lost,
      'Retention Rate': `${(t.retained + t.lost) > 0 ? Math.round((t.retained / (t.retained + t.lost)) * 100) : 0}%`,
      Fee: `$${t.fee}`, 'Revenue Lost': `$${(t.lost * t.fee).toLocaleString()}`
    }));
    exportMultipleSheetsToExcel([
      { data: lostPlayers, name: 'Lost Players' },
      { data: retainedPlayers, name: 'Retained Players' },
      { data: newPlayers, name: 'New Players' },
      { data: teamsSummary, name: 'Teams Summary' }
    ], 'RetainPlayers_Export');
  };

  // Export handlers - FIXED: All export to Excel
  const handleExportTeamsRevenue = () => {
    const data = filteredTeams
      .sort((a, b) => (b.lost * b.fee) - (a.lost * a.fee))
      .map((t, idx) => ({
        'Rank': idx + 1,
        'Team': t.name,
        'Program': t.program,
        'Coach': t.coach,
        'Gender': t.gender === 'M' ? 'Boys' : 'Girls',
        'Players Lost': t.lost,
        'Fee per Player': `$${t.fee.toLocaleString()}`,
        'Revenue Lost': `$${(t.lost * t.fee).toLocaleString()}`
      }));
    exportToExcel(data, 'Teams_Revenue_Lost', 'Revenue Lost');
  };

  const handleExportCoaches = () => {
    const data = coachStats.coaches.map((c, idx) => ({
      'Rank': idx + 1,
      'Coach': c.name,
      'Teams': c.teams.map(t => t.name).join(', '),
      'Total Players': c.totalPlayers,
      'Retained': c.retained,
      'Lost': c.lost,
      'Retention Rate': `${c.rate}%`,
      'Churn Rate': `${c.churnRate}%`,
      'Revenue Lost': `$${c.revenueLost.toLocaleString()}`
    }));
    exportToExcel(data, 'Coach_Revenue_Impact', 'Coaches');
  };

  const handleLogout = () => {
    localStorage.removeItem("rp_authenticated");
    localStorage.removeItem("rp_auth_time");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#0C1B46] p-4 md:p-6 font-sans text-white">
      <PlayerModal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.title} players={modal.players} subtitle={modal.subtitle} />

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#3A7FC3]/30 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src="/logo.png" alt="RetainPlayers" className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'Oswald, sans-serif' }}>
                  RETAIN<span className="text-[#5DB3F5]">PLAYERS</span>
                </h1>
                <span className="text-[#82C3FF] font-bold uppercase tracking-widest text-xs">Retention Intelligence</span>
              </div>
            </div>
            <p className="text-slate-400 mt-1 text-sm">Season: <span className="font-bold text-white">2024-25 vs 2025-26</span></p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <button onClick={handleExportAll} className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors">
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <LogOut size={14} /> Logout
              </button>
            </div>

            <div className="flex bg-[#111827] p-1 rounded-xl border border-slate-700/50">
              {[{ id: "club", label: "Club", icon: ShieldCheck }, { id: "boys", label: "Boys", icon: Users }, { id: "girls", label: "Girls", icon: Award }].map((item) => (
                <button key={item.id} onClick={() => setGenderFilter(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    genderFilter === item.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  }`}>
                  <item.icon size={14} />{item.label}
                </button>
              ))}
            </div>

            <nav className="flex bg-[#111827] rounded-xl p-1 gap-1 border border-slate-700/50 overflow-x-auto">
              {[{ id: "overview", label: "Overview" }, { id: "diagnosis", label: "Diagnosis" }, { id: "financials", label: "Financials" },
                { id: "full-roster", label: "Teams" }, { id: "coaches", label: "Coaches" }, { id: "deep-dive", label: "Deep Dive" }].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab.id ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"
                  }`}>{tab.label}</button>
              ))}
            </nav>
          </div>
        </div>

        {loading && (
          <div className="bg-[#111827] p-6 rounded-2xl text-center border border-slate-700/50 mb-6">
            <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-400 font-medium">Loading data...</p>
          </div>
        )}
        {err && <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-2xl text-center text-rose-400 font-medium mb-6">{err}</div>}

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Scorecard label="2024–25 Players" value={activeData.totalLast.toLocaleString()} sub="Base Year" />
              <Scorecard label="2025–26 Players" value={activeData.totalThis.toLocaleString()} sub="Current Year" colorClass="text-blue-400" />
              <Scorecard label="Net Change" value={activeData.net >= 0 ? `+${activeData.net}` : `${activeData.net}`} 
                sub={`${changePercent >= 0 ? '+' : ''}${changePercent}% year over year`} highlight />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPIBox title="Retained" value={activeData.retained.toLocaleString()} sub="Stayed from last season"
                percent={`${retentionPercent}%`} icon={UserCheck} color="bg-blue-600" trend="up" clickable 
                onClick={() => handleOpenPlayerList({ status: 'Retained' }, 'Retained Players')} />
              <KPIBox title="Lost (Churn)" value={lostExcludingAgedOut.toLocaleString()} sub="Did not return (excl. aged out)"
                percent={`${churnPercent}%`} icon={UserMinus} color="bg-rose-500" trend="down" 
                tooltip="Excludes players who aged out" clickable onClick={() => handleOpenPlayerList({ status: 'Lost' }, 'Lost Players')} />
              <KPIBox title="New Players" value={activeData.new.toLocaleString()} sub="First time this season"
                icon={UserPlus} color="bg-emerald-600" trend="up" clickable onClick={() => handleOpenPlayerList({ status: 'New' }, 'New Players')} />
              <KPIBox title="Eligible Retention" value={`${eligibleRetentionPercent}%`} 
                sub={`Retained ÷ (${activeData.totalLast} - ${agedOut} aged out)`} icon={Target} color="bg-indigo-600" 
                tooltip="Retention rate excluding aged out" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50 lg:col-span-2">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-400" />Retention by Platform
                  {genderFilter !== 'club' && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg ml-2">{genderFilter === 'boys' ? 'Boys' : 'Girls'} only</span>}
                </h4>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredPrograms} margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar yAxisId="left" dataKey="displayRetained" name="Retained" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="displayLost" name="Lost" fill="#475569" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="displayRate" name="Retention %" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: "#10b981" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Users size={18} className="text-pink-400" />Gender Split</h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value">
                        {genderPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {genderComparisonData.map((g, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">{g.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{g.lastYear}</span>
                        <ChevronRight size={12} className="text-slate-600" />
                        <span className={`font-bold ${g.thisYear >= g.lastYear ? 'text-emerald-400' : 'text-rose-400'}`}>{g.thisYear}</span>
                        <span className={`text-xs ${g.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>({g.change >= 0 ? '+' : ''}{g.change}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-rose-500/20 to-rose-600/10 border border-rose-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <AlertTriangle className="text-rose-400" size={24} />
                <div>
                  <p className="text-white font-bold">Churn Alert: {churnPercent}% of players did not return</p>
                  <p className="text-sm text-slate-400">Estimated revenue impact: ${displayRevenueLost.toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setActiveTab('financials')} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 rounded-xl font-bold text-sm text-white transition-all">
                View Financial Impact →
              </button>
            </div>
          </>
        )}

        {/* DIAGNOSIS - FIXED: Different data for Boys/Girls */}
        {activeTab === "diagnosis" && (
          <div className="space-y-6">
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               Retention by Age Group
              {genderFilter !== 'club' && (
              <span className={`text-xs px-2 py-1 rounded-lg ${
               genderFilter === 'boys' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
              }`}>
                {genderFilter === 'boys' ? '♂ Boys' : '♀ Girls'} only
              </span>
                )}
              </h4>
              <p className="text-slate-400 text-sm mb-6">
                {genderFilter === 'club' ? 'Compare player counts year over year by birth year' : 
                 genderFilter === 'boys' ? 'Boys player counts year over year by birth year' : 
                 'Girls player counts year over year by birth year'}
              </p>
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={ageComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Bar yAxisId="left" dataKey="playersLast" name="2024-25" fill="#475569" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="playersThis" name="2025-26" fill={genderFilter === 'girls' ? '#ec4899' : '#3b82f6'} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="rate" name="Retention %" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {ageComparisonData.slice(0, 6).map((a, idx) => (
                <div key={idx} className="bg-[#111827] rounded-xl p-4 text-center border border-slate-700/50">
                  <p className="text-white font-bold text-lg">{a.year}</p>
                  <p className="text-slate-400 text-sm">{a.playersLast} → {a.playersThis}</p>
                  <p className={`text-lg font-bold ${a.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{a.change >= 0 ? '+' : ''}{a.change}%</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl">
                <TrendingDown className="text-rose-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Highest Risk</h5>
                <p className="text-sm text-slate-400">Older birth years (2006-2007) aging out</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                <AlertTriangle className="text-amber-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Watch List</h5>
                <p className="text-sm text-slate-400">2016-2017 showing lower retention</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl">
                <TrendingUp className="text-emerald-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Strongest Cohort</h5>
                <p className="text-sm text-slate-400">2012-2014 maintain 70%+ retention</p>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIALS - Only shows losses, no positive "saved" metrics */}
        {activeTab === "financials" && (
          <div className="space-y-6">
            {/* Header Card: Revenue Lost to Churn */}
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-8 rounded-2xl shadow-lg shadow-rose-500/20">
              <div className="flex items-center gap-5">
                <div className="bg-white/20 p-4 rounded-2xl"><DollarSign size={36} className="text-white" /></div>
                <div>
                  <p className="text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">Revenue Lost to Churn</p>
                  <h3 className="text-5xl font-black text-white">${displayRevenueLost.toLocaleString()}</h3>
                  <p className="text-rose-200 text-sm mt-1">{lostExcludingAgedOut} players × ${activeData.fee.toLocaleString()} avg fee</p>
                </div>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Lost Revenue */}
              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-rose-500/20 rounded-xl"><UserMinus className="text-rose-400" size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Lost Revenue</p>
                    <p className="text-2xl font-black text-rose-400">-${displayRevenueLost.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">From {lostExcludingAgedOut} players who didn't return</p>
              </div>

              {/* Card 2: New Revenue */}
              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl"><UserPlus className="text-emerald-400" size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">New Revenue</p>
                    {/* Aquí usamos el cálculo exacto si está disponible (exactNewRevenue), o el aproximado corregido */}
                    <p className="text-2xl font-black text-emerald-400">
                      +${(typeof exactNewRevenue !== 'undefined' ? exactNewRevenue : Math.round(activeData.new * activeData.fee)).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">From {activeData.new} new players</p>
              </div>

              {/* Card 3: Net Impact */}
              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl"><Target className="text-blue-400" size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Net Impact</p>
                    {(() => {
                      const newRevenue = typeof exactNewRevenue !== 'undefined' ? exactNewRevenue : Math.round(activeData.new * activeData.fee);
                      const netImpact = newRevenue - displayRevenueLost;
                      return (
                        <p className={`text-2xl font-black ${netImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {netImpact >= 0 ? '+' : ''}${netImpact.toLocaleString()}
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <p className="text-sm text-slate-500">New Revenue - Lost Revenue</p>
              </div>
            </div>

            {/* Recovery Opportunity Section */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 rounded-2xl shadow-lg shadow-emerald-500/20">
              <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                <div>
                  <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">Recovery Opportunity</p>
                  <h3 className="text-4xl font-black text-white">${potentialRecovery.toLocaleString()}</h3>
                  <p className="text-emerald-200 text-sm mt-1">Estimated if 30% of churned players return</p>
                </div>
                <div className="bg-white/10 px-5 py-4 rounded-xl border border-white/20">
                  <p className="text-xs font-bold text-emerald-200 uppercase mb-2">Action Items</p>
                  <ul className="text-sm text-white space-y-1">
                    <li>• Contact {Math.round(lostExcludingAgedOut * 0.3)} high-value players</li>
                    <li>• Offer early-bird discount</li>
                    <li>• Survey for churn reasons</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Top Revenue Losses Table */}
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-white">Top Revenue Losses by Team</h4>
                <button 
                  onClick={handleExportTeamsRevenue}
                  className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300 bg-blue-500/10 px-3 py-2 rounded-lg"
                >
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
              </div>
              <div className="space-y-3">
                {filteredTeams
                  .sort((a, b) => (b.lost * b.fee) - (a.lost * a.fee))
                  .slice(0, 5)
                  .map((team, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
                      <div>
                        <p className="font-bold text-white">{team.name}</p>
                        <p className="text-xs text-slate-500">{team.lost} players × ${team.fee}</p>
                      </div>
                      <p className="text-lg font-black text-rose-400">-${(team.lost * team.fee).toLocaleString()}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TEAMS - FIXED: Works with Boys/Girls filter */}
        {activeTab === "full-roster" && (
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h4 className="text-xl font-bold text-white flex items-center gap-2">
                  Current Teams (25/26)
                  {genderFilter !== 'club' && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg">{genderFilter === 'boys' ? 'Boys' : 'Girls'} only</span>}
                </h4>
                <p className="text-slate-400 text-sm">Click on numbers to see player lists • {filteredTeams.length} teams</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="text" placeholder="Search team or coach..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <button 
                  onClick={() => exportToExcel(filteredTeams.map(t => ({ 
                    Team: t.name, Program: t.program, Coach: t.coach, Gender: t.gender === 'M' ? 'Boys' : 'Girls',
                    Players: t.count, Retained: t.retained, Lost: t.lost, 
                    'Retention Rate': `${(t.retained + t.lost) > 0 ? Math.round((t.retained / (t.retained + t.lost)) * 100) : 0}%`, 
                    Fee: `$${t.fee}`, 'Revenue Lost': `$${(t.lost * t.fee).toLocaleString()}` 
                  })), 'Teams_Export', 'Teams')}
                  className="p-2.5 bg-slate-700/50 rounded-lg text-slate-400 hover:text-white"
                >
                  <FileSpreadsheet size={18} />
                </button>
              </div>
            </div>
            
            {filteredTeams.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No teams found for the selected filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Team</th>
                      <th className="pb-3 pr-4">Coach</th>
                      <th className="pb-3 text-center">Players</th>
                      <th className="pb-3 text-center">Retained</th>
                      <th className="pb-3 text-center">Lost</th>
                      <th className="pb-3 text-center">Rate</th>
                      <th className="pb-3 text-right">Revenue Lost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {filteredTeams.map((team, idx) => {
                      const total = team.retained + team.lost;
                      const retRate = total > 0 ? Math.round((team.retained / total) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="font-bold text-white">{team.name}</div>
                            <div className="text-xs text-blue-400">{team.program}</div>
                          </td>
                          <td className="py-4 pr-4 text-slate-400 text-sm">{team.coach || '-'}</td>
                          <td className="py-4 text-center text-slate-400">{team.count}</td>
                          <td className="py-4 text-center">
                            <button onClick={() => handleOpenPlayerList({ team: team.name, status: 'Retained' }, `Retained: ${team.name}`)} className="text-blue-400 font-bold hover:underline">{team.retained}</button>
                          </td>
                          <td className="py-4 text-center">
                            <button onClick={() => handleOpenPlayerList({ team: team.name, status: 'Lost' }, `Lost: ${team.name}`)} className="text-rose-400 font-bold hover:underline">{team.lost}</button>
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${retRate >= 70 ? 'bg-emerald-500/20 text-emerald-400' : retRate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{retRate}%</span>
                          </td>
                          <td className="py-4 text-right font-bold text-rose-400">-${(team.lost * team.fee).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* COACHES - FOCUS ON REVENUE LOST (No positive metrics) */}
        {activeTab === "coaches" && (
          <div className="space-y-6">
            {/* Header Stats - Only showing losses */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-rose-500/10 p-5 rounded-2xl border border-rose-500/30">
                <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Total Revenue Lost</p>
                <p className="text-3xl font-black text-rose-400">${coachStats.totalRevenueLost.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">From all {genderFilter !== 'club' ? genderFilter : ''} coaches</p>
              </div>
              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Players Lost</p>
                <p className="text-3xl font-black text-white">{coachStats.coaches.reduce((acc, c) => acc + c.lost, 0)}</p>
                <p className="text-xs text-slate-500 mt-1">Across all teams</p>
              </div>
              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Fee per Player</p>
                <p className="text-3xl font-black text-white">${coachStats.avgFee.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">Used for revenue calculation</p>
              </div>
            </div>

            {/* Coach Table - Sorted by Revenue Lost */}
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <DollarSign size={20} className="text-rose-400" />
                    Revenue Lost by Coach
                    {genderFilter !== 'club' && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg ml-2">{genderFilter === 'boys' ? 'Boys' : 'Girls'} only</span>}
                  </h4>
                  <p className="text-slate-400 text-sm">Ranked by revenue lost • Click coach name for details</p>
                </div>
                <button 
                  onClick={handleExportCoaches}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                >
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4 w-12">Rank</th>
                      <th className="pb-3 pr-4">Coach</th>
                      <th className="pb-3 text-center">Teams</th>
                      <th className="pb-3 text-center">Players</th>
                      <th className="pb-3 text-center">Retained</th>
                      <th className="pb-3 text-center">Lost</th>
                      <th className="pb-3 text-center">Churn Rate</th>
                      <th className="pb-3 text-right">Revenue Lost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {coachStats.coaches.map((coach, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 pr-4">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-rose-500/20 text-rose-400' : idx < 3 ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-700/50 text-slate-500'}`}>{idx + 1}</span>
                        </td>
                        <td className="py-4 pr-4">
                          <button onClick={() => { setSelectedEntity({ type: 'coach', id: coach.name }); setActiveTab('deep-dive'); }} className="font-bold text-white hover:text-blue-400 transition-colors text-left">{coach.name}</button>
                          <p className="text-xs text-slate-500">{coach.teams.map(t => t.name).join(', ')}</p>
                        </td>
                        <td className="py-4 text-center text-slate-400">{coach.teams.length}</td>
                        <td className="py-4 text-center text-slate-400">{coach.totalPlayers}</td>
                        <td className="py-4 text-center text-blue-400 font-bold">{coach.retained}</td>
                        <td className="py-4 text-center text-rose-400 font-bold">{coach.lost}</td>
                        <td className="py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${coach.churnRate <= 30 ? 'bg-emerald-500/20 text-emerald-400' : coach.churnRate <= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{coach.churnRate}%</span>
                        </td>
                        <td className="py-4 text-right font-bold text-rose-400">-${coach.revenueLost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insight Cards - Focus on problems, not heroes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl">
                <DollarSign className="text-rose-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Revenue Lost = Players Lost × Fee</h5>
                <p className="text-sm text-slate-400">Each lost player represents direct revenue impact. Focus on reducing churn.</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                <AlertTriangle className="text-amber-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">High Churn = Problem</h5>
                <p className="text-sm text-slate-400">Coaches with high churn rates need support, training, or investigation.</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl">
                <Briefcase className="text-blue-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Take Action</h5>
                <p className="text-sm text-slate-400">Survey lost players to understand why they left. Address root causes.</p>
              </div>
            </div>
          </div>
        )}

        {/* DEEP DIVE */}
        {activeTab === "deep-dive" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 bg-[#111827] p-5 rounded-2xl border border-slate-700/50 h-fit">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                Select Focus (25/26 Only)
                {genderFilter !== 'club' && <span className="block text-blue-400 mt-1">{genderFilter === 'boys' ? 'Boys' : 'Girls'} teams only</span>}
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-blue-400 uppercase mb-2 block">By Coach</label>
                  <select onChange={(e) => setSelectedEntity({ type: 'coach', id: e.target.value })} value={selectedEntity.type === 'coach' ? selectedEntity.id : ''}
                    className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="">Select coach...</option>
                    {uniqueCoaches.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="text-center text-slate-600 text-xs font-bold">OR</div>
                <div>
                  <label className="text-xs font-bold text-indigo-400 uppercase mb-2 block">By Team</label>
                  <select onChange={(e) => setSelectedEntity({ type: 'team', id: e.target.value })} value={selectedEntity.type === 'team' ? selectedEntity.id : ''}
                    className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="">Select team...</option>
                    {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {deepDiveStats ? (
                <div className="space-y-4">
                  <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${selectedEntity.type === 'coach' ? 'bg-blue-500/20' : 'bg-indigo-500/20'}`}>
                          {selectedEntity.type === 'coach' ? <Briefcase size={24} className="text-blue-400" /> : <Users size={24} className="text-indigo-400" />}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">{deepDiveStats.name}</h2>
                          <p className="text-slate-500 text-xs font-bold uppercase">{selectedEntity.type} Profile (25/26)</p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Retention</p>
                          <p className={`text-2xl font-black ${deepDiveStats.retentionRate >= 70 ? 'text-emerald-400' : deepDiveStats.retentionRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{deepDiveStats.retentionRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Lost</p>
                          <p className="text-2xl font-black text-rose-400">{deepDiveStats.totalLost}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Revenue Lost</p>
                          <p className="text-2xl font-black text-rose-400">-${deepDiveStats.lostRevenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepDiveStats.teams.map((t, idx) => {
                      const total = t.retained + t.lost;
                      const teamRetRate = total > 0 ? Math.round((t.retained / total) * 100) : 0;
                      return (
                        <div key={idx} className="p-5 bg-[#111827] rounded-2xl border border-slate-700/50">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-bold text-white">{t.name}</p>
                              <p className="text-xs text-slate-500">{t.program}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${teamRetRate >= 70 ? 'bg-emerald-500/20 text-emerald-400' : teamRetRate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{teamRetRate}%</span>
                          </div>
                          <div className="flex gap-3 mb-4">
                            <div className="flex-1 bg-slate-800/50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-slate-500">Players</p>
                              <p className="font-bold text-white">{t.count}</p>
                            </div>
                            <div className="flex-1 bg-blue-500/10 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-blue-400">Retained</p>
                              <p className="font-bold text-blue-400">{t.retained}</p>
                            </div>
                            <div className="flex-1 bg-rose-500/10 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-rose-400">Lost</p>
                              <p className="font-bold text-rose-400">{t.lost}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleOpenPlayerList({ team: t.name, status: 'Retained' }, `Retained: ${t.name}`)} className="flex-1 text-xs bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg font-bold hover:bg-blue-500/30 transition-colors">View Retained</button>
                            <button onClick={() => handleOpenPlayerList({ team: t.name, status: 'Lost' }, `Lost: ${t.name}`)} className="flex-1 text-xs bg-rose-500/20 text-rose-400 px-3 py-2 rounded-lg font-bold hover:bg-rose-500/30 transition-colors">View Lost</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[350px] flex items-center justify-center bg-[#070D1F] border border-[#3A7FC3]/30 rounded-2xl">
                  <div className="text-center text-slate-500">
                    <Search size={36} className="mx-auto mb-3 text-[#3A7FC3]" />
                    <p>Select a Coach or Team to analyze</p>
                    <p className="text-xs mt-2">Only showing 25/26 season data</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-10 py-6 border-t border-[#3A7FC3]/30 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RetainPlayers" className="w-6 h-6" />
            <p>RetainPlayers • Player Retention Intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#5DB3F5] animate-pulse"></div>
            <span>Live Data</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

