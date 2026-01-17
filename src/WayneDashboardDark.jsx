import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Area, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  UserMinus, TrendingUp, Award, Search, ShieldCheck,
  ClipboardList, Briefcase, ChevronRight, DollarSign, X, Users, Target,
  AlertTriangle, TrendingDown, UserPlus, UserCheck, LogOut, Download, Info
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* BRAND COLORS - RetainPlayers                                                */
/* Add to index.html: <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet"> */
/* -------------------------------------------------------------------------- */
const BRAND = {
  primary: '#5DB3F5',      // Light blue - main accent
  secondary: '#3A7FC3',    // Medium blue - buttons, links
  dark: '#2F6DB3',         // Dark blue - text highlights
  accent: '#4491D3',       // Secondary elements
  highlight: '#82C3FF',    // Highlights
  pale: '#D2E6F5',         // Light backgrounds
  bgDark: '#0C1B46',       // Main background
  bgDarker: '#070D1F',     // Darker background (cards)
};

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
  KPIS: getEnvVar("VITE_SHEET_KPIS_CSV"),
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
  if (n > 10000) return Math.round(n / 1000000);
  return n;
}

function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                  */
/* -------------------------------------------------------------------------- */

// Player Modal
const PlayerModal = ({ isOpen, onClose, title, players, subtitle }) => {
  if (!isOpen) return null;
  
  const handleExport = () => {
    exportToCSV(players.map(p => ({
      Name: p.name,
      Status: p.status,
      Team: p.team || p.teamLast || '',
      Gender: p.gender || ''
    })), title.replace(/[^a-zA-Z0-9]/g, '_'));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#070D1F] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#3A7FC3]/50">
        <div className="p-5 border-b border-[#3A7FC3]/30 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-lg">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle || `${players.length} players`}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-[#3A7FC3]/20 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
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
                    {p.status && (
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                        p.status === 'Lost' ? 'bg-rose-500/20 text-rose-400' : 
                        p.status === 'New' ? 'bg-emerald-500/20 text-emerald-400' :
                        p.status === 'Retained' ? 'bg-[#3A7FC3]/20 text-[#5DB3F5]' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {p.status}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 bg-[#0C1B46] border-t border-[#3A7FC3]/30 flex justify-between items-center">
          <button 
            onClick={handleExport}
            className="text-xs font-bold text-[#5DB3F5] hover:text-[#82C3FF] flex items-center gap-1"
          >
            <Download size={14} /> Export CSV
          </button>
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Scorecard
const Scorecard = ({ label, value, sub, highlight, colorClass = "", onClick, clickable }) => (
  <div 
    className={`p-6 rounded-2xl flex flex-col justify-center transition-all duration-300 border ${
      highlight 
        ? "bg-gradient-to-br from-[#3A7FC3] to-[#2F6DB3] border-[#5DB3F5]/50 shadow-lg shadow-[#3A7FC3]/20" 
        : "bg-[#070D1F] border-[#3A7FC3]/30"
    } ${clickable ? "cursor-pointer hover:border-[#5DB3F5]/50" : ""}`}
    onClick={clickable ? onClick : undefined}
  >
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

// KPI Box
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
        trend === "up" ? "text-emerald-400" : 
        trend === "down" ? "text-rose-400" : 
        "text-slate-500"
      }`}>
        {sub}
      </p>
    </div>
    {clickable && (
      <p className="text-xs mt-3 text-[#5DB3F5] font-medium">Click for details →</p>
    )}
  </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#070D1F] border border-[#3A7FC3]/50 rounded-xl p-3 shadow-xl">
        <p className="text-white font-bold text-sm mb-1">{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="text-sm" style={{ color: item.color }}>
            {item.name}: {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            {item.name?.toLowerCase().includes('%') || item.name?.toLowerCase().includes('rate') ? '%' : ''}
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

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (!URLS.KPIS_GENDER) {
          console.log("No ENV variables found. Using Demo Data.");
          setKpisGender({
            club: { totalLast: 601, totalThis: 545, net: -56, retained: 338, lost: 263, new: 207, fee: 3000, agedOut: 46 },
            boys: { totalLast: 400, totalThis: 365, net: -35, retained: 230, lost: 170, new: 135, fee: 3000, agedOut: 30 },
            girls: { totalLast: 201, totalThis: 180, net: -21, retained: 108, lost: 93, new: 72, fee: 3000, agedOut: 16 }
          });
          setPrograms([
            { name: "MLS Next", retained: 168, lost: 119, retentionRate: 59, lastYear: 287, thisYear: 240 },
            { name: "Academy", retained: 120, lost: 92, retentionRate: 57, lastYear: 212, thisYear: 180 },
            { name: "NPL/Pre-NPL", retained: 45, lost: 47, retentionRate: 49, lastYear: 92, thisYear: 78 },
            { name: "Early Dev", retained: 26, lost: 31, retentionRate: 46, lastYear: 57, thisYear: 47 }
          ]);
          setAgeDiag([
            { year: "2012", playersLast: 75, playersThis: 68, retained: 49, rate: 72, boysLast: 45, boysThis: 40, girlsLast: 30, girlsThis: 28 },
            { year: "2013", playersLast: 82, playersThis: 76, retained: 56, rate: 74, boysLast: 50, boysThis: 46, girlsLast: 32, girlsThis: 30 },
            { year: "2014", playersLast: 70, playersThis: 63, retained: 49, rate: 78, boysLast: 42, boysThis: 38, girlsLast: 28, girlsThis: 25 },
            { year: "2015", playersLast: 40, playersThis: 35, retained: 25, rate: 71, boysLast: 24, boysThis: 21, girlsLast: 16, girlsThis: 14 },
            { year: "2016", playersLast: 42, playersThis: 37, retained: 20, rate: 54, boysLast: 25, boysThis: 22, girlsLast: 17, girlsThis: 15 },
            { year: "2017", playersLast: 32, playersThis: 28, retained: 12, rate: 43, boysLast: 19, boysThis: 17, girlsLast: 13, girlsThis: 11 },
          ]);
          setTeams([
            { name: "2012 MLS", program: "MLS Next", coach: "Coach A", lastYear: 16, retained: 12, lost: 4, gender: "boys", fee: 3500 },
            { name: "2012 Girls Academy", program: "Academy", coach: "Coach B", lastYear: 14, retained: 9, lost: 5, gender: "girls", fee: 2800 },
            { name: "2013 MLS", program: "MLS Next", coach: "Coach C", lastYear: 15, retained: 11, lost: 4, gender: "boys", fee: 3500 },
            { name: "2013 Girls MLS", program: "MLS Next", coach: "Coach D", lastYear: 12, retained: 8, lost: 4, gender: "girls", fee: 3500 },
          ]);
          setPlayerList([
            { name: "Alex Johnson", status: "Retained", teamLast: "2012 MLS", teamThis: "2012 MLS", gender: "Boys", agedOut: false },
            { name: "Emma Wilson", status: "Lost", teamLast: "2013 Girls MLS", teamThis: "", gender: "Girls", agedOut: false },
            { name: "Mike Smith", status: "Lost", teamLast: "2006 MLS", teamThis: "", gender: "Boys", agedOut: true },
            { name: "Sarah Davis", status: "New", teamLast: "", teamThis: "2014 Academy", gender: "Girls", agedOut: false },
            { name: "John Doe", status: "Retained", teamLast: "2012 MLS", teamThis: "2012 MLS", gender: "Boys", agedOut: false },
            { name: "Jane Smith", status: "Lost", teamLast: "2012 Girls Academy", teamThis: "", gender: "Girls", agedOut: false },
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

        // KPIs by Gender
        const kpiRows = rowsToObjects(parseCSV(kpiText));
        const kpiMap = {};
        kpiRows.forEach(r => {
          const key = (pick(r, ["Segment", "segment"]) || "club").toLowerCase();
          kpiMap[key] = {
            totalLast: toNumber(pick(r, ["Total 24/25", "totalLastYear"])),
            totalThis: toNumber(pick(r, ["Total 25/26", "totalThisYear"])),
            net: toNumber(pick(r, ["Net Change", "netChange"])),
            retained: toNumber(pick(r, ["Retained", "retained"])),
            lost: toNumber(pick(r, ["Lost", "lost"])),
            new: toNumber(pick(r, ["New", "new"])),
            fee: toNumber(pick(r, ["Avg Fee", "avgFee"])) || 3000,
            agedOut: toNumber(pick(r, ["Aged Out", "agedOut"])) || 0
          };
        });
        setKpisGender(kpiMap);

        // Programs
        const progRows = rowsToObjects(parseCSV(progText));
        setPrograms(progRows.map(r => {
          const retained = toNumber(pick(r, ["retained", "Retained"]));
          const lost = toNumber(pick(r, ["lost", "Lost"]));
          const total = retained + lost;
          return {
            name: pick(r, ["name", "Name"]),
            retained,
            lost,
            retentionRate: total > 0 ? Math.round((retained / total) * 100) : 0,
            lastYear: toNumber(pick(r, ["lastYear", "Last Year"])) || total,
            thisYear: toNumber(pick(r, ["thisYear", "This Year"])) || retained
          };
        }));

        // Age Diagnostic
        const ageRows = rowsToObjects(parseCSV(ageText));
        setAgeDiag(ageRows.map(r => ({
          year: pick(r, ["year", "Year"]),
          rate: normalizePercent(pick(r, ["rate", "Rate"])),
          playersLast: toNumber(pick(r, ["playersLast", "Players Last"])) || toNumber(pick(r, ["players", "Players"])),
          playersThis: toNumber(pick(r, ["playersThis", "Players This"])) || toNumber(pick(r, ["players", "Players"])),
          retained: toNumber(pick(r, ["retained", "Retained"])),
          boysLast: toNumber(pick(r, ["boysLast", "Boys Last"])),
          boysThis: toNumber(pick(r, ["boysThis", "Boys This"])),
          girlsLast: toNumber(pick(r, ["girlsLast", "Girls Last"])),
          girlsThis: toNumber(pick(r, ["girlsThis", "Girls This"]))
        })));

        // Teams
        const teamRows = rowsToObjects(parseCSV(teamText));
        setTeams(teamRows.map(r => {
          const name = pick(r, ["name", "Team", "Team (Last Yr)"]) || "";
          return {
            name,
            program: pick(r, ["program", "Program"]),
            coach: pick(r, ["coach", "Coach"]) || "Unassigned",
            lastYear: toNumber(pick(r, ["count", "Players Last Yr", "lastYear"])),
            retained: toNumber(pick(r, ["retained", "Retained"])),
            lost: toNumber(pick(r, ["lost", "Lost"])),
            gender: pick(r, ["gender", "Gender"]) || (name.toLowerCase().includes("girl") ? "girls" : "boys"),
            fee: toNumber(pick(r, ["Fee", "fee"])) || 3000
          };
        }));

        // Players
        const playerRows = rowsToObjects(parseCSV(playerText));
        setPlayerList(playerRows.map(r => {
          const regLast = pick(r, ["Registered Last Yr (Y/N)", "Registered Last Yr", "in_24_25"]);
          const regThis = pick(r, ["Registered This Yr (Y/N)", "Registered This Yr", "in_25_26"]);
          const teamLast = pick(r, ["Team (Last Yr)", "team_last"]);
          const ageGroupLast = pick(r, ["Age Group (Last Yr)", "age_group_last"]);
          
          let status = "Unknown";
          if (regLast === 'Y' && regThis === 'Y') status = "Retained";
          else if (regLast === 'Y' && regThis !== 'Y') status = "Lost";
          else if (regLast !== 'Y' && regThis === 'Y') status = "New";

          const isAgedOut = 
            teamLast?.includes('06/07') || 
            teamLast?.includes('2006') || 
            teamLast?.includes('2005') ||
            ageGroupLast?.includes('U19') ||
            ageGroupLast?.includes('2006') ||
            ageGroupLast?.includes('2005');

          let gender = pick(r, ["gender", "Gender"]) || "";
          if (!gender) {
            const team = teamLast || pick(r, ["Team (This Yr)", "team_this"]) || "";
            gender = team.toLowerCase().includes('girl') ? "Girls" : "Boys";
          }
          if (gender.toUpperCase() === 'M' || gender.toLowerCase() === 'male') gender = "Boys";
          if (gender.toUpperCase() === 'F' || gender.toLowerCase() === 'female') gender = "Girls";

          return {
            name: `${pick(r, ["first_name", "First Name"])} ${pick(r, ["last_name", "Last Name"])}`.trim(),
            status,
            teamLast,
            teamThis: pick(r, ["Team (This Yr)", "team_this"]),
            gender,
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

  // Active data based on filter
  const activeData = kpisGender?.[genderFilter] ?? {
    totalLast: 0, totalThis: 0, net: 0, retained: 0, lost: 0, new: 0, fee: 3000, agedOut: 0
  };

  // Calculate metrics
  const agedOut = activeData.agedOut || 0;
  const lostExcludingAgedOut = Math.max(0, activeData.lost - agedOut);
  
  const retentionPercent = activeData.totalLast > 0 
    ? Math.round((activeData.retained / activeData.totalLast) * 100) : 0;
  
  const churnPercent = activeData.totalLast > 0 
    ? Math.round((lostExcludingAgedOut / activeData.totalLast) * 100) : 0;

  const eligibleBase = activeData.totalLast - agedOut;
  const eligibleRetentionPercent = eligibleBase > 0 
    ? Math.round((activeData.retained / eligibleBase) * 100) : 0;

  const changePercent = activeData.totalLast > 0
    ? Math.round(((activeData.totalThis - activeData.totalLast) / activeData.totalLast) * 100) : 0;

  // Revenue
  const exactRevenueLost = useMemo(() => {
    if (teams.length === 0) return 0;
    const relevantTeams = teams.filter(t => {
      if (genderFilter === 'club') return true;
      return t.gender === genderFilter;
    });
    return relevantTeams.reduce((total, team) => total + (team.lost * team.fee), 0);
  }, [teams, genderFilter]);

  const displayRevenueLost = exactRevenueLost > 0 ? exactRevenueLost : (lostExcludingAgedOut * activeData.fee);
  const potentialRecovery = Math.round(displayRevenueLost * 0.3);

  // Filter teams
  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return teams.filter((t) => {
      const matchesSearch = (t.name || "").toLowerCase().includes(q) || (t.coach || "").toLowerCase().includes(q);
      const matchesGender = genderFilter === "club" || t.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [teams, searchTerm, genderFilter]);

  // Gender comparison data
  const genderComparisonData = useMemo(() => {
    if (!kpisGender) return [];
    return [
      { 
        name: "Boys", 
        lastYear: kpisGender.boys?.totalLast || 0, 
        thisYear: kpisGender.boys?.totalThis || 0,
        change: kpisGender.boys && kpisGender.boys.totalLast > 0 
          ? Math.round(((kpisGender.boys.totalThis - kpisGender.boys.totalLast) / kpisGender.boys.totalLast) * 100) : 0
      },
      { 
        name: "Girls", 
        lastYear: kpisGender.girls?.totalLast || 0, 
        thisYear: kpisGender.girls?.totalThis || 0,
        change: kpisGender.girls && kpisGender.girls.totalLast > 0 
          ? Math.round(((kpisGender.girls.totalThis - kpisGender.girls.totalLast) / kpisGender.girls.totalLast) * 100) : 0
      }
    ];
  }, [kpisGender]);

  // Age comparison data
  const ageComparisonData = useMemo(() => {
    return ageDiag.map(a => ({
      ...a,
      change: a.playersLast > 0 ? Math.round(((a.playersThis - a.playersLast) / a.playersLast) * 100) : 0
    }));
  }, [ageDiag]);

  // Pie chart data
  const genderPieData = useMemo(() => {
    if (!kpisGender) return [];
    return [
      { name: "Boys", value: kpisGender.boys?.totalThis || 0, color: "#3b82f6" },
      { name: "Girls", value: kpisGender.girls?.totalThis || 0, color: "#ec4899" }
    ];
  }, [kpisGender]);

  // Deep Dive
  const deepDiveStats = useMemo(() => {
    if (!selectedEntity.id) return null;
    
    const relevantTeams = selectedEntity.type === 'coach' 
      ? teams.filter(t => t.coach === selectedEntity.id)
      : teams.filter(t => t.name === selectedEntity.id);
    
    if (relevantTeams.length === 0) return null;

    const totalLost = relevantTeams.reduce((acc, curr) => acc + curr.lost, 0);
    const totalRet = relevantTeams.reduce((acc, curr) => acc + curr.retained, 0);
    const totalLast = relevantTeams.reduce((acc, curr) => acc + curr.lastYear, 0);
    const lostRevenue = relevantTeams.reduce((acc, curr) => acc + (curr.lost * curr.fee), 0);
    
    return {
      name: selectedEntity.id,
      teams: relevantTeams,
      retentionRate: totalLast > 0 ? Math.round((totalRet / totalLast) * 100) : 0,
      totalRetained: totalRet,
      totalLost,
      totalPlayers: totalLast,
      lostRevenue
    };
  }, [selectedEntity, teams]);

  const uniqueCoaches = useMemo(() => [...new Set(teams.map(t => t.coach).filter(c => c && c !== "Unassigned"))].sort(), [teams]);
  const uniqueTeams = useMemo(() => [...new Set(teams.map(t => t.name))].sort(), [teams]);

  // Coach Stats for Coaches tab
  const coachStats = useMemo(() => {
    if (teams.length === 0) return { coaches: [], clubAvgRate: 0, bestCoach: null, worstCoach: null, totalRevenueDelta: 0 };
    
    // Calculate club average retention
    const totalRetained = teams.reduce((acc, t) => acc + t.retained, 0);
    const totalPlayers = teams.reduce((acc, t) => acc + t.lastYear, 0);
    const clubAvgRate = totalPlayers > 0 ? Math.round((totalRetained / totalPlayers) * 100) : 0;
    const avgFee = activeData.fee || 3000;
    
    // Group teams by coach
    const coachMap = {};
    teams.forEach(t => {
      const coachName = t.coach || "Unassigned";
      if (!coachMap[coachName]) {
        coachMap[coachName] = {
          name: coachName,
          teams: [],
          totalPlayers: 0,
          retained: 0,
          lost: 0,
          totalFees: 0
        };
      }
      coachMap[coachName].teams.push(t);
      coachMap[coachName].totalPlayers += t.lastYear;
      coachMap[coachName].retained += t.retained;
      coachMap[coachName].lost += t.lost;
      coachMap[coachName].totalFees += t.fee * t.lastYear;
    });
    
    // Calculate stats for each coach
    const coaches = Object.values(coachMap).map(coach => {
      const rate = coach.totalPlayers > 0 ? Math.round((coach.retained / coach.totalPlayers) * 100) : 0;
      const vsAvg = rate - clubAvgRate;
      const avgCoachFee = coach.totalPlayers > 0 ? Math.round(coach.totalFees / coach.totalPlayers) : avgFee;
      // Revenue impact: difference from club average * players * fee
      const expectedRetained = Math.round(coach.totalPlayers * (clubAvgRate / 100));
      const revenueImpact = (coach.retained - expectedRetained) * avgCoachFee;
      
      return {
        ...coach,
        rate,
        vsAvg,
        revenueImpact,
        avgFee: avgCoachFee
      };
    }).sort((a, b) => b.rate - a.rate);
    
    // Find best and worst (excluding Unassigned)
    const assignedCoaches = coaches.filter(c => c.name !== "Unassigned" && c.totalPlayers > 0);
    const bestCoach = assignedCoaches[0] || null;
    const worstCoach = assignedCoaches[assignedCoaches.length - 1] || null;
    
    // Total revenue delta
    const totalRevenueDelta = coaches.reduce((acc, c) => acc + c.revenueImpact, 0);
    
    return { coaches, clubAvgRate, bestCoach, worstCoach, totalRevenueDelta };
  }, [teams, activeData.fee]);

  // Open player modal - FIXED gender filter
  const handleOpenPlayerList = (filter, title) => {
    let matchedPlayers = [];
    
    if (typeof filter === 'string') {
      matchedPlayers = playerList.filter(p => p.status === filter);
    } else if (filter.team && filter.status) {
      matchedPlayers = playerList.filter(p => {
        const teamMatch = p.teamLast === filter.team || p.teamThis === filter.team;
        return teamMatch && p.status === filter.status;
      });
    } else if (filter.status) {
      matchedPlayers = playerList.filter(p => p.status === filter.status);
    }

    // Exclude aged out if "Lost"
    if (filter === 'Lost' || filter.status === 'Lost') {
      matchedPlayers = matchedPlayers.filter(p => !p.agedOut);
    }

    // FIXED: Filter by gender correctly
    if (genderFilter !== 'club') {
      matchedPlayers = matchedPlayers.filter(p => {
        const playerGender = (p.gender || "").toLowerCase();
        return playerGender === genderFilter || 
               (genderFilter === 'boys' && (playerGender === 'boys' || playerGender === 'm' || playerGender === 'male')) ||
               (genderFilter === 'girls' && (playerGender === 'girls' || playerGender === 'f' || playerGender === 'female'));
      });
    }

    setModal({
      open: true,
      title,
      players: matchedPlayers.map(p => ({ ...p, team: p.teamLast || p.teamThis })),
      subtitle: `${genderFilter !== 'club' ? genderFilter.charAt(0).toUpperCase() + genderFilter.slice(1) + ' only - ' : ''}${matchedPlayers.length} players`
    });
  };

  // Export all
  const handleExportAll = () => {
    const allData = playerList.map(p => ({
      Name: p.name,
      Status: p.status,
      Gender: p.gender,
      'Team Last Year': p.teamLast,
      'Team This Year': p.teamThis,
      'Aged Out': p.agedOut ? 'Yes' : 'No'
    }));
    exportToCSV(allData, 'RetainPlayers_Full_Export');
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("rp_authenticated");
    localStorage.removeItem("rp_auth_time");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#0C1B46] p-4 md:p-6 font-sans text-white">
      <PlayerModal 
        isOpen={modal.open} 
        onClose={() => setModal({ ...modal, open: false })} 
        title={modal.title} 
        players={modal.players}
        subtitle={modal.subtitle}
      />

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
            <p className="text-slate-400 mt-1 text-sm">
              Season: <span className="font-bold text-white">2024-25 vs 2025-26</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportAll}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
              >
                <Download size={14} /> Export
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors">
                <LogOut size={14} /> Logout
              </button>
            </div>

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
            <nav className="flex bg-[#111827] rounded-xl p-1 gap-1 border border-slate-700/50 overflow-x-auto">
              {[
                { id: "overview", label: "Overview" },
                { id: "diagnosis", label: "Diagnosis" },
                { id: "financials", label: "Financials" },
                { id: "full-roster", label: "Teams" },
                { id: "coaches", label: "Coaches" },
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
            <p className="text-slate-400 font-medium">Loading data...</p>
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
              <Scorecard 
                label="Net Change" 
                value={activeData.net >= 0 ? `+${activeData.net}` : `${activeData.net}`} 
                sub={`${changePercent >= 0 ? '+' : ''}${changePercent}% year over year`} 
                highlight 
              />
            </div>

            {/* KPI Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPIBox 
                title="Retained" 
                value={activeData.retained.toLocaleString()} 
                sub="Stayed from last season"
                percent={`${retentionPercent}%`} 
                icon={UserCheck} 
                color="bg-blue-600" 
                trend="up"
                clickable 
                onClick={() => handleOpenPlayerList({ status: 'Retained' }, 'Retained Players')}
              />
              <KPIBox 
                title="Lost (Churn)" 
                value={lostExcludingAgedOut.toLocaleString()} 
                sub="Did not return (excl. aged out)"
                percent={`${churnPercent}%`} 
                icon={UserMinus} 
                color="bg-rose-500" 
                trend="down"
                tooltip="Excludes players who naturally graduated (U19)"
                clickable 
                onClick={() => handleOpenPlayerList({ status: 'Lost' }, 'Lost Players (excl. aged out)')}
              />
              <KPIBox 
                title="New Players" 
                value={activeData.new.toLocaleString()} 
                sub="First time this season"
                icon={UserPlus} 
                color="bg-emerald-600" 
                trend="up"
                clickable 
                onClick={() => handleOpenPlayerList({ status: 'New' }, 'New Players')}
              />
              <KPIBox 
                title="Eligible Retention" 
                value={`${eligibleRetentionPercent}%`} 
                sub={`Retained ÷ (${activeData.totalLast} - ${agedOut} aged out)`}
                icon={Target} 
                color="bg-indigo-600"
                tooltip="Retention rate excluding players who aged out"
              />
            </div>

            {/* Charts Row */}
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
                        <span className={`text-xs ${g.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({g.change >= 0 ? '+' : ''}{g.change}%)
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
                    <Bar yAxisId="left" dataKey="playersThis" name="2025-26" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="rate" name="Retention %" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Year change cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {ageComparisonData.slice(0, 6).map((a, idx) => (
                <div key={idx} className="bg-[#111827] rounded-xl p-4 text-center border border-slate-700/50">
                  <p className="text-white font-bold text-lg">{a.year}</p>
                  <p className="text-slate-400 text-sm">{a.playersLast} → {a.playersThis}</p>
                  <p className={`text-lg font-bold ${a.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {a.change >= 0 ? '+' : ''}{a.change}%
                  </p>
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
                    <p className="text-rose-200 text-sm mt-1">{lostExcludingAgedOut} players × ${activeData.fee.toLocaleString()} avg fee</p>
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
                <p className="text-sm text-slate-500">From {lostExcludingAgedOut} players who didn't return</p>
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
                    <li>• Contact {Math.round(lostExcludingAgedOut * 0.3)} high-value players</li>
                    <li>• Offer early-bird discount</li>
                    <li>• Survey for churn reasons</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-white">Top Revenue Losses by Team</h4>
                <button 
                  onClick={() => exportToCSV(filteredTeams.map(t => ({
                    Team: t.name,
                    Program: t.program,
                    Lost: t.lost,
                    Fee: t.fee,
                    'Revenue Lost': t.lost * t.fee
                  })), 'Revenue_Losses')}
                  className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"
                >
                  <Download size={14} /> Export
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

        {/* ==================== TEAMS TAB ==================== */}
        {activeTab === "full-roster" && (
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h4 className="text-xl font-bold text-white">Team Roster</h4>
                <p className="text-slate-400 text-sm">Click on numbers to see player lists</p>
              </div>
              <div className="flex items-center gap-3">
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
                <button 
                  onClick={() => exportToCSV(filteredTeams, 'Teams_Export')}
                  className="p-2.5 bg-slate-700/50 rounded-lg text-slate-400 hover:text-white"
                >
                  <Download size={18} />
                </button>
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

        {/* ==================== COACHES TAB ==================== */}
        {activeTab === "coaches" && (
          <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Club Avg Retention</p>
                <p className="text-3xl font-black text-white">{coachStats.clubAvgRate}%</p>
                <p className="text-xs text-slate-500 mt-1">Baseline for comparison</p>
              </div>
              
              {coachStats.bestCoach && (
                <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/30">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Best Performer</p>
                  <p className="text-xl font-black text-white">{coachStats.bestCoach.name}</p>
                  <p className="text-2xl font-black text-emerald-400">{coachStats.bestCoach.rate}%</p>
                  <p className="text-xs text-emerald-400 mt-1">+{coachStats.bestCoach.vsAvg}% vs avg</p>
                </div>
              )}
              
              {coachStats.worstCoach && coachStats.worstCoach.name !== coachStats.bestCoach?.name && (
                <div className="bg-rose-500/10 p-5 rounded-2xl border border-rose-500/30">
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Needs Attention</p>
                  <p className="text-xl font-black text-white">{coachStats.worstCoach.name}</p>
                  <p className="text-2xl font-black text-rose-400">{coachStats.worstCoach.rate}%</p>
                  <p className="text-xs text-rose-400 mt-1">{coachStats.worstCoach.vsAvg}% vs avg</p>
                </div>
              )}
              
              <div className={`p-5 rounded-2xl border ${coachStats.totalRevenueDelta >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Revenue Delta</p>
                <p className={`text-3xl font-black ${coachStats.totalRevenueDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {coachStats.totalRevenueDelta >= 0 ? '+' : ''}${coachStats.totalRevenueDelta.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Impact vs club average</p>
              </div>
            </div>

            {/* Coach Leaderboard */}
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <Award size={20} className="text-amber-400" />
                    Coach Retention Index
                  </h4>
                  <p className="text-slate-400 text-sm">Ranked by retention rate • Click coach name for details</p>
                </div>
                <button 
                  onClick={() => exportToCSV(coachStats.coaches.map(c => ({
                    Rank: coachStats.coaches.indexOf(c) + 1,
                    Coach: c.name,
                    Teams: c.teams.length,
                    Players: c.totalPlayers,
                    Retained: c.retained,
                    Lost: c.lost,
                    'Rate %': c.rate,
                    'vs Avg %': c.vsAvg,
                    'Revenue Impact': c.revenueImpact
                  })), 'Coach_Retention_Index')}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                >
                  <Download size={14} /> Export
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
                      <th className="pb-3 text-center">Rate</th>
                      <th className="pb-3 text-center">vs Avg</th>
                      <th className="pb-3 text-right">Revenue Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {coachStats.coaches.map((coach, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 pr-4">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                            idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                            idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-slate-700/50 text-slate-500'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          <button 
                            onClick={() => {
                              setSelectedEntity({ type: 'coach', id: coach.name });
                              setActiveTab('deep-dive');
                            }}
                            className="font-bold text-white hover:text-blue-400 transition-colors text-left"
                          >
                            {coach.name}
                          </button>
                          <p className="text-xs text-slate-500">{coach.teams.map(t => t.name).join(', ')}</p>
                        </td>
                        <td className="py-4 text-center text-slate-400">{coach.teams.length}</td>
                        <td className="py-4 text-center text-slate-400">{coach.totalPlayers}</td>
                        <td className="py-4 text-center text-blue-400 font-bold">{coach.retained}</td>
                        <td className="py-4 text-center text-rose-400 font-bold">{coach.lost}</td>
                        <td className="py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
                            coach.rate >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                            coach.rate >= 50 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-rose-500/20 text-rose-400'
                          }`}>
                            {coach.rate}%
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`text-sm font-bold ${coach.vsAvg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {coach.vsAvg >= 0 ? '+' : ''}{coach.vsAvg}%
                          </span>
                        </td>
                        <td className={`py-4 text-right font-bold ${coach.revenueImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {coach.revenueImpact >= 0 ? '+' : ''}${coach.revenueImpact.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl">
                <Briefcase className="text-blue-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Why This Matters</h5>
                <p className="text-sm text-slate-400">Coaching quality directly impacts retention. Use this data for hiring, reviews, and training decisions.</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                <Target className="text-amber-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Revenue Impact</h5>
                <p className="text-sm text-slate-400">Shows how much each coach saves or costs compared to club average performance.</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl">
                <TrendingUp className="text-emerald-400 mb-3" size={24} />
                <h5 className="font-bold text-white mb-1">Action Items</h5>
                <p className="text-sm text-slate-400">Coaches below average need support. Top coaches can mentor others or deserve recognition.</p>
              </div>
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
                <div className="h-full min-h-[350px] flex items-center justify-center bg-[#070D1F] border border-[#3A7FC3]/30 rounded-2xl">
                  <div className="text-center text-slate-500">
                    <Search size={36} className="mx-auto mb-3 text-[#3A7FC3]" />
                    <p>Select a Coach or Team to analyze</p>
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
