import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Area, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  UserMinus, RefreshCcw, TrendingUp, Award, Search, ShieldCheck,
  GraduationCap, ClipboardList, Briefcase, ChevronRight, DollarSign, X, Users, Target,
  AlertTriangle, TrendingDown, UserPlus, UserCheck, LogOut
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* CONFIGURACIÓN: VARIABLES DE ENTORNO PARA GOOGLE SHEETS (CSV)               */
/* -------------------------------------------------------------------------- */

const getEnvVar = (key) => {
  try {
    return import.meta.env[key] || "";
  } catch (e) {
    return "";
  }
};

const URLS = {
  KPIS: getEnvVar("VITE_SHEET_KPIS_CSV"),
  KPIS_GENDER: getEnvVar("VITE_SHEET_KPIS_GENDER_CSV"),
  PROGRAMS: getEnvVar("VITE_SHEET_PROGRAMS_CSV"),
  AGE: getEnvVar("VITE_SHEET_AGE_CSV"),
  TEAMS: getEnvVar("VITE_SHEET_TEAMS_CSV"),
  PLAYERS: getEnvVar("VITE_SHEET_PLAYERS_CSV")
};

/* -------------------------------------------------------------------------- */
/* DARK MODE COLOR PALETTE                                                    */
/* -------------------------------------------------------------------------- */
const COLORS = {
  bg: {
    primary: "#0a1628",
    secondary: "#111827",
    tertiary: "#1e293b",
    card: "#111827",
  },
  border: {
    primary: "rgba(51, 65, 85, 0.5)",
    light: "rgba(71, 85, 105, 0.3)",
  },
  accent: {
    blue: "#3b82f6",
    green: "#10b981",
    red: "#ef4444",
    amber: "#f59e0b",
    indigo: "#6366f1",
    pink: "#ec4899",
  },
  text: {
    primary: "#ffffff",
    secondary: "#94a3b8",
    muted: "#64748b",
  }
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
  if (n > 10000) return Math.round(n / 1000000);
  return n;
}

/* -------------------------------------------------------------------------- */
/* COMPONENTES VISUALES - DARK MODE                                           */
/* -------------------------------------------------------------------------- */

