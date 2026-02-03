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
  TEAMS_PRIOR: getEnvVar("VITE_SHEET_TEAMS_PRIOR_CSV"),
  PLAYERS: getEnvVar("VITE_SHEET_PLAYERS_CSV")
};

// --- GLOBAL COLORS ---
const COLORS = {
  CLUB: "#3A7FC3",
  BOYS: "#3b82f6",
  GIRLS: "#818cf8",
  LOST: "#ef4444",
  GREEN_LINE: "#10b981",
  NEW: "#10b981",
  GROWTH: "#10b981",
  RISK: "#ef4444"
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

function getProgramGender(programName) {
  const name = (programName || "").toLowerCase();
  if (name.includes("girls") || name === "pre-ecnl") {
    return "F";
  }
  return "M";
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
      Team: p.team || p.teamPrior || '',
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
                    {p.gender && <span className={`text-xs px-2 py-0.5 rounded ${p.gender === 'M' ? 'bg-[#3A7FC3]/20 text-[#5DB3F5]' : 'bg-indigo-500/20 text-indigo-400'}`}>{p.gender === 'M' ? '♂' : '♀'}</span>}
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

const TeamDetailModal = ({ isOpen, onClose, team }) => {
  if (!isOpen || !team) return null;
  
  const priorDetails = team.teamPriorDetail ? team.teamPriorDetail.split(", ").map(item => {
    const [name, count] = item.split(":");
    return { name: name?.trim(), count: parseInt(count) || 0 };
  }).filter(d => d.name && d.count > 0) : [];
  
  const totalFromPrior = priorDetails.reduce((sum, d) => sum + d.count, 0);
  
  const coaches = team.coachPrior ? team.coachPrior.split(", ").filter(c => c.trim()) : [];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#070D1F] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#3A7FC3]/50">
        <div className="p-5 border-b border-[#3A7FC3]/30 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-lg">{team.name}</h3>
            <p className="text-xs text-slate-400">{team.program} • Coach: {team.coach} • 25/26 Season</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#3A7FC3]/20 rounded-lg transition-colors text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {priorDetails.length > 0 ? (
            <>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Players came from:</h4>
              <div className="space-y-2 mb-6">
                {priorDetails.sort((a, b) => b.count - a.count).map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#0C1B46] rounded-xl border border-[#3A7FC3]/20">
                    <span className="text-white text-sm">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{d.count}</span>
                      <span className="text-slate-500 text-xs">({totalFromPrior > 0 ? Math.round((d.count / totalFromPrior) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {coaches.length > 0 && (
                <>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Previous coaches:</h4>
                  <div className="flex flex-wrap gap-2">
                    {coaches.map((c, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-[#0C1B46] rounded-lg text-sm text-[#5DB3F5] border border-[#3A7FC3]/20">{c}</span>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-center text-slate-500 text-sm py-8">No transition data available for this team.</p>
          )}
        </div>
        
        <div className="p-4 bg-[#0C1B46] border-t border-[#3A7FC3]/30 flex justify-end">
          <button onClick={onClose} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white">Close</button>
        </div>
      </div>
    </div>
  );
};

const TeamPriorDetailModal = ({ isOpen, onClose, team, playerList }) => {
  if (!isOpen || !team) return null;
  
  // Calculate where players went
  const destinations = useMemo(() => {
    const teamPlayers = playerList.filter(p => p.teamPrior === team.name);
    const destCounts = {};
    
    teamPlayers.forEach(p => {
      if (p.status === 'Retained' && p.teamCurrent) {
        const dest = p.teamCurrent;
        if (!destCounts[dest]) destCounts[dest] = { name: dest, count: 0 };
        destCounts[dest].count += 1;
      }
    });
    
    return Object.values(destCounts).sort((a, b) => b.count - a.count);
  }, [team, playerList]);
  
  const totalRetained = destinations.reduce((sum, d) => sum + d.count, 0);
  
  // Lost players
  const lostPlayers = playerList.filter(p => p.teamPrior === team.name && p.status === 'Lost' && !p.agedOut);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#070D1F] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#3A7FC3]/50">
        <div className="p-5 border-b border-[#3A7FC3]/30 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-lg">{team.name}</h3>
            <p className="text-xs text-slate-400">{team.program} • Coach: {team.coach} • 24/25 Season</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#3A7FC3]/20 rounded-lg transition-colors text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[#0C1B46] rounded-xl p-3 text-center border border-[#3A7FC3]/20">
              <p className="text-2xl font-bold text-white">{team.count}</p>
              <p className="text-xs text-slate-500">Players</p>
            </div>
            <div className="bg-[#0C1B46] rounded-xl p-3 text-center border border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-400">{team.retained}</p>
              <p className="text-xs text-slate-500">Retained</p>
            </div>
            <div className="bg-[#0C1B46] rounded-xl p-3 text-center border border-rose-500/20">
              <p className="text-2xl font-bold text-rose-400">{team.lost}</p>
              <p className="text-xs text-slate-500">Lost</p>
            </div>
          </div>

          {/* Where players went */}
          {destinations.length > 0 ? (
            <>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Players went to:</h4>
              <div className="space-y-2 mb-6">
                {destinations.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[#0C1B46] rounded-xl border border-emerald-500/20">
                    <span className="text-white text-sm">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">{d.count}</span>
                      <span className="text-slate-500 text-xs">({totalRetained > 0 ? Math.round((d.count / totalRetained) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-slate-500 text-sm py-4">No retention data available.</p>
          )}
          
          {/* Lost players count */}
          {lostPlayers.length > 0 && (
            <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20">
              <p className="text-rose-400 font-bold">{lostPlayers.length} players lost</p>
              <p className="text-xs text-slate-500">Did not return to any team in 25/26</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-[#0C1B46] border-t border-[#3A7FC3]/30 flex justify-end">
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
            {item.name?.toLowerCase().includes('rate') || item.name?.toLowerCase().includes('%') ? '%' : ''}
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
  const [seasonMode, setSeasonMode] = useState("season-vs-season");
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState({ open: false, title: "", players: [], subtitle: "" });
  const [teamModal, setTeamModal] = useState({ open: false, team: null });
  const [teamPriorModal, setTeamPriorModal] = useState({ open: false, team: null });
  const [teamsSubTab, setTeamsSubTab] = useState("current");
  const [selectedEntity, setSelectedEntity] = useState({ type: 'coach', id: '' });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [kpisGender, setKpisGender] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamsPrior, setTeamsPrior] = useState([]);
  const [playerList, setPlayerList] = useState([]);

  const activeColor = genderFilter === 'boys' ? COLORS.BOYS : genderFilter === 'girls' ? COLORS.GIRLS : COLORS.CLUB;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const responses = await Promise.all([
          fetch(URLS.KPIS_GENDER).then(res => res.text()),
          fetch(URLS.PROGRAMS).then(res => res.text()),
          fetch(URLS.TEAMS).then(res => res.text()),
          fetch(URLS.TEAMS_PRIOR).then(res => res.text()).catch(() => ""),
          fetch(URLS.PLAYERS).then(res => res.text()),
        ]);

        const [kpiText, programText, teamText, teamPriorText, playerText] = responses;

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

        // Programs
        const programRows = rowsToObjects(parseCSV(programText));
        const parsedPrograms = programRows.map(r => {
          const name = pick(r, ["name", "Name"]) || "";
          const retained = toNumber(pick(r, ["retained", "Retained"]));
          const thisYear = toNumber(pick(r, ["thisYear", "ThisYear", "this_year"]));
          return {
            name,
            retained,
            lost: toNumber(pick(r, ["lost", "Lost"])),
            lastYear: toNumber(pick(r, ["lastYear", "LastYear", "last_year"])),
            thisYear,
            new: Math.max(0, thisYear - retained),
            retentionRate: toNumber(pick(r, ["retentionRate", "RetentionRate", "retention_rate"])),
            churn: toNumber(pick(r, ["churn", "Churn"])),
            gender: getProgramGender(name)
          };
        }).filter(p => p.name);
        setPrograms(parsedPrograms);

        // Teams (Current 25/26)
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
            fee: toNumber(pick(r, ["Fee"])) || 3000,
            teamPriorDetail: pick(r, ["team_prior_detail"]) || "",
            coachPrior: pick(r, ["coach_prior"]) || ""
          };
        }).filter(t => !t.name.toLowerCase().includes("goalkeeper")));

        // Teams Prior (24/25)
        if (teamPriorText) {
          const teamPriorRows = rowsToObjects(parseCSV(teamPriorText));
          setTeamsPrior(teamPriorRows.map(r => {
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
              rate: toNumber(pick(r, ["rate"])),
              gender,
              fee: toNumber(pick(r, ["Fee"])) || 3000,
            };
          }).filter(t => t.name && !t.name.toLowerCase().includes("goalkeeper")));
        }

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
          const program = pick(r, ["program_current", "program_this", "Program (This Yr)", "program"]) || pick(r, ["program_prior", "program_last", "Program (Last Yr)"]) || "Unknown";

          const feePrior = toNumber(pick(r, ["fee_prior", "fee_last"]));
          const feeCurrent = toNumber(pick(r, ["fee_current", "fee_this", "fee", "Fee"]));

          return {
            name: `${pick(r, ["first_name"])} ${pick(r, ["last_name"])}`.trim(),
            status,
            teamPrior: pick(r, ["team_prior", "Team (Last Yr)"]),
            teamCurrent: pick(r, ["team_current", "Team (This Yr)"]),
            gender,
            agedOut: isAgedOut,
            birthYear: birthYear.replace(/[^0-9]/g, ''), 
            program,
            feePrior,
            feeCurrent,
            fee: status === 'Lost' ? feePrior : feeCurrent
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

  // Calculate new players by program from playerList
  const newByProgram = useMemo(() => {
    const counts = {};
    playerList.forEach(p => {
      if (p.status === 'New' && p.program) {
        if (genderFilter === 'boys' && p.gender !== 'M') return;
        if (genderFilter === 'girls' && p.gender !== 'F') return;
        counts[p.program] = (counts[p.program] || 0) + 1;
      }
    });
    return counts;
  }, [playerList, genderFilter]);

  // Retention by PROGRAM
  const filteredPrograms = useMemo(() => {
    return programs
      .filter(p => {
        if (genderFilter === 'boys') return p.gender === 'M';
        if (genderFilter === 'girls') return p.gender === 'F';
        return true;
      })
      .map(p => ({
        name: p.name,
        displayRetained: p.retained,
        displayLost: p.lost,
        displayNew: newByProgram[p.name] || 0,
        displayRate: p.retentionRate,
        lastYear: p.lastYear,
        thisYear: p.thisYear,
        churn: p.churn,
        gender: p.gender,
        barColor: p.gender === 'F' ? COLORS.GIRLS : COLORS.BOYS
      }))
      .sort((a, b) => b.displayRetained - a.displayRetained);
  }, [programs, genderFilter, newByProgram]);

  // Retention by AGE
  const ageComparisonData = useMemo(() => {
    const stats = {};
    playerList.forEach(p => {
      if (genderFilter === 'boys' && p.gender !== 'M') return;
      if (genderFilter === 'girls' && p.gender !== 'F') return;
      if (!p.birthYear) return;

      const year = p.birthYear;
      if (!stats[year]) stats[year] = { last: 0, this: 0, retained: 0, lost: 0, new: 0 };
      
      if (p.teamPrior) stats[year].last += 1;
      if (p.teamCurrent) stats[year].this += 1;
      if (p.status === 'Retained') stats[year].retained += 1;
      if (p.status === 'Lost' && !p.agedOut) stats[year].lost += 1;
      if (p.status === 'New') stats[year].new += 1;
    });

    return Object.keys(stats).map(year => {
      const s = stats[year];
      return {
        year,
        playersLast: s.last,
        playersThis: s.this,
        lost: s.lost,
        new: s.new,
        rate: s.last > 0 ? Math.round((s.retained / s.last) * 100) : 0,
        change: s.last > 0 ? Math.round(((s.this - s.last) / s.last) * 100) : 0
      };
    })
    .sort((a, b) => Number(b.year) - Number(a.year))
    .filter(a => a.playersLast > 0 || a.playersThis > 0);
  }, [playerList, genderFilter]);

  // Filtered Teams (Current 25/26)
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

  // Filtered Teams Prior (24/25)
  const filteredTeamsPrior = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return teamsPrior.filter((t) => {
      const matchesSearch = (t.name || "").toLowerCase().includes(q) || (t.coach || "").toLowerCase().includes(q);
      let matchesGender = true;
      if (genderFilter === 'boys') matchesGender = t.gender === 'M';
      else if (genderFilter === 'girls') matchesGender = t.gender === 'F';
      return matchesSearch && matchesGender;
    });
  }, [teamsPrior, searchTerm, genderFilter]);

  // Revenue Calculations
  const exactRevenueLost = useMemo(() => {
    const lostP = playerList.filter(p => p.status === 'Lost' && !p.agedOut);
    const genderLost = lostP.filter(p => {
        if (genderFilter === 'boys') return p.gender === 'M';
        if (genderFilter === 'girls') return p.gender === 'F';
        return true;
    });
    return Math.round(genderLost.reduce((total, p) => total + (p.feePrior > 0 ? p.feePrior : activeData.fee), 0));
  }, [playerList, genderFilter, activeData.fee]);

  const exactNewRevenue = useMemo(() => {
    const newP = playerList.filter(p => p.status === 'New');
    const genderNew = newP.filter(p => {
        if (genderFilter === 'boys') return p.gender === 'M';
        if (genderFilter === 'girls') return p.gender === 'F';
        return true;
    });
    return Math.round(genderNew.reduce((total, p) => total + (p.feeCurrent > 0 ? p.feeCurrent : activeData.fee), 0));
  }, [playerList, genderFilter, activeData.fee]);

  const netImpact = exactNewRevenue - exactRevenueLost;

  // Player counts for context display
  const lostPlayersCount = useMemo(() => {
    return playerList.filter(p => p.status === 'Lost' && !p.agedOut).filter(p => {
      if (genderFilter === 'boys') return p.gender === 'M';
      if (genderFilter === 'girls') return p.gender === 'F';
      return true;
    }).length;
  }, [playerList, genderFilter]);

  const newPlayersCount = useMemo(() => {
    return playerList.filter(p => p.status === 'New').filter(p => {
      if (genderFilter === 'boys') return p.gender === 'M';
      if (genderFilter === 'girls') return p.gender === 'F';
      return true;
    }).length;
  }, [playerList, genderFilter]);

  // Gender Pie
  const genderPieData = useMemo(() => {
    if (!kpisGender) return [];
    return [
      { name: "Boys", value: kpisGender.boys?.totalThis || 0, color: COLORS.BOYS },
      { name: "Girls", value: kpisGender.girls?.totalThis || 0, color: COLORS.GIRLS }
    ];
  }, [kpisGender]);

  // Program Distribution Pie Charts (Lost, Retained, New)
  // Uses consistent colors based on program name (matches Retention by Program bar chart)
  const programDistribution = useMemo(() => {
    // Fixed color map by program name for consistency
    const PROGRAM_COLOR_MAP = {
      'Girls ECNL': '#818cf8',      // indigo/purple
      'Boys 9v9': '#38bdf8',        // cyan
      'Boys 7v7': '#34d399',        // emerald
      'MLS Next': '#fbbf24',        // amber
      'Boys 11v11 Club': '#f87171', // red
      'Girls 7v7': '#a78bfa',       // purple
      'MLS Next 2': '#06b6d4',      // cyan darker
      'Pre-ECNL': '#fb923c',        // orange
      'NPL': '#4ade80',             // green
      'Girls 9v9': '#c084fc',       // violet
      'Girls 11v11 Club': '#f472b6',// pink
      'Boys ECNL': '#60a5fa',       // blue
    };
    const FALLBACK_COLORS = ['#94a3b8', '#64748b', '#475569', '#cbd5e1', '#e2e8f0'];
    let fallbackIdx = 0;
    
    const getColorForProgram = (name) => {
      if (PROGRAM_COLOR_MAP[name]) return PROGRAM_COLOR_MAP[name];
      const color = FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
      fallbackIdx++;
      return color;
    };
    
    const lostByProgram = {};
    const retainedByProgram = {};
    const newByProgramMap = {};
    
    playerList.forEach(p => {
      // Apply gender filter
      if (genderFilter === 'boys' && p.gender !== 'M') return;
      if (genderFilter === 'girls' && p.gender !== 'F') return;
      
      const prog = p.program || 'Unknown';
      
      if (p.status === 'Lost' && !p.agedOut) {
        lostByProgram[prog] = (lostByProgram[prog] || 0) + 1;
      } else if (p.status === 'Retained') {
        retainedByProgram[prog] = (retainedByProgram[prog] || 0) + 1;
      } else if (p.status === 'New') {
        newByProgramMap[prog] = (newByProgramMap[prog] || 0) + 1;
      }
    });
    
    const toChartData = (obj) => {
      const total = Object.values(obj).reduce((sum, v) => sum + v, 0);
      return Object.entries(obj)
        .map(([name, value]) => ({
          name,
          value,
          percent: total > 0 ? Math.round((value / total) * 100) : 0,
          color: getColorForProgram(name)
        }))
        .sort((a, b) => b.value - a.value);
    };
    
    return {
      lost: toChartData(lostByProgram),
      retained: toChartData(retainedByProgram),
      new: toChartData(newByProgramMap)
    };
  }, [playerList, genderFilter]);

  // Coach Stats
  const coachStats = useMemo(() => {
    if (filteredTeams.length === 0) return { coaches: [], totalRevenueLost: 0, avgFee: 3000 };
    const avgFee = Math.round(activeData.fee || 3000);
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
    if (filter.team) matchedPlayers = matchedPlayers.filter(p => p.teamPrior === filter.team || p.teamCurrent === filter.team);
    if (filter.coach) {
      const coachTeams = teams.filter(t => t.coach === filter.coach).map(t => t.name);
      matchedPlayers = matchedPlayers.filter(p => coachTeams.includes(p.teamPrior) || coachTeams.includes(p.teamCurrent));
    }
    if (filter.status === 'Lost') matchedPlayers = matchedPlayers.filter(p => !p.agedOut);

    if (genderFilter === 'boys') matchedPlayers = matchedPlayers.filter(p => p.gender === 'M');
    else if (genderFilter === 'girls') matchedPlayers = matchedPlayers.filter(p => p.gender === 'F');

    setModal({
      open: true,
      title,
      players: matchedPlayers.map(p => ({ ...p, team: p.teamPrior || p.teamCurrent })),
      subtitle: `${genderFilter !== 'club' ? genderFilter.charAt(0).toUpperCase() + genderFilter.slice(1) + ' - ' : ''}${matchedPlayers.length} players`
    });
  };

  const handleExportLostOnly = () => {
    const lostPlayers = playerList
      .filter(p => p.status === 'Lost' && !p.agedOut)
      .filter(p => {
        if (genderFilter === 'boys') return p.gender === 'M';
        if (genderFilter === 'girls') return p.gender === 'F';
        return true;
      });
    
    exportToExcel(lostPlayers.map(p => ({
      Name: p.name,
      'Last Team': p.teamPrior || '',
      Gender: p.gender === 'M' ? 'Boys' : 'Girls',
      Program: p.program,
      'Birth Year': p.birthYear,
      Fee: p.feePrior || activeData.fee
    })), 'Lost_Players', 'Lost');
  };

  const handleExportTeamsRevenue = () => {
    const data = filteredTeams
      .sort((a, b) => (b.lost * b.fee) - (a.lost * a.fee))
      .map((t, idx) => ({
        Rank: idx + 1,
        Team: t.name,
        Program: t.program,
        Coach: t.coach,
        'Players Lost': t.lost,
        'Fee': `$${t.fee}`,
        'Revenue Lost': `$${(t.lost * t.fee).toLocaleString()}`
      }));
    exportToExcel(data, 'Teams_Revenue_Lost', 'Revenue');
  };

  const handleExportCoaches = () => {
    const data = coachStats.coaches.map((c, idx) => ({
      Rank: idx + 1,
      Coach: c.name,
      Teams: c.teams.length,
      Players: c.totalPlayers,
      Retained: c.retained,
      Lost: c.lost,
      'Churn Rate': `${c.churnRate}%`,
      'Revenue Lost': `$${c.revenueLost.toLocaleString()}`
    }));
    exportToExcel(data, 'Coach_Revenue', 'Coaches');
  };

  const handleLogout = () => {
    localStorage.removeItem("rp_authenticated");
    localStorage.removeItem("rp_auth_time");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#0C1B46] p-4 md:p-6 font-sans text-white">
      <PlayerModal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.title} players={modal.players} subtitle={modal.subtitle} />
      <TeamDetailModal isOpen={teamModal.open} onClose={() => setTeamModal({ open: false, team: null })} team={teamModal.team} />
      <TeamPriorDetailModal isOpen={teamPriorModal.open} onClose={() => setTeamPriorModal({ open: false, team: null })} team={teamPriorModal.team} playerList={playerList} />

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#3A7FC3]/30 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src="/top-left-corner.png" alt="RetainPlayers" className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: 'Oswald, sans-serif' }}>
                  RETAIN<span className="text-[#5DB3F5]">PLAYERS</span>
                </h1>
                <span className="text-[#82C3FF] font-bold uppercase tracking-widest text-xs">Retention Intelligence</span>
              </div>
            </div>
            <p className="text-white font-bold text-lg mt-2">Demo Club</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex bg-[#111827] p-1 rounded-lg border border-slate-700/50">
                <button 
                  onClick={() => setSeasonMode("season-vs-season")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${seasonMode === "season-vs-season" ? "bg-[#3A7FC3] text-white" : "text-slate-400 hover:text-white"}`}
                >
                  24/25 vs 25/26
                </button>
                <button 
                  onClick={() => setSeasonMode("in-season")}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${seasonMode === "in-season" ? "bg-[#3A7FC3] text-white" : "text-slate-400 hover:text-white"}`}
                >
                  In-Season
                </button>
              </div>
            </div>
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

        {/* IN-SEASON COMING SOON */}
        {seasonMode === "in-season" && !loading && !err && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-[#111827] p-10 rounded-3xl border border-[#3A7FC3]/30 text-center max-w-lg">
              <div className="w-20 h-20 bg-[#3A7FC3]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp size={40} className="text-[#5DB3F5]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">In-Season Tracking</h2>
              <p className="text-slate-400 mb-6">
                Track player retention throughout the season with multiple roster uploads. 
                Compare January vs June, or any point during the year.
              </p>
              <div className="bg-[#0a1628] rounded-xl p-4 border border-slate-700/50">
                <p className="text-[#5DB3F5] font-bold text-sm">Coming Soon</p>
                <p className="text-slate-500 text-xs mt-1">This feature is currently in development</p>
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === "overview" && !loading && !err && seasonMode === "season-vs-season" && (
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
                sub={`${activeData.retained} of ${activeData.totalLast - agedOut} eligible players`} icon={Target} color="bg-indigo-600" 
                tooltip="Retention rate excluding aged out" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* RETENTION BY PROGRAM */}
              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50 lg:col-span-2">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-400" />Retention by Program
                  {genderFilter !== 'club' && <span className={`text-xs px-2 py-1 rounded-lg ml-2 ${genderFilter === 'boys' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{genderFilter === 'boys' ? 'Boys' : 'Girls'} only</span>}
                </h4>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredPrograms} margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar yAxisId="left" dataKey="displayRetained" name="Retained" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="displayLost" name="Lost" fill={COLORS.LOST} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="displayNew" name="New" fill={COLORS.NEW} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="displayRate" name="Retention %" stroke={COLORS.GREEN_LINE} strokeWidth={3} dot={{ r: 5, fill: COLORS.GREEN_LINE }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Users size={18} className="text-indigo-400" />Gender Split</h4>
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
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.BOYS }}></div>
                      <span className="text-sm text-slate-400">Boys</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm">{kpisGender?.boys?.totalLast || 0}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-white font-bold">{kpisGender?.boys?.totalThis || 0}</span>
                      {kpisGender?.boys && (
                        <span className={`text-xs font-bold ${((kpisGender.boys.totalThis - kpisGender.boys.totalLast) / kpisGender.boys.totalLast * 100) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({((kpisGender.boys.totalThis - kpisGender.boys.totalLast) / kpisGender.boys.totalLast * 100) >= 0 ? '+' : ''}{Math.round((kpisGender.boys.totalThis - kpisGender.boys.totalLast) / kpisGender.boys.totalLast * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.GIRLS }}></div>
                      <span className="text-sm text-slate-400">Girls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm">{kpisGender?.girls?.totalLast || 0}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-white font-bold">{kpisGender?.girls?.totalThis || 0}</span>
                      {kpisGender?.girls && (
                        <span className={`text-xs font-bold ${((kpisGender.girls.totalThis - kpisGender.girls.totalLast) / kpisGender.girls.totalLast * 100) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({((kpisGender.girls.totalThis - kpisGender.girls.totalLast) / kpisGender.girls.totalLast * 100) >= 0 ? '+' : ''}{Math.round((kpisGender.girls.totalThis - kpisGender.girls.totalLast) / kpisGender.girls.totalLast * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* DIAGNOSIS */}
        {activeTab === "diagnosis" && !loading && !err && seasonMode === "season-vs-season" && (
          <div className="space-y-6">
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <ClipboardList size={20} className="text-blue-400" />
                Retention by Age Group
                {genderFilter !== 'club' && <span className={`text-xs px-2 py-1 rounded-lg ml-2 ${genderFilter === 'boys' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{genderFilter === 'boys' ? 'Boys' : 'Girls'} only</span>}
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
                    <Bar yAxisId="left" dataKey="lost" name="Lost" fill={COLORS.LOST} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="new" name="New" fill={COLORS.NEW} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="rate" name="Retention %" stroke={COLORS.GREEN_LINE} strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By Program - Lost, Retained, New Pie Charts */}
            <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <ClipboardList size={18} className="text-blue-400" />
                By Program
                {genderFilter !== 'club' && <span className={`text-xs px-2 py-1 rounded-lg ml-2 ${genderFilter === 'boys' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{genderFilter === 'boys' ? 'Boys' : 'Girls'} only</span>}
              </h4>
              <p className="text-slate-400 text-sm mb-6">Where the bulk of Lost, Retained, and New players come from</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Lost Pie */}
                <div className="text-center">
                  <h5 className="text-rose-400 font-bold mb-3">Lost</h5>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={programDistribution.lost} 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80} 
                          dataKey="value"
                          label={({ percent }) => `${percent}%`}
                          labelLine={false}
                        >
                          {programDistribution.lost.map((entry, index) => (
                            <Cell key={`cell-lost-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-1">
                    {programDistribution.lost.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-400 truncate max-w-[100px]">{item.name}</span>
                        </div>
                        <span className="text-white font-medium">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Retained Pie */}
                <div className="text-center">
                  <h5 className="text-slate-300 font-bold mb-3">Retained</h5>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={programDistribution.retained} 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80} 
                          dataKey="value"
                          label={({ percent }) => `${percent}%`}
                          labelLine={false}
                        >
                          {programDistribution.retained.map((entry, index) => (
                            <Cell key={`cell-retained-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-1">
                    {programDistribution.retained.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-400 truncate max-w-[100px]">{item.name}</span>
                        </div>
                        <span className="text-white font-medium">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* New Pie */}
                <div className="text-center">
                  <h5 className="text-emerald-400 font-bold mb-3">New</h5>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={programDistribution.new} 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80} 
                          dataKey="value"
                          label={({ percent }) => `${percent}%`}
                          labelLine={false}
                        >
                          {programDistribution.new.map((entry, index) => (
                            <Cell key={`cell-new-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-1">
                    {programDistribution.new.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-400 truncate max-w-[100px]">{item.name}</span>
                        </div>
                        <span className="text-white font-medium">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Leaders & Risk Groups - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111827] p-4 rounded-2xl border border-emerald-500/30">
                <h5 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm"><ArrowUpRight size={16}/> Growth Leaders (Positive Change)</h5>
                <div className="flex flex-wrap gap-2">
                  {ageComparisonData.filter(a => a.change > 0).map((a, idx) => (
                    <div key={idx} className="bg-emerald-500/10 rounded-lg px-3 py-2 text-center border border-emerald-500/20">
                      <span className="text-white font-bold text-sm">{a.year}</span>
                      <span className="text-emerald-400 font-black text-sm ml-2">+{a.change}%</span>
                    </div>
                  ))}
                  {ageComparisonData.filter(a => a.change > 0).length === 0 && (
                    <span className="text-slate-500 text-sm">No growth groups</span>
                  )}
                </div>
              </div>

              <div className="bg-[#111827] p-4 rounded-2xl border border-rose-500/30">
                <h5 className="text-rose-400 font-bold mb-3 flex items-center gap-2 text-sm"><ArrowDownRight size={16}/> Risk Groups (Negative Change)</h5>
                <div className="flex flex-wrap gap-2">
                  {ageComparisonData.filter(a => a.change < 0).map((a, idx) => (
                    <div key={idx} className="bg-rose-500/10 rounded-lg px-3 py-2 text-center border border-rose-500/20">
                      <span className="text-white font-bold text-sm">{a.year}</span>
                      <span className="text-rose-400 font-black text-sm ml-2">{a.change}%</span>
                    </div>
                  ))}
                  {ageComparisonData.filter(a => a.change < 0).length === 0 && (
                    <span className="text-slate-500 text-sm">No risk groups</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIALS */}
        {activeTab === "financials" && !loading && !err && seasonMode === "season-vs-season" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 p-8 rounded-2xl shadow-lg shadow-rose-500/20">
              <div className="flex items-center gap-5">
                <div className="bg-white/20 p-4 rounded-2xl"><DollarSign size={36} className="text-white" /></div>
                <div>
                  <p className="text-rose-200 text-xs font-bold uppercase tracking-wider mb-1">Revenue Lost to Churn</p>
                  <h3 className="text-5xl font-black text-white">${exactRevenueLost.toLocaleString()}</h3>
                  <p className="text-rose-200 text-sm mt-1">{lostPlayersCount} players × actual fees</p>
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
                <p className="text-sm text-slate-500">{lostPlayersCount} players × actual fees</p>
              </div>

              <div className="bg-[#111827] p-5 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl"><UserPlus className="text-emerald-400" size={20} /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">New Revenue</p>
                    <p className="text-2xl font-black text-emerald-400">+${exactNewRevenue.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">{newPlayersCount} players × actual fees</p>
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

        {/* TEAMS - WITH SUB-TABS */}
        {activeTab === "full-roster" && !loading && !err && seasonMode === "season-vs-season" && (
          <div className="bg-[#111827] p-6 rounded-2xl border border-slate-700/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h4 className="text-xl font-bold text-white flex items-center gap-2">
                  Teams
                  {genderFilter !== 'club' && <span className={`text-xs px-2 py-1 rounded-lg ${genderFilter === 'boys' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{genderFilter === 'boys' ? 'Boys' : 'Girls'} only</span>}
                </h4>
                <p className="text-slate-400 text-sm">Click on team name for details</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="text" placeholder="Search team or coach..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0a1628] border border-slate-600/50 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <button onClick={() => exportToExcel(teamsSubTab === 'current' ? filteredTeams : filteredTeamsPrior, `Teams_${teamsSubTab}_Export`)} className="p-2.5 bg-slate-700/50 rounded-lg text-slate-400 hover:text-white"><FileSpreadsheet size={18} /></button>
              </div>
            </div>

            {/* Sub-tabs for Current vs Prior */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTeamsSubTab("current")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  teamsSubTab === "current" 
                    ? "bg-[#3A7FC3] text-white" 
                    : "bg-slate-700/50 text-slate-400 hover:text-white"
                }`}
              >
                Current (25/26)
              </button>
              <button
                onClick={() => setTeamsSubTab("prior")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  teamsSubTab === "prior" 
                    ? "bg-[#3A7FC3] text-white" 
                    : "bg-slate-700/50 text-slate-400 hover:text-white"
                }`}
              >
                Prior (24/25)
              </button>
            </div>

            {/* Current Teams Table (25/26) */}
            {teamsSubTab === "current" && (
              <>
                <p className="text-slate-500 text-xs mb-4">{filteredTeams.length} teams</p>
                {filteredTeams.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No teams found</p>
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
                          const newCount = Math.max(0, team.count - team.retained);
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-4 pr-4">
                                <button onClick={() => setTeamModal({ open: true, team })} className="text-left">
                                  <div className="font-bold text-white hover:text-[#5DB3F5] transition-colors">{team.name}</div>
                                  <div className="text-xs text-blue-400">{team.program}</div>
                                </button>
                              </td>
                              <td className="py-4 pr-4 text-slate-400 text-sm">{team.coach || '-'}</td>
                              <td className="py-4 text-center text-slate-400">{team.count}</td>
                              <td className="py-4 text-center"><button onClick={() => handleOpenPlayerList({ team: team.name, status: 'Retained' }, `Retained: ${team.name}`)} className="text-blue-400 font-bold hover:underline">{team.retained}</button></td>
                              <td className="py-4 text-center"><button onClick={() => handleOpenPlayerList({ team: team.name, status: 'New' }, `New: ${team.name}`)} className="text-emerald-400 font-bold hover:underline">{newCount}</button></td>
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
              </>
            )}

            {/* Prior Teams Table (24/25) */}
            {teamsSubTab === "prior" && (
              <>
                <p className="text-slate-500 text-xs mb-4">{filteredTeamsPrior.length} teams</p>
                {filteredTeamsPrior.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No teams found. Make sure to publish the teams_prior sheet as CSV and add VITE_SHEET_TEAMS_PRIOR_CSV to Vercel.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-700/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <th className="pb-3 pr-4">Team (24/25)</th>
                          <th className="pb-3 pr-4">Coach</th>
                          <th className="pb-3 text-center">Players</th>
                          <th className="pb-3 text-center text-emerald-400">Retained</th>
                          <th className="pb-3 text-center text-rose-400">Lost</th>
                          <th className="pb-3 text-center">Rate</th>
                          <th className="pb-3 text-right">Revenue Lost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {filteredTeamsPrior.map((team, idx) => {
                          const retRate = team.count > 0 ? Math.round((team.retained / team.count) * 100) : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-4 pr-4">
                                <button onClick={() => setTeamPriorModal({ open: true, team })} className="text-left">
                                  <div className="font-bold text-white hover:text-[#5DB3F5] transition-colors">{team.name}</div>
                                  <div className="text-xs text-blue-400">{team.program}</div>
                                </button>
                              </td>
                              <td className="py-4 pr-4 text-slate-400 text-sm">{team.coach || '-'}</td>
                              <td className="py-4 text-center text-slate-400">{team.count}</td>
                              <td className="py-4 text-center"><span className="text-emerald-400 font-bold">{team.retained}</span></td>
                              <td className="py-4 text-center"><span className="text-rose-400 font-bold">{team.lost}</span></td>
                              <td className="py-4 text-center"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${retRate >= 70 ? 'bg-emerald-500/20 text-emerald-400' : retRate >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{retRate}%</span></td>
                              <td className="py-4 text-right font-bold text-rose-400">-${(team.lost * team.fee).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* COACHES */}
        {activeTab === "coaches" && !loading && !err && seasonMode === "season-vs-season" && (
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
                        <td className="py-4 text-center"><button onClick={() => handleOpenPlayerList({ coach: coach.name, status: 'Retained' }, `Retained: ${coach.name}`)} className="text-blue-400 font-bold hover:underline">{coach.retained}</button></td>
                        <td className="py-4 text-center"><button onClick={() => handleOpenPlayerList({ coach: coach.name, status: 'Lost' }, `Lost: ${coach.name}`)} className="text-rose-400 font-bold hover:underline">{coach.lost}</button></td>
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

        {/* DEEP DIVE */}
        {activeTab === "deep-dive" && !loading && !err && seasonMode === "season-vs-season" && (
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
          <div className="flex items-center gap-2"><img src="/top-left-corner.png" alt="RetainPlayers" className="w-6 h-6" /><p>RetainPlayers • Player Retention Intelligence</p></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#5DB3F5] animate-pulse"></div><span>Live Data</span></div>
        </footer>
      </div>
    </div>
  );
}
