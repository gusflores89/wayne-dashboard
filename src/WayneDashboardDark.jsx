import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  UserMinus, TrendingUp, Award, Search, ShieldCheck,
  ClipboardList, Briefcase, ChevronRight, DollarSign, X, Users, Target,
  AlertTriangle, TrendingDown, UserPlus, UserCheck, LogOut, Info, FileSpreadsheet,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import * as XLSX from 'xlsx';

/* -------------------------------------------------------------------------- */
/* CONFIGURATION                                                              */
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

// --- GLOBAL COLORS ---
const COLORS = {
  CLUB: "#3A7FC3", // Azul institucional
  BOYS: "#3b82f6", // Azul vibrante
  GIRLS: "#ec4899", // Rosa vibrante
  LOST: "#f43f5e", // Rojo rosado
  GREEN_LINE: "#10b981", // Verde para tasas
  NEW: "#10b981",   // Emerald para nuevos
  GROWTH: "#10b981",
  RISK: "#f43f5e"
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
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

function exportToExcel(data, filename, sheetName = "Data") {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length + 2, ...data.map(row => String(row[key] || '').length + 2))
    }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); 
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error("Export error:", error);
    alert("Error exporting file. Please try again.");
  }
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

const PlayerModal = ({ isOpen, onClose, title, players, subtitle }) => {
  if (!isOpen) return null;
  const handleExport = () => {
    exportToExcel(players.map(p => ({
      Name: p.name,
      Status: p.status,
      Team: p.team || p.teamLast || '',
      Gender: p.gender === 'M' ? 'Boys' : 'Girls',
      Program: p.program || '',
      Fee: p.fee
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
          <button onClick={onClose} className="p-2 hover:bg-[#3A7FC3]/20 rounded-lg transition-colors text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {players.length === 0 ? <p className="text-center text-slate-500 text-sm py-8">No players found.</p> : (
            <ul className="space-y-2">
              {players.map((p, i) => (
                <li key={i} className="flex items-center justify-between p-3 bg-[#0C1B46] rounded-xl border border-[#3A7FC3]/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      p.status === 'Lost' ? 'bg-rose-500/20 text-rose-400' : p.status === 'New' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#3A7FC3]/20 text-[#5DB3F5]'
                    }`}>{p.name ? p.name.charAt(0).toUpperCase() : '?'}</div>
                    <div>
                      <span className="font-medium text-white text-sm">{p.name}</span>
                      {p.team && <span className="block text-xs text-slate-500">{p.team}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.gender && <span className={`text-xs px-2 py-0.5 rounded ${p.gender === 'M' ? 'bg-[#3A7FC3]/20 text-[#5DB3F5]' : 'bg-pink-500/20 text-pink-400'}`}>{p.gender === 'M' ? '♂' : '♀'}</span>}
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${p.status === 'Lost' ? 'bg-rose-500/20 text-rose-400' : p.status === 'New' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#3A7FC3]/20 text-[#5DB3F5]'}`}>{p.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 bg-[#0C1B46] border-t border-[#3A7FC3]/30 flex justify-between items-center">
          <button onClick={handleExport} className="text-xs font-bold text-[#5DB3F5] hover:text-[#82C3FF] flex items-center gap-1"><FileSpreadsheet size={14} /> Export Excel</button>
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white">Close</button>
        </div>
      </div>
    </div>
  );
};

const Scorecard = ({ label, value, sub, highlight, colorClass = "" }) => (
  <div className={`p-6 rounded-2xl flex flex-col justify-center transition-all duration-300 border ${
    highlight ? "bg-gradient-to-br from-[#3A7FC3] to-[#2F6DB3] border-[#5DB3F5]/50 shadow-lg shadow-[#3A7FC3]/20" : "bg-[#070D1F] border-[#3A7FC3]/30"
  }`}>
    <span className={`text-xs font-bold uppercase tracking-wider mb-2 ${highlight ? "text-[#D2E6F5]" : "text-slate-500"}`}>{label}</span>
    <span className={`text-4xl font-black leading-none ${highlight ? "text-white" : colorClass || "text-white"}`}>{value}</span>
    <span className={`text-xs font-medium mt-2 ${highlight ? "text-[#D2E6F5]" : "text-slate-500"}`}>{sub}</span>
  </div>
);

const KPIBox = ({ title, value, sub, percent, icon: Icon, color, trend, onClick, clickable, tooltip }) => (
  <div className={`bg-[#070D1F] p-5 rounded-2xl border border-[#3A7FC3]/30 flex flex-col justify-between ${clickable ? "cursor-pointer hover:border-[#5DB3F5]/50 transition-all" : ""}`} onClick={clickable ? onClick : undefined}>
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-20`}><Icon size={20} className={color.replace('bg-', 'text-').replace('-600', '-400').replace('-500', '-400')} /></div>
      <div className="flex items-center gap-2">
        {tooltip && <div className="group relative"><Info size={14} className="text-slate-500 cursor-help" /><div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-[#070D1F] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-[#3A7FC3]/50 pointer-events-none">{tooltip}</div></div>}
        {percent && <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${trend === "up" ? "bg-emerald-500/20 text-emerald-400" : trend === "down" ? "bg-rose-500/20 text-rose-400" : "bg-slate-700 text-slate-400"}`}>{percent}</span>}
      </div>
    </div>
    <div className="mt-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-white">{value}</h3>
      <p className={`text-xs mt-1 font-medium ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-slate-500"}`}>{sub}</p>
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
/* MAIN COMPONENT                                                             */
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
  const [teams, setTeams] = useState([]);
  const [playerList, setPlayerList] = useState([]);

  const activeColor = genderFilter === 'boys' ? COLORS.BOYS : genderFilter === 'girls' ? COLORS.GIRLS : COLORS.CLUB;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const responses = await Promise.all([
          fetch(URLS.KPIS_GENDER).then(res => res.text()),
          fetch(URLS.TEAMS).then(res => res.text()),
          fetch(URLS.PLAYERS).then(res => res.text()),
        ]);

        const [kpiText, teamText, playerText] = responses;

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

        // Teams
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
        }).filter(t => !t.name.toLowerCase().includes("goalkeeper")));

        // Players
        const playerRows = rowsToObjects(parseCSV(playerText));
        setPlayerList(playerRows.map(r => {
          let status = pick(r, ["status"]) || "Unknown";
          const agedOutVal = pick(r, ["aged_out"]);
          const isAgedOut = agedOutVal === 'Y' || agedOutVal === 'Yes';
          
          let genderRaw = pick(r, ["gender"]) || "";
          let gender = "M"; 
          const g = genderRaw.toLowerCase().trim();
          if (g === 'f' || g === 'female' || g === 'girl' || g === 'girls' || g === 'mujer') gender = "F";
          else gender = "M";

          const birthYear = pick(r, ["birth_year", "Age Group (Last Yr)"]) || "";
          const program = pick(r, ["program_this", "Program (This Yr)", "program"]) || pick(r, ["program_last", "Program (Last Yr)"]) || "Unknown";

          return {
            name: `${pick(r, ["first_name"])} ${pick(r, ["last_name"])}`.trim(),
            status,
            teamLast: pick(r, ["Team (Last Yr)"]),
            teamThis: pick(r, ["Team (This Yr)"]),
            gender,
            agedOut: isAgedOut,
            birthYear: birthYear.replace(/[^0-9]/g, ''), 
            program,
            fee: toNumber(pick(r, ["fee_this", "fee", "Fee"])) || 0 
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
  const eligibleRetentionPercent = (activeData.totalLast - agedOut) > 0 ? Math.round((activeData.retained / (activeData.totalLast - agedOut)) * 100) : 0;
  const changePercent = activeData.totalLast > 0 ? Math.round(((activeData.totalThis - activeData.totalLast) / activeData.totalLast) * 100) : 0;

  // --- DYNAMIC CALCULATIONS ---

  const filteredPrograms = useMemo(() => {
    const stats = {};
    playerList.forEach(p => {
        if (genderFilter === 'boys' && p.gender !== 'M') return;
        if (genderFilter === 'girls' && p.gender !== 'F') return;
        
        const prog = p.program || "Unknown";
        if (!stats[prog]) stats[prog] = { retained: 0, lost: 0 };
        
        if (p.status === 'Retained') stats[prog].retained += 1;
        if (p.status === 'Lost' && !p.agedOut) stats[prog].lost += 1;
    });

    return Object.keys(stats).map(name => {
      const { retained, lost } = stats[name];
      const total = retained + lost;
      return {
        name,
        displayRetained: retained,
        displayLost: lost,
        displayRate: total > 0 ? Math.round((retained / total) * 100) : 0
      };
    }).filter(p => p.displayRetained > 0 || p.displayLost > 0).sort((a, b) => b.displayRetained - a.displayRetained);
  }, [playerList, genderFilter]);

  // 2. Retention by AGE (FIXED SORT ORDER: 2005 -> 2020)
  const ageComparisonData = useMemo(() => {
    const stats = {};
    playerList.forEach(p => {
      if (genderFilter === 'boys' && p.gender !== 'M') return;
      if (genderFilter === 'girls' && p.gender !== 'F') return;
      if (!p.birthYear) return;

      const year = p.birthYear;
      if (!stats[year]) stats[year] = { last: 0, this: 0, retained: 0 };
      
      if (p.teamLast) stats[year].last += 1;
      if (p.teamThis) stats[year].this += 1;
      if (p.status === 'Retained') stats[year].retained += 1;
    });

    return Object.keys(stats).map(year => {
      const s = stats[year];
      return {
        year,
        playersLast: s.last,
        playersThis: s.this,
        rate: s.last > 0 ? Math.round((s.retained / s.last) * 100) : 0,
        change: s.last > 0 ? Math.round(((s.this - s.last) / s.last) * 100) : 0
      };
    })
    .sort((a, b) => Number(a.year) - Number(b.year)) // FIXED: Ascending Order
    .filter(a => a.playersLast > 0 || a.playersThis > 0);
  }, [playerList, genderFilter]);

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

  const exactRevenueLost = useMemo(() => {
    const lostP = playerList.filter(p => p.status === 'Lost' && !p.agedOut);
    const genderLost = lostP.filter(p => {
        if (genderFilter === 'boys') return p.gender === 'M';
        if (genderFilter === 'girls') return p.gender === 'F';
        return true;
    });
    return genderLost.reduce((total, p) => total + (p.fee > 0 ? p.fee : activeData.fee), 0);
  }, [playerList, genderFilter, activeData.fee]);

  const exactNewRevenue = useMemo(() => {
    const newP = playerList.filter(p => p.status === 'New');
    const genderNew = newP.filter(p => {
        if (genderFilter === 'boys') return p.gender === 'M';
        if (genderFilter === 'girls') return p.gender === 'F';
        return true;
    });
    return genderNew.reduce((total, p) => total + (p.fee > 0 ? p.fee : activeData.fee), 0);
  }, [playerList, genderFilter, activeData.fee]);

  const netImpact = exactNewRevenue - exactRevenueLost;
  const potentialRecovery = Math.round(exactRevenueLost * 0.3);

  const genderPieData = useMemo(() => {
    if (!kpisGender) return [];
    return [
      { name: "Boys", value: kpisGender.boys?.totalThis || 0, color: COLORS.BOYS },
      { name: "Girls", value: kpisGender.girls?.totalThis || 0, color: COLORS.GIRLS }
    ];
  }, [kpisGender]);

  const coachStats = useMemo(() => {
    if (filteredTeams.length === 0) return { coaches: [], totalRevenueLost: 0, avgFee: 3000 };
    const avgFee = activeData.fee || 3000;
    const coachMap = {};
    filteredTeams.forEach(t => {
      const coachName = t.coach || "Unassigned";
      if (!coachMap[coachName]) coachMap[coachName] = { name: coachName, teams: [], totalPlayers: 0, retained: 0, lost: 0, revenueLost: 0 };
      coachMap[coachName].teams.push(t);
      coachMap[coachName].totalPlayers += t.count;
      coachMap[coachName].retained += t.retained;
      coachMap[coachName].lost += t.lost;
      coachMap[coachName].revenueLost += t.lost * t.fee;
    });
    const coaches = Object.values(coachMap).map(c => ({ 
      ...c, 
      rate: (c.retained + c.lost) > 0 ? Math.round((c.retained / (c.retained + c.lost)) * 100) : 0, 
      churnRate: (c.retained + c.lost) > 0 ? Math.round((c.lost / (c.retained + c.lost)) * 100) : 0,
      avgFee
    })).sort((a, b) => b.revenueLost - a.revenueLost);
    return { coaches, totalRevenueLost: coaches.reduce((acc, c) => acc + c.revenueLost, 0), avgFee };
  }, [filteredTeams, activeData.fee]);

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
    const calculatedNew = Math.max(0, totalCount - totalRet);

    return {
      name: selectedEntity.id,
      teams: relevantTeams,
      retentionRate: (totalRet + totalLost) > 0 ? Math.round((totalRet / (totalRet + totalLost)) * 100) : 0,
      totalRetained: totalRet,
      totalLost,
      totalPlayers: totalCount,
      totalNew: calculatedNew,
      lostRevenue
    };
  }, [selectedEntity, filteredTeams]);

  const uniqueCoaches = useMemo(() => [...new Set(filteredTeams.map(t => t.coach).filter(c => c && c !== "Unassigned"))].sort(), [filteredTeams]);
  const uniqueTeams = useMemo(() => [...new Set(filteredTeams.map(t => t.name))].sort(), [filteredTeams]);

  // --- ACTIONS ---

  const handleOpenPlayerList = (filter, title) => {
    let matchedPlayers = playerList;

    if (filter.status) matchedPlayers = matchedPlayers.filter(p => p.status === filter.status);
    if (filter.team) matchedPlayers = matchedPlayers.filter(p => p.teamLast === filter.team || p.teamThis === filter.team);
    if (filter.status === 'Lost') matchedPlayers = matchedPlayers.filter(p => !p.agedOut);

    if (genderFilter === 'boys') matchedPlayers = matchedPlayers.filter(p => p.gender === 'M');
    else if (genderFilter === 'girls') matchedPlayers = matchedPlayers.filter(p => p.gender === 'F');

    setModal({
      open: true,
      title,
      players: matchedPlayers.map(p => ({ ...p, team: p.teamLast || p.teamThis })),
      subtitle: `${genderFilter !== 'club' ? genderFilter.charAt(0).toUpperCase() + genderFilter.slice(1) + ' - ' : ''}${matchedPlayers.length} players`
    });
  };

  const handleExportLostOnly = () => {
    const lostPlayers = playerList.filter(p => p.status === 'Lost' && !p.agedOut).map(p => ({
      Name: p.name, 
      Gender: p.gender === 'M' ? 'Boys' : 'Girls', 
      'Team (Last Year)': p.teamLast, 
      'Program': p.program,
      Status: 'Lost',
      'Fee': p.fee
    }));
    exportToExcel(lostPlayers, 'RetainPlayers_LOST_ONLY', 'Lost Players');
  };

  const handleExportTeamsRevenue = () => {
    const data = filteredTeams.sort((a, b) => (b.lost * b.fee) - (a.lost * a.fee)).map((t, idx) => ({
      'Rank': idx + 1,
      'Team': t.name,
      'Program': t.program,
      'Coach': t.coach,
      'Players Lost': t.lost,
      'Revenue Lost': `$${(t.lost * t.fee).toLocaleString()}`
    }));
    exportToExcel(data, 'Teams_Revenue_Lost', 'Revenue Lost');
  };

  const handleExportCoaches = () => {
    const data = coachStats.coaches.map((c, idx) => ({
      'Rank': idx + 1,
      'Coach': c.name,
      'Teams': c.teams.map(t => t.name).join(', '),
      'Players Lost': c.lost,
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
              <button onClick={handleExportLostOnly} className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors">
                <FileSpreadsheet size={14} /> Export Lost Players
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

        {loading && <div className="text-center p-12 text-slate-400">Loading data...</div>}
        {err && <div className="text-center p-12 text-rose-400">{err}</div>}

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
                  <ClipboardList size={18} className="text-blue-400" />Retention by Program
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
                      <Bar yAxisId="left" dataKey="displayRetained" name="Retained" fill={activeColor} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="displayLost" name="Lost" fill={COLORS.LOST} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="displayRate" name="Retention %" stroke={COLORS.GREEN_LINE} strokeWidth={3} dot={{ r: 5, fill: COLORS.GREEN_LINE }} />
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
              </div>
            </div>
          </>
        )}

        {/* DIAGNOSIS */}
        {activeTab === "diagnosis" && (
          <div className="space-y-6">
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                Retention by Age Group
                {genderFilter !== 'club' && <span className={`text-xs px-2 py-1 rounded-lg ml-2 ${genderFilter === 'boys' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>{genderFilter === 'boys' ? 'Boys' : 'Girls'} only</span>}
              </h4>
              <p className="text-slate-400 text-sm mb-6">Compare player counts year over year by birth year</p>
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
                    <Bar yAxisId="left" dataKey="playersThis" name="2025-26" fill={activeColor} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="rate" name="Retention %" stroke={COLORS.GREEN_LINE} strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Positive Growth Groups */}
              <div>
                <h5 className="text-emerald-400 font-bold mb-3 flex items-center gap-2"><ArrowUpRight size={20}/> Growth Leaders (Positive Change)</h5>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {ageComparisonData.filter(a => a.change > 0).map((a, idx) => (
                    <div key={idx} className="bg-[#111827] rounded-xl p-4 text-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                      <p className="text-white font-bold text-lg">{a.year}</p>
                      <p className="text-slate-400 text-xs">{a.playersLast} → {a.playersThis}</p>
                      <p className="text-xl font-black text-emerald-400">+{a.change}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Negative Growth Groups */}
              <div>
                <h5 className="text-rose-400 font-bold mb-3 flex items-center gap-2"><ArrowDownRight size={20}/> Risk Groups (Negative Change)</h5>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {ageComparisonData.filter(a => a.change < 0).map((a, idx) => (
                    <div key={idx} className="bg-[#111827] rounded-xl p-4 text-center border border-rose-500/30 shadow-lg shadow-rose-500/10">
                      <p className="text-white font-bold text-lg">{a.year}</p>
                      <p className="text-slate-400 text-xs">{a.playersLast} → {a.playersThis}</p>
                      <p className="text-xl font-black text-rose-400">{a.change}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIALS */}
        {activeTab === "financials" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-8 rounded-2xl shadow-lg shadow-rose-500/20">
              <div className="flex items-center gap-5">
                <div className="bg-white/20 p-4 rounded-2xl"><DollarSign size={36} className="text-white" /></div>
                <div>
                  <p className="text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">Revenue Lost to Churn</p>
                  <h3 className="text-5xl font-black text-white">${exactRevenueLost.toLocaleString()}</h3>
                  <p className="text-rose-200 text-sm mt-1">Based on actual fee per lost player</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-rose-500/20 rounded-xl"><UserMinus className="text-rose-400" size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Lost Revenue</p>
                    <p className="text-2xl font-black text-rose-400">-${exactRevenueLost.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Revenue from players who didn't return</p>
              </div>

              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl"><UserPlus className="text-emerald-400" size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">New Revenue</p>
                    <p className="text-2xl font-black text-emerald-400">+${exactNewRevenue.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Revenue from {activeData.new} new players</p>
              </div>

              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl"><Target className="text-blue-400" size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Net Impact</p>
                    <p className={`text-2xl font-black ${netImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {netImpact >= 0 ? '+' : ''}${netImpact.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">New Revenue - Lost Revenue</p>
              </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-white">Top Revenue Losses by Team</h4>
                <button onClick={handleExportTeamsRevenue} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300 bg-blue-500/10 px-3 py-2 rounded-lg"><FileSpreadsheet size={14} /> Export Excel</button>
              </div>
              <div className="space-y-3">
                {filteredTeams.sort((a, b) => (b.lost * b.fee) - (a.lost * a.fee)).slice(0, 5).map((team, idx) => (
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

        {/* TEAMS */}
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
                <button onClick={() => exportToExcel(filteredTeams, 'Teams_Export')} className="p-2.5 bg-slate-700/50 rounded-lg text-slate-400 hover:text-white"><FileSpreadsheet size={18} /></button>
              </div>
            </div>
            
            {filteredTeams.length === 0 ? <div className="text-center py-12 text-slate-500"><Users size={48} className="mx-auto mb-4 opacity-50" /><p>No teams found</p></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Team</th>
                      <th className="pb-3 pr-4">Coach</th>
                      <th className="pb-3 text-center">Players</th>
                      <th className="pb-3 text-center">Retained</th>
                      <th className="pb-3 text-center text-emerald-400">New</th>
                      <th className="pb-3 text-center">Lost</th>
                      <th className="pb-3 text-center">Rate</th>
                      <th className="pb-3 text-right">Revenue Lost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {filteredTeams.map((team, idx) => {
                      const total = team.retained + team.lost;
                      const retRate = total > 0 ? Math.round((team.retained / total) * 100) : 0;
                      // Calculate New: Current Count - Retained
                      const newCount = Math.max(0, team.count - team.retained);
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 pr-4"><div className="font-bold text-white">{team.name}</div><div className="text-xs text-blue-400">{team.program}</div></td>
                          <td className="py-4 pr-4 text-slate-400 text-sm">{team.coach || '-'}</td>
                          <td className="py-4 text-center text-slate-400">{team.count}</td>
                          <td className="py-4 text-center"><button onClick={() => handleOpenPlayerList({ team: team.name, status: 'Retained' }, `Retained: ${team.name}`)} className="text-blue-400 font-bold hover:underline">{team.retained}</button></td>
                          <td className="py-4 text-center text-emerald-400 font-bold">{newCount}</td>
                          <td className="py-4 text-center"><button onClick={() => handleOpenPlayerList({ team: team.name, status: 'Lost' }, `Lost: ${team.name}`)} className="text-rose-400 font-bold hover:underline">{team.lost}</button></td>
                          <td className="py-4 text-center"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${retRate >= 70 ? 'bg-emerald-500/20 text-emerald-400' : retRate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{retRate}%</span></td>
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

        {/* COACHES */}
        {activeTab === "coaches" && (
          <div className="space-y-6">
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

            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-white flex items-center gap-2"><DollarSign size={20} className="text-rose-400" /> Revenue Lost by Coach</h4>
                <button onClick={handleExportCoaches} className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"><FileSpreadsheet size={14} /> Export Excel</button>
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
                        <td className="py-4 pr-4"><span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${idx < 3 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700/50 text-slate-500'}`}>{idx + 1}</span></td>
                        <td className="py-4 pr-4">
                          <button onClick={() => { setSelectedEntity({ type: 'coach', id: coach.name }); setActiveTab('deep-dive'); }} className="font-bold text-white hover:text-blue-400 transition-colors text-left">{coach.name}</button>
                          <p className="text-xs text-slate-500">{coach.teams.map(t => t.name).join(', ')}</p>
                        </td>
                        <td className="py-4 text-center text-slate-400">{coach.teams.length}</td>
                        <td className="py-4 text-center text-slate-400">{coach.totalPlayers}</td>
                        <td className="py-4 text-center text-blue-400 font-bold">{coach.retained}</td>
                        <td className="py-4 text-center text-rose-400 font-bold">{coach.lost}</td>
                        <td className="py-4 text-center"><span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${coach.churnRate <= 30 ? 'bg-emerald-500/20 text-emerald-400' : coach.churnRate <= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{coach.churnRate}%</span></td>
                        <td className="py-4 text-right font-bold text-rose-400">-${coach.revenueLost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DEEP DIVE (Punto 11: Columnas agregadas) */}
        {activeTab === "deep-dive" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 bg-[#111827] p-5 rounded-2xl border border-slate-700/50 h-fit">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Select Focus</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-blue-400 uppercase mb-2 block">By Coach</label>
                  <select onChange={(e) => setSelectedEntity({ type: 'coach', id: e.target.value })} value={selectedEntity.type === 'coach' ? selectedEntity.id : ''} className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="">Select coach...</option>
                    {uniqueCoaches.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-indigo-400 uppercase mb-2 block">By Team</label>
                  <select onChange={(e) => setSelectedEntity({ type: 'team', id: e.target.value })} value={selectedEntity.type === 'team' ? selectedEntity.id : ''} className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
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
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${selectedEntity.type === 'coach' ? 'bg-blue-500/20' : 'bg-indigo-500/20'}`}>{selectedEntity.type === 'coach' ? <Briefcase size={24} className="text-blue-400" /> : <Users size={24} className="text-indigo-400" />}</div>
                        <div><h2 className="text-xl font-bold text-white">{deepDiveStats.name}</h2><p className="text-slate-500 text-xs font-bold uppercase">{selectedEntity.type} Profile</p></div>
                      </div>
                      <div className="flex gap-6 text-center">
                        <div><p className="text-xs text-slate-500 font-bold uppercase mb-1">Retention</p><p className="text-2xl font-black text-emerald-400">{deepDiveStats.retentionRate}%</p></div>
                        <div><p className="text-xs text-slate-500 font-bold uppercase mb-1">New</p><p className="text-2xl font-black text-emerald-400">+{deepDiveStats.totalNew}</p></div>
                        <div><p className="text-xs text-slate-500 font-bold uppercase mb-1">Lost</p><p className="text-2xl font-black text-rose-400">{deepDiveStats.totalLost}</p></div>
                        <div><p className="text-xs text-slate-500 font-bold uppercase mb-1">Rev. Lost</p><p className="text-2xl font-black text-rose-400">-${deepDiveStats.lostRevenue.toLocaleString()}</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepDiveStats.teams.map((t, idx) => {
                      const calculatedNew = Math.max(0, t.count - t.retained);
                      return (
                      <div key={idx} className="p-5 bg-[#111827] rounded-2xl border border-slate-700/50">
                        <div className="flex justify-between items-start mb-4">
                          <div><p className="font-bold text-white">{t.name}</p><p className="text-xs text-slate-500">{t.program}</p></div>
                        </div>
                        <div className="flex gap-3 mb-4 text-center">
                           <div className="flex-1 bg-slate-800/50 rounded p-2"><p className="text-xs text-slate-500">Retained</p><p className="font-bold text-blue-400">{t.retained}</p></div>
                           <div className="flex-1 bg-slate-800/50 rounded p-2"><p className="text-xs text-slate-500">New</p><p className="font-bold text-emerald-400">+{calculatedNew}</p></div>
                           <div className="flex-1 bg-slate-800/50 rounded p-2"><p className="text-xs text-slate-500">Lost</p><p className="font-bold text-rose-400">{t.lost}</p></div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenPlayerList({ team: t.name, status: 'Retained' }, `Retained: ${t.name}`)} className="flex-1 text-xs bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg font-bold">View Retained</button>
                          <button onClick={() => handleOpenPlayerList({ team: t.name, status: 'Lost' }, `Lost: ${t.name}`)} className="flex-1 text-xs bg-rose-500/20 text-rose-400 px-3 py-2 rounded-lg font-bold">View Lost</button>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              ) : <div className="text-center py-12 text-slate-500"><p>Select an entity to view details</p></div>}
            </div>
          </div>
        )}

        <footer className="mt-10 py-6 border-t border-[#3A7FC3]/30 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2"><img src="/logo.png" alt="RetainPlayers" className="w-6 h-6" /><p>RetainPlayers • Player Retention Intelligence</p></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#5DB3F5] animate-pulse"></div><span>Live Data</span></div>
        </footer>
      </div>
    </div>
  );
}