// Modal para ver lista de jugadores
const PlayerModal = ({ isOpen, onClose, title, players, subtitle }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-700/50">
        <div className="p-5 border-b border-slate-700/50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-lg">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle || `${players.length} players`}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {players.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">No players found.</p>
          ) : (
            <ul className="space-y-2">
              {players.map((p, i) => (
                <li key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                      p.status === 'Lost' ? 'bg-rose-500/20 text-rose-400' : 
                      p.status === 'New' ? 'bg-emerald-500/20 text-emerald-400' : 
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <span className="font-medium text-white text-sm">{p.name}</span>
                      {p.team && <span className="block text-xs text-slate-500">{p.team}</span>}
                    </div>
                  </div>
                  {p.status && (
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                      p.status === 'Lost' ? 'bg-rose-500/20 text-rose-400' : 
                      p.status === 'New' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.status === 'Retained' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {p.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 bg-slate-800/30 text-center border-t border-slate-700/50">
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Scorecard principal
const Scorecard = ({ label, value, sub, highlight, colorClass = "", onClick, clickable }) => (
  <div 
    className={`p-6 rounded-2xl flex flex-col justify-center transition-all duration-300 border ${
      highlight 
        ? "bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500/50 shadow-lg shadow-blue-500/20" 
        : "bg-[#111827] border-slate-700/50"
    } ${clickable ? "cursor-pointer hover:border-blue-500/50" : ""}`}
    onClick={clickable ? onClick : undefined}
  >
    <span className={`text-xs font-bold uppercase tracking-wider mb-2 ${highlight ? "text-blue-200" : "text-slate-500"}`}>
      {label}
    </span>
    <span className={`text-4xl font-black leading-none ${highlight ? "text-white" : colorClass || "text-white"}`}>
      {value}
    </span>
    <span className={`text-xs font-medium mt-2 ${highlight ? "text-blue-200" : "text-slate-500"}`}>
      {sub}
    </span>
  </div>
);

// KPI Box
const KPIBox = ({ title, value, sub, percent, icon: Icon, color, trend, onClick, clickable }) => (
  <div 
    className={`bg-[#111827] p-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between ${
      clickable ? "cursor-pointer hover:border-blue-500/50 transition-all" : ""
    }`}
    onClick={clickable ? onClick : undefined}
  >
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-20`}>
        <Icon size={20} className={color.replace('bg-', 'text-').replace('-600', '-400').replace('-500', '-400')} />
      </div>
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
    <div className="mt-4">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-white">{value}</h3>
      <p className={`text-xs mt-1 font-medium ${
        trend === "up" ? "text-emerald-400" : 
        trend === "down" ? "text-rose-400" : 
        "text-slate-500"
      }`}>
        {sub}
      </p>
    </div>
    {clickable && (
      <p className="text-xs mt-3 text-blue-400 font-medium">Click for details →</p>
    )}
  </div>
);

// Chart colors
const GENDER_COLORS = {
  boys: "#3b82f6",
  girls: "#ec4899",
  unknown: "#64748b"
};

// Custom Tooltip for dark mode
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e293b] border border-slate-600/50 rounded-xl p-3 shadow-xl">
        <p className="text-white font-bold text-sm mb-1">{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="text-sm" style={{ color: item.color }}>
            {item.name}: {typeof item.value === 'number' && item.name?.includes('%') 
              ? `${item.value}%` 
              : item.value?.toLocaleString?.() || item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/* COMPONENTE PRINCIPAL                                                       */
/* -------------------------------------------------------------------------- */

export default function WayneDashboard({ onLogout }) {
  // Estados de navegación
  const [activeTab, setActiveTab] = useState("overview");
  const [genderFilter, setGenderFilter] = useState("club");
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState({ open: false, title: "", players: [], subtitle: "" });
  const [selectedEntity, setSelectedEntity] = useState({ type: 'coach', id: '' });
  
  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [kpisGender, setKpisGender] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [ageDiag, setAgeDiag] = useState([]);
  const [teams, setTeams] = useState([]);
  const [playerList, setPlayerList] = useState([]);

  // Cargar datos
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (!URLS.KPIS_GENDER) {
          console.log("No ENV variables found. Using Demo Data.");
          setKpisGender({
            club: { totalLast: 601, totalThis: 545, net: -56, retained: 338, lost: 263, new: 207, fee: 3000, revenueLost: 789000, agedOut: 46 },
            boys: { totalLast: 350, totalThis: 320, net: -30, retained: 200, lost: 150, new: 120, fee: 3000, revenueLost: 450000, agedOut: 25 },
            girls: { totalLast: 251, totalThis: 225, net: -26, retained: 138, lost: 113, new: 87, fee: 3000, revenueLost: 339000, agedOut: 21 }
          });
          setPrograms([
            { name: "Academy", retained: 120, lost: 30, retentionRate: 80 },
            { name: "Rec League", retained: 100, lost: 80, retentionRate: 56 },
            { name: "Travel", retained: 80, lost: 40, retentionRate: 67 },
            { name: "Development", retained: 38, lost: 113, retentionRate: 25 }
          ]);
          setAgeDiag([
            { year: "U6", rate: 45, eligibleRate: 52, players: 80 },
            { year: "U8", rate: 55, eligibleRate: 62, players: 95 },
            { year: "U10", rate: 65, eligibleRate: 70, players: 110 },
            { year: "U12", rate: 60, eligibleRate: 68, players: 100 },
            { year: "U14", rate: 50, eligibleRate: 58, players: 85 },
            { year: "U16", rate: 40, eligibleRate: 48, players: 70 },
            { year: "U18", rate: 30, eligibleRate: 35, players: 61 }
          ]);
          setTeams([
            { name: "U10 Boys Red", program: "Travel", coach: "John Smith", lastYear: 15, retained: 12, lost: 3, gender: "boys", fee: 3500 },
            { name: "U12 Girls Blue", program: "Travel", coach: "Sarah Jones", lastYear: 14, retained: 10, lost: 4, gender: "girls", fee: 3500 },
          ]);
          setPlayerList([
            { name: "Alex Johnson", status: "Retained", teamLast: "U10 Boys Red", teamThis: "U12 Boys Red", gender: "M" },
            { name: "Emma Wilson", status: "Lost", teamLast: "U10 Girls White", teamThis: "", gender: "F" },
          ]);
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

        // 1. KPIs por Género
        const kpiRows = rowsToObjects(parseCSV(kpiText));
        const kpiMap = {};
        kpiRows.forEach(r => {
          const key = (pick(r, ["Segment", "segment"]) || "club").toLowerCase();
          kpiMap[key] = {
            totalLast: toNumber(pick(r, ["Total 24/25", "totalLastYear"])),
            totalThis: toNumber(pick(r, ["Total 25/26", "totalThisYear"])),
            net: toNumber(pick(r, ["Net Change", "netChange", "Churn"])),
            retained: toNumber(pick(r, ["Retained", "retained"])),
            lost: toNumber(pick(r, ["Lost", "lost"])),
            new: toNumber(pick(r, ["New", "new"])),
            fee: toNumber(pick(r, ["Avg Fee", "avgFee"])) || 3000,
            revenueLost: toNumber(pick(r, ["Revenue Lost", "revenueLost"])),
            agedOut: toNumber(pick(r, ["Aged Out", "agedOut"])) || 0
          };
        });
        setKpisGender(kpiMap);

        // 2. Programs
        const progRows = rowsToObjects(parseCSV(progText));
        setPrograms(progRows.map(r => {
          const retained = toNumber(pick(r, ["retained", "Retained"]));
          const lost = toNumber(pick(r, ["lost", "Lost"]));
          const total = retained + lost;
          return {
            name: pick(r, ["name", "Name"]),
            retained,
            lost,
            retentionRate: total > 0 ? Math.round((retained / total) * 100) : 0
          };
        }));

        // 3. Age Diagnostic
        const ageRows = rowsToObjects(parseCSV(ageText));
        setAgeDiag(ageRows.map(r => ({
          year: pick(r, ["year", "Year"]),
          rate: normalizePercent(pick(r, ["rate", "Rate"])),
          eligibleRate: normalizePercent(pick(r, ["eligibleRate", "EligibleRate"])),
          players: toNumber(pick(r, ["players", "Players"]))
        })));

        // 4. Teams
        const teamRows = rowsToObjects(parseCSV(teamText));
        setTeams(teamRows.map(r => ({
          name: pick(r, ["name", "Team", "Team (Last Yr)"]),
          program: pick(r, ["program", "Program"]),
          coach: pick(r, ["coach", "Coach"]) || "Unassigned",
          lastYear: toNumber(pick(r, ["count", "Players Last Yr", "lastYear"])),
          retained: toNumber(pick(r, ["retained", "Retained"])),
          lost: toNumber(pick(r, ["lost", "Lost"])),
          gender: (pick(r, ["name", "Team"]) || "").toLowerCase().includes("girls") ? "girls" : "boys",
          fee: toNumber(pick(r, ["Fee", "fee", "Cost", "cost", "Price"])) || 3000
        })));

        // 5. Players Master
        const playerRows = rowsToObjects(parseCSV(playerText));
        setPlayerList(playerRows.map(r => {
          const regLast = pick(r, ["Registered Last Yr (Y/N)", "Registered Last Yr"]);
          const regThis = pick(r, ["Registered This Yr (Y/N)", "Registered This Yr"]);
          let status = "Unknown";
          if (regLast === 'Y' && regThis === 'Y') status = "Retained";
          else if (regLast === 'Y' && regThis !== 'Y') status = "Lost";
          else if (regLast !== 'Y' && regThis === 'Y') status = "New";

          return {
            name: `${pick(r, ["first_name", "First Name"])} ${pick(r, ["last_name", "Last Name"])}`.trim(),
            status,
            teamLast: pick(r, ["Team (Last Yr)", "team_last"]),
            teamThis: pick(r, ["Team (This Yr)", "team_this"]),
            gender: pick(r, ["gender", "Gender"]),
            coach: pick(r, ["coach", "Coach"])
          };
        }));

      } catch (e) {
        console.error("Fetch Error:", e);
        setErr("Failed to load data. Check your Google Sheets URLs.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Datos activos según filtro
  const activeData = kpisGender?.[genderFilter] ?? {
    totalLast: 0, totalThis: 0, net: 0, retained: 0, lost: 0, new: 0, fee: 3000, revenueLost: 0, agedOut: 0
  };

  // Calcular porcentajes
  const retentionPercent = activeData.totalLast > 0 
    ? Math.round((activeData.retained / activeData.totalLast) * 100) 
    : 0;
  
  const churnPercent = activeData.totalLast > 0 
    ? Math.round((activeData.lost / activeData.totalLast) * 100) 
    : 0;

  const eligibleBase = activeData.totalLast - (activeData.agedOut || 0);
  const eligibleRetentionPercent = eligibleBase > 0 
    ? Math.round((activeData.retained / eligibleBase) * 100) 
    : 0;

  // Revenue
  const exactRevenueLost = useMemo(() => {
    if (teams.length === 0) return 0;
    const relevantTeams = teams.filter(t => {
      if (genderFilter === 'club') return true;
      return t.gender === genderFilter;
    });
    return relevantTeams.reduce((total, team) => total + (team.lost * team.fee), 0);
  }, [teams, genderFilter]);

  const displayRevenueLost = exactRevenueLost > 0 ? exactRevenueLost : (activeData.lost * activeData.fee);
  const potentialRecovery = Math.round(displayRevenueLost * 0.3);

  // Filtrar equipos
  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return teams.filter((t) => {
      const matchesSearch = (t.name || "").toLowerCase().includes(q) || (t.coach || "").toLowerCase().includes(q);
      const matchesGender = genderFilter === "club" || (t.gender && t.gender.toLowerCase() === genderFilter);
      return matchesSearch && matchesGender;
    });
  }, [teams, searchTerm, genderFilter]);

  // Pie chart data
  const genderPieData = useMemo(() => {
    if (!kpisGender) return [];
    const boys = kpisGender.boys?.totalThis || 0;
    const girls = kpisGender.girls?.totalThis || 0;
    return [
      { name: "Boys", value: boys, color: GENDER_COLORS.boys },
      { name: "Girls", value: girls, color: GENDER_COLORS.girls }
    ];
  }, [kpisGender]);

  const genderComparisonData = useMemo(() => {
    if (!kpisGender) return [];
    return [
      { name: "Boys", lastYear: kpisGender.boys?.totalLast || 0, thisYear: kpisGender.boys?.totalThis || 0 },
      { name: "Girls", lastYear: kpisGender.girls?.totalLast || 0, thisYear: kpisGender.girls?.totalThis || 0 }
    ];
  }, [kpisGender]);

  // Deep Dive
  const deepDiveStats = useMemo(() => {
    if (!selectedEntity.id) return null;
    
    if (selectedEntity.type === 'coach') {
      const coachTeams = teams.filter(t => t.coach === selectedEntity.id);
      if (coachTeams.length === 0) return null;
      const totalLost = coachTeams.reduce((acc, curr) => acc + curr.lost, 0);
      const totalRet = coachTeams.reduce((acc, curr) => acc + curr.retained, 0);
      const totalLast = coachTeams.reduce((acc, curr) => acc + curr.lastYear, 0);
      const lostRevenue = coachTeams.reduce((acc, curr) => acc + (curr.lost * curr.fee), 0);
      return {
        name: selectedEntity.id,
        teams: coachTeams,
        retentionRate: totalLast > 0 ? Math.round((totalRet / totalLast) * 100) : 0,
        totalRetained: totalRet,
        totalLost,
        totalPlayers: totalLast,
        lostRevenue
      };
    } else {
      const team = teams.find(t => t.name === selectedEntity.id);
      return team ? {
        name: team.name,
        teams: [team],
        retentionRate: team.lastYear > 0 ? Math.round((team.retained / team.lastYear) * 100) : 0,
        totalRetained: team.retained,
        totalLost: team.lost,
        totalPlayers: team.lastYear,
        lostRevenue: team.lost * team.fee
      } : null;
    }
  }, [selectedEntity, teams]);

  const uniqueCoaches = useMemo(() => [...new Set(teams.map(t => t.coach).filter(c => c && c !== "Unassigned"))].sort(), [teams]);
  const uniqueTeams = useMemo(() => [...new Set(teams.map(t => t.name))].sort(), [teams]);

  // Modal handler
  const handleOpenPlayerList = (filter, title) => {
    let matchedPlayers = [];
    
    if (typeof filter === 'string') {
      matchedPlayers = playerList.filter(p => p.status === filter);
    } else if (filter.team && filter.status) {
      matchedPlayers = playerList.filter(p => {
        const teamMatch = p.teamLast === filter.team || p.teamThis === filter.team;
        const statusMatch = p.status === filter.status;
        return teamMatch && statusMatch;
      });
    } else if (filter.status) {
      matchedPlayers = playerList.filter(p => p.status === filter.status);
    }

    if (genderFilter !== 'club') {
      const genderCode = genderFilter === 'boys' ? 'M' : 'F';
      matchedPlayers = matchedPlayers.filter(p => 
        p.gender?.toUpperCase() === genderCode || 
        p.gender?.toLowerCase() === genderFilter ||
        p.gender?.toLowerCase() === 'boys' ||
        p.gender?.toLowerCase() === 'girls'
      );
    }

    setModal({
      open: true,
      title,
      players: matchedPlayers.map(p => ({ ...p, team: p.teamLast || p.teamThis })),
      subtitle: `${genderFilter !== 'club' ? genderFilter.charAt(0).toUpperCase() + genderFilter.slice(1) + ' - ' : ''}${matchedPlayers.length} players`
    });
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("rp_authenticated");
    localStorage.removeItem("rp_auth_time");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#0a1628] p-4 md:p-6 font-sans text-white">
      {/* Modal */}
      <PlayerModal 
        isOpen={modal.open} 
        onClose={() => setModal({ ...modal, open: false })} 
        title={modal.title} 
        players={modal.players}
        subtitle={modal.subtitle}
      />

      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-700/50 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-blue-400" />
              <span className="text-blue-400 font-bold uppercase tracking-widest text-xs">Retention Intelligence</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Retain<span className="text-blue-400">Players</span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Season: <span className="font-bold text-white">2024-25 vs 2025-26</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={14} />
              Logout
            </button>

            {/* Gender Filter */}
            <div className="flex bg-[#111827] p-1 rounded-xl border border-slate-700/50">
              {[
                { id: "club", label: "Club", icon: ShieldCheck },
                { id: "boys", label: "Boys", icon: Users },
                { id: "girls", label: "Girls", icon: Award }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setGenderFilter(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    genderFilter === item.id 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <nav className="flex bg-[#111827] rounded-xl p-1 gap-1 border border-slate-700/50">
              {[
                { id: "overview", label: "Overview" },
                { id: "diagnosis", label: "Diagnosis" },
                { id: "financials", label: "Financials" },
                { id: "full-roster", label: "Teams" },
                { id: "deep-dive", label: "Deep Dive" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab.id 
                      ? "bg-slate-700 text-white" 
                      : "text-slate-500 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="bg-[#111827] p-6 rounded-2xl text-center border border-slate-700/50 mb-6">
            <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-400 font-medium">Loading data from Google Sheets...</p>
          </div>
        )}
        {err && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-2xl text-center text-rose-400 font-medium mb-6">
            {err}
          </div>
        )}

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === "overview" && (
          <>
            {/* Top Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Scorecard label="2024–25 Players" value={activeData.totalLast.toLocaleString()} sub="Base Year" />
              <Scorecard label="2025–26 Players" value={activeData.totalThis.toLocaleString()} sub="Current Year" colorClass="text-blue-400" />
              <Scorecard label="Net Change" value={activeData.net >= 0 ? `+${activeData.net}` : `${activeData.net}`} sub={`${churnPercent}% churn rate`} highlight />
            </div>

            {/* KPI Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPIBox 
                title="Retained" value={activeData.retained.toLocaleString()} sub="Stayed from last season"
                percent={`${retentionPercent}%`} icon={UserCheck} color="bg-blue-600" trend="up"
                clickable onClick={() => handleOpenPlayerList({ status: 'Retained' }, 'Retained Players')}
              />
              <KPIBox 
                title="Lost (Churn)" value={activeData.lost.toLocaleString()} sub="Did not return"
                percent={`${churnPercent}%`} icon={UserMinus} color="bg-rose-500" trend="down"
                clickable onClick={() => handleOpenPlayerList({ status: 'Lost' }, 'Lost Players')}
              />
              <KPIBox 
                title="New Players" value={activeData.new.toLocaleString()} sub="First time this season"
                icon={UserPlus} color="bg-emerald-600" trend="up"
                clickable onClick={() => handleOpenPlayerList({ status: 'New' }, 'New Players')}
              />
              <KPIBox 
                title="Eligible Retention" value={`${eligibleRetentionPercent}%`} 
                sub={`Excl. ${activeData.agedOut || 0} aged out`}
                icon={Target} color="bg-indigo-600"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Retention by Program */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50 lg:col-span-2">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-400" />
                  Retention by Program
                </h4>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={programs} margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar yAxisId="left" dataKey="retained" name="Retained" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="lost" name="Lost" fill="#475569" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="retentionRate" name="Retention %" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: "#10b981" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gender Split */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Users size={18} className="text-pink-400" />
                  Gender Split
                </h4>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderPieData}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {genderPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
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
                        <span className={`font-bold ${g.thisYear >= g.lastYear ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {g.thisYear}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Alert Banner */}
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

        {/* ==================== DIAGNOSIS TAB ==================== */}
        {activeTab === "diagnosis" && (
          <div className="space-y-6">
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <h4 className="text-xl font-bold text-white mb-2">Retention by Age Group</h4>
              <p className="text-slate-400 text-sm mb-6">Identify which birth years have the highest churn risk</p>
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={ageDiag}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Area yAxisId="left" type="monotone" dataKey="eligibleRate" name="Eligible %" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="rate" name="Gross %" stroke="#64748b" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4 }} />
                    <Bar yAxisId="right" dataKey="players" name="Players" fill="#475569" barSize={16} radius={[4, 4, 0, 0]} opacity={0.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl">
                <TrendingDown className="text-rose-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Highest Risk</h5>
                <p className="text-sm text-slate-400">Older birth years (2006-2007) show lowest retention</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                <AlertTriangle className="text-amber-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Transition Points</h5>
                <p className="text-sm text-slate-400">Watch for drop-off in 2016-2017 birth years</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl">
                <TrendingUp className="text-emerald-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Strongest Cohort</h5>
                <p className="text-sm text-slate-400">2012-2014 birth years maintain 70%+ retention</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== FINANCIALS TAB ==================== */}
        {activeTab === "financials" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-8 rounded-2xl shadow-lg shadow-rose-500/20">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 p-4 rounded-2xl">
                    <DollarSign size={36} className="text-white" />
                  </div>
                  <div>
                    <p className="text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">Revenue Lost to Churn</p>
                    <h3 className="text-5xl font-black text-white">${displayRevenueLost.toLocaleString()}</h3>
                    <p className="text-rose-200 text-sm mt-1">{activeData.lost} players × ${activeData.fee.toLocaleString()} avg fee</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-rose-500/20 rounded-xl">
                    <UserMinus className="text-rose-400" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Lost Revenue</p>
                    <p className="text-2xl font-black text-rose-400">-${displayRevenueLost.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">From {activeData.lost} players who didn't return</p>
              </div>

              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                    <UserPlus className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">New Revenue</p>
                    <p className="text-2xl font-black text-emerald-400">+${(activeData.new * activeData.fee).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">From {activeData.new} new players</p>
              </div>

              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl">
                    <Target className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Net Impact</p>
                    <p className={`text-2xl font-black ${activeData.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeData.net >= 0 ? '+' : ''}${(activeData.net * activeData.fee).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Net change of {activeData.net} players</p>
              </div>
            </div>

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
                    <li>• Contact {Math.round(activeData.lost * 0.3)} high-value players</li>
                    <li>• Offer early-bird discount</li>
                    <li>• Survey for churn reasons</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <h4 className="text-lg font-bold text-white mb-4">Top Revenue Losses by Team</h4>
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

        {/* ==================== FULL ROSTER TAB ==================== */}
        {activeTab === "full-roster" && (
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h4 className="text-xl font-bold text-white">Team Roster</h4>
                <p className="text-slate-400 text-sm">Click on numbers to see player lists</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Search team or coach..."
                  className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4">Team</th>
                    <th className="pb-3 pr-4">Coach</th>
                    <th className="pb-3 text-center">Last Yr</th>
                    <th className="pb-3 text-center">Retained</th>
                    <th className="pb-3 text-center">Lost</th>
                    <th className="pb-3 text-center">Rate</th>
                    <th className="pb-3 text-right">Revenue Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filteredTeams.map((team, idx) => {
                    const retRate = team.lastYear > 0 ? Math.round((team.retained / team.lastYear) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="font-bold text-white">{team.name}</div>
                          <div className="text-xs text-blue-400">{team.program}</div>
                        </td>
                        <td className="py-4 pr-4 text-slate-400 text-sm">{team.coach || '-'}</td>
                        <td className="py-4 text-center text-slate-400">{team.lastYear}</td>
                        <td className="py-4 text-center">
                          <button 
                            onClick={() => handleOpenPlayerList({ team: team.name, status: 'Retained' }, `Retained: ${team.name}`)}
                            className="text-blue-400 font-bold hover:underline"
                          >
                            {team.retained}
                          </button>
                        </td>
                        <td className="py-4 text-center">
                          <button 
                            onClick={() => handleOpenPlayerList({ team: team.name, status: 'Lost' }, `Lost: ${team.name}`)}
                            className="text-rose-400 font-bold hover:underline"
                          >
                            {team.lost}
                          </button>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            retRate >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                            retRate >= 50 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-rose-500/20 text-rose-400'
                          }`}>
                            {retRate}%
                          </span>
                        </td>
                        <td className="py-4 text-right font-bold text-rose-400">
                          -${(team.lost * team.fee).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== DEEP DIVE TAB ==================== */}
        {activeTab === "deep-dive" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 bg-[#111827] p-5 rounded-2xl border border-slate-700/50 h-fit">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Select Focus</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-blue-400 uppercase mb-2 block">By Coach</label>
                  <select 
                    className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    onChange={(e) => setSelectedEntity({ type: 'coach', id: e.target.value })}
                    value={selectedEntity.type === 'coach' ? selectedEntity.id : ''}
                  >
                    <option value="">Select coach...</option>
                    {uniqueCoaches.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="text-center text-slate-600 text-xs font-bold">OR</div>
                <div>
                  <label className="text-xs font-bold text-indigo-400 uppercase mb-2 block">By Team</label>
                  <select 
                    className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    onChange={(e) => setSelectedEntity({ type: 'team', id: e.target.value })}
                    value={selectedEntity.type === 'team' ? selectedEntity.id : ''}
                  >
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
                          <p className="text-slate-500 text-xs font-bold uppercase">{selectedEntity.type} Profile</p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Retention</p>
                          <p className={`text-2xl font-black ${deepDiveStats.retentionRate >= 70 ? 'text-emerald-400' : deepDiveStats.retentionRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {deepDiveStats.retentionRate}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Lost</p>
                          <p className="text-2xl font-black text-rose-400">{deepDiveStats.totalLost}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Impact</p>
                          <p className="text-2xl font-black text-rose-400">-${deepDiveStats.lostRevenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepDiveStats.teams.map((t, idx) => {
                      const teamRetRate = t.lastYear > 0 ? Math.round((t.retained / t.lastYear) * 100) : 0;
                      return (
                        <div key={idx} className="p-5 bg-[#111827] rounded-2xl border border-slate-700/50">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-bold text-white">{t.name}</p>
                              <p className="text-xs text-slate-500">{t.program}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                              teamRetRate >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                              teamRetRate >= 50 ? 'bg-amber-500/20 text-amber-400' :
                              'bg-rose-500/20 text-rose-400'
                            }`}>
                              {teamRetRate}%
                            </span>
                          </div>
                          <div className="flex gap-3 mb-4">
                            <div className="flex-1 bg-slate-800/50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-slate-500">Last Yr</p>
                              <p className="font-bold text-white">{t.lastYear}</p>
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
                            <button 
                              onClick={() => handleOpenPlayerList({ team: t.name, status: 'Retained' }, `Retained: ${t.name}`)}
                              className="flex-1 text-xs bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg font-bold hover:bg-blue-500/30 transition-colors"
                            >
                              View Retained
                            </button>
                            <button 
                              onClick={() => handleOpenPlayerList({ team: t.name, status: 'Lost' }, `Lost: ${t.name}`)}
                              className="flex-1 text-xs bg-rose-500/20 text-rose-400 px-3 py-2 rounded-lg font-bold hover:bg-rose-500/30 transition-colors"
                            >
                              View Lost
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[350px] flex items-center justify-center bg-[#111827] border border-slate-700/50 rounded-2xl">
                  <div className="text-center text-slate-500">
                    <Search size={36} className="mx-auto mb-3 text-slate-600" />
                    <p>Select a Coach or Team to analyze</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-10 py-6 border-t border-slate-700/50 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>RetainPlayers • Player Retention Intelligence</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>Live Data</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
