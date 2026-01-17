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
  KPIS: getEnvVar("VITE_SHEET_KPIS_CSV"),
  KPIS_GENDER: getEnvVar("VITE_SHEET_KPIS_GENDER_CSV"),
  PROGRAMS: getEnvVar("VITE_SHEET_PROGRAMS_CSV"),
  AGE: getEnvVar("VITE_SHEET_AGE_CSV"),
  TEAMS: getEnvVar("VITE_SHEET_TEAMS_CSV"),
  PLAYERS: getEnvVar("VITE_SHEET_PLAYERS_CSV")
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

function normalizePercent(val) {
  const n = toNumber(val);
  if (n > 1 && n <= 100) return n;
  if (n > 0 && n <= 1) return Math.round(n * 100);
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
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

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
                  <div className="flex items-center gap-2">
                    {p.gender && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.gender.toLowerCase() === 'boys' || p.gender.toUpperCase() === 'M' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-pink-500/20 text-pink-400'
                      }`}>
                        {p.gender.toLowerCase() === 'boys' || p.gender.toUpperCase() === 'M' ? '♂' : '♀'}
                      </span>
                    )}
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 bg-slate-800/30 border-t border-slate-700/50 flex justify-between items-center">
          <button onClick={handleExport} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
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

const KPIBox = ({ title, value, sub, percent, icon: Icon, color, trend, onClick, clickable, tooltip }) => (
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
      <div className="flex items-center gap-2">
        {tooltip && (
          <div className="group relative">
            <Info size={14} className="text-slate-500 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-slate-700 pointer-events-none">
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
      <p className="text-xs mt-3 text-blue-400 font-medium">Click for details →</p>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e293b] border border-slate-600/50 rounded-xl p-3 shadow-xl">
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
  const [programs, setPrograms] = useState([]);
  const [ageDiag, setAgeDiag] = useState([]);
  const [teams, setTeams] = useState([]);
  const [playerList, setPlayerList] = useState([]);

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
          setPrograms([]);
          setAgeDiag([]);
          setTeams([]);
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

        // 1. KPIs
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
            retentionRate: total > 0 ? Math.round((retained / total) * 100) : 0,
            lastYear: toNumber(pick(r, ["lastYear", "Last Year"])) || total,
            thisYear: toNumber(pick(r, ["thisYear", "This Year"])) || retained
          };
        }));

        // 3. Age Diagnostic (FIXED)
        const ageRows = rowsToObjects(parseCSV(ageText));
        setAgeDiag(ageRows.map(r => {
            const rate = normalizePercent(pick(r, ["rate", "Rate"]));
            let eligibleRate = normalizePercent(pick(r, ["eligibleRate", "EligibleRate"]));
            if (eligibleRate === 0 && rate > 0) eligibleRate = rate;

            return {
                year: pick(r, ["year", "Year"]),
                rate,
                eligibleRate,
                playersLast: toNumber(pick(r, ["playersLast", "Players Last", "players", "Players"])),
                playersThis: toNumber(pick(r, ["playersThis", "Players This"])),
                retained: toNumber(pick(r, ["retained", "Retained"])),
            };
        }));

        // 4. Teams
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

        // 5. Players
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

          const isAgedOutRow = pick(r, ["aged_out", "Aged Out"]);
          const isAgedOut = isAgedOutRow 
            ? (isAgedOutRow.toUpperCase() === 'Y' || isAgedOutRow.toUpperCase() === 'YES')
            : (
                teamLast?.includes('06/07') || 
                teamLast?.includes('2006') || 
                ageGroupLast?.includes('U19') ||
                ageGroupLast?.includes('2006')
              );

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

  const activeData = kpisGender?.[genderFilter] ?? {
    totalLast: 0, totalThis: 0, net: 0, retained: 0, lost: 0, new: 0, fee: 3000, agedOut: 0
  };

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

  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return teams.filter((t) => {
      const matchesSearch = (t.name || "").toLowerCase().includes(q) || (t.coach || "").toLowerCase().includes(q);
      const matchesGender = genderFilter === "club" || t.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [teams, searchTerm, genderFilter]);

  // Gender Comparison Data (for Text below Pie)
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

  // Gender Pie Data (for Chart)
  const genderPieData = useMemo(() => {
    if (!kpisGender) return [];
    return [
      { name: "Boys", value: kpisGender.boys?.totalThis || 0, color: "#3b82f6" },
      { name: "Girls", value: kpisGender.girls?.totalThis || 0, color: "#ec4899" }
    ];
  }, [kpisGender]);

  const ageComparisonData = useMemo(() => {
    return ageDiag.map(a => ({
      ...a,
      change: a.playersLast > 0 ? Math.round(((a.playersThis - a.playersLast) / a.playersLast) * 100) : 0
    }));
  }, [ageDiag]);

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

    if (filter === 'Lost' || filter.status === 'Lost') {
      matchedPlayers = matchedPlayers.filter(p => !p.agedOut);
    }

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

  const handleLogout = () => {
    localStorage.removeItem("rp_authenticated");
    localStorage.removeItem("rp_auth_time");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#0a1628] p-4 md:p-6 font-sans text-white">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Scorecard label="2024–25 Players" value={activeData.totalLast.toLocaleString()} sub="Base Year" />
              <Scorecard label="2025–26 Players