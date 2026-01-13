import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Area, Legend,
} from "recharts";
import {
  UserMinus, RefreshCcw, TrendingUp, Award, Search, ShieldCheck,
  GraduationCap, ClipboardList, Briefcase, ChevronRight, DollarSign, X, Users, Target
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. CONFIGURACIÓN: PEGA AQUÍ TUS LINKS DE GOOGLE SHEETS (CSV)               */
/* -------------------------------------------------------------------------- */

// Función segura para obtener variables de entorno
const getEnvVar = (key) => {
  try {
    return import.meta.env[key] || "";
  } catch (e) {
    return "";
  }
};

const URLS = {
  KPIS: getEnvVar("VITE_SHEET_KPIS_GENDER_CSV"), 
  PROGRAMS: getEnvVar("VITE_SHEET_PROGRAMS_CSV"),
  AGE: getEnvVar("VITE_SHEET_AGE_CSV"),
  TEAMS: getEnvVar("VITE_SHEET_TEAMS_CSV"),
  PLAYERS: getEnvVar("VITE_SHEET_PLAYERS_CSV") 
};

/* -------------------------------------------------------------------------- */
/* HELPERS (Para leer y limpiar los datos del Excel)                          */
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
  if (n > 10000) return Math.round(n / 1000000); 
  return n;
}

/* -------------------------------------------------------------------------- */
/* COMPONENTES VISUALES                                                       */
/* -------------------------------------------------------------------------- */

const PlayerModal = ({ isOpen, onClose, title, players }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{zIndex: 100}}>
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Player List</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          {players.length === 0 ? (
            <p className="text-center text-slate-400 text-sm italic py-8">No data available.</p>
          ) : (
            <ul className="space-y-2">
              {players.map((p, i) => (
                <li key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">
                      {p.name ? p.name.charAt(0) : '?'}
                    </div>
                    {p.name}
                  </div>
                  {p.status && <span className={`text-[10px] px-2 py-1 rounded-full ${p.status === 'Lost' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{p.status}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
          <button onClick={onClose} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Close</button>
        </div>
      </div>
    </div>
  );
};

const Scorecard = ({ label, value, sub, highlight, colorClass = "" }) => (
  <div className={`p-8 rounded-[2rem] flex flex-col justify-center transition-all duration-300 ${highlight ? "bg-slate-900 text-white shadow-xl scale-105" : "bg-white border border-slate-100"}`}>
    <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${highlight ? "text-slate-400" : "text-slate-400"}`}>{label}</span>
    <span className={`text-5xl font-black leading-none ${colorClass}`}>{value}</span>
    <span className={`text-xs font-bold mt-3 uppercase tracking-wider ${highlight ? "text-slate-500" : "text-slate-400"}`}>{sub}</span>
  </div>
);

const KPIBox = ({ title, value, sub, icon: Icon, color, trend }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div className="flex items-start justify-between">
      <div className={`p-2 rounded-lg ${color} text-white`}><Icon size={20} /></div>
      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Exec Metric</span>
    </div>
    <div className="mt-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      <p className={`text-xs mt-1 font-bold ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-slate-400"}`}>{sub}</p>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* COMPONENTE PRINCIPAL                                                       */
/* -------------------------------------------------------------------------- */

export default function WayneDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [genderFilter, setGenderFilter] = useState("club");
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState({ open: false, title: "", players: [] });
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
        if (!URLS.KPIS) {
           console.log("No ENV variables found. Using Demo Data.");
           // ... (Demo data fallback si es necesario)
           setLoading(false);
           return;
        }

        const responses = await Promise.all([
          fetch(URLS.KPIS).then(res => res.text()),
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
            // Ya no dependemos solo de este promedio global
            fee: toNumber(pick(r, ["Avg Fee", "avgFee"])) || 3000, 
            revenueLost: toNumber(pick(r, ["Revenue Lost", "revenueLost"]))
          };
        });
        setKpisGender(kpiMap);

        // 2. Programs
        const progRows = rowsToObjects(parseCSV(progText));
        setPrograms(progRows.map(r => ({
          name: pick(r, ["name", "Name"]),
          retained: toNumber(pick(r, ["retained", "Retained"])),
          lost: toNumber(pick(r, ["lost", "Lost"]))
        })));

        // 3. Age Diagnostic
        const ageRows = rowsToObjects(parseCSV(ageText));
        setAgeDiag(ageRows.map(r => ({
          year: pick(r, ["year", "Year"]),
          rate: normalizePercent(pick(r, ["rate", "Rate"])),
          eligibleRate: normalizePercent(pick(r, ["eligibleRate", "EligibleRate"])),
          players: toNumber(pick(r, ["players", "Players"]))
        })));

        // 4. Teams (AHORA CON FEE INDIVIDUAL)
        const teamRows = rowsToObjects(parseCSV(teamText));
        setTeams(teamRows.map(r => ({
          name: pick(r, ["name", "Team", "Team (Last Yr)"]),
          program: pick(r, ["program", "Program"]),
          coach: pick(r, ["coach", "Coach"]) || "Unassigned",
          lastYear: toNumber(pick(r, ["count", "Players Last Yr", "lastYear"])),
          retained: toNumber(pick(r, ["retained", "Retained"])),
          lost: toNumber(pick(r, ["lost", "Lost"])),
          gender: (pick(r, ["name", "Team"]) || "").toLowerCase().includes("girls") ? "girls" : "boys",
          // Aquí capturamos el precio individual del equipo
          // Si no existe la columna en el Excel, usa 3000 como backup
          fee: toNumber(pick(r, ["Fee", "fee", "Cost", "cost", "Price"])) || 3000 
        })));

        // 5. Players Master
        const playerRows = rowsToObjects(parseCSV(playerText));
        setPlayerList(playerRows.map(r => {
          // Lógica de estado si no viene explícita
          const regLast = pick(r, ["Registered Last Yr (Y/N)", "Registered Last Yr"]);
          const regThis = pick(r, ["Registered This Yr (Y/N)", "Registered This Yr"]);
          let status = "Unknown";
          if (regLast === 'Y' && regThis === 'Y') status = "Retained";
          else if (regLast === 'Y' && regThis !== 'Y') status = "Lost";
          else if (regLast !== 'Y' && regThis === 'Y') status = "New";

          return {
            name: `${pick(r, ["first_name", "First Name"])} ${pick(r, ["last_name", "Last Name"])}`,
            status: status,
            teamLast: pick(r, ["Team (Last Yr)", "team_last"]),
            teamThis: pick(r, ["Team (This Yr)", "team_this"]),
            gender: pick(r, ["gender", "Gender"]),
            coach: pick(r, ["coach", "Coach"])
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
    totalLast: 0, totalThis: 0, net: 0, retained: 0, lost: 0, new: 0, fee: 3000, revenueLost: 0
  };

  // CÁLCULO FINANCIERO MEJORADO:
  // Filtramos los equipos por género y sumamos (Jugadores Perdidos del Equipo * Precio de ESE Equipo)
  const exactRevenueLost = useMemo(() => {
    if (teams.length === 0) return 0;
    
    // Filtramos equipos según el selector (Club, Boys, Girls)
    const relevantTeams = teams.filter(t => {
      if (genderFilter === 'club') return true;
      return t.gender === genderFilter;
    });

    // Sumatoria exacta: (Perdidos * Fee) de cada equipo
    return relevantTeams.reduce((total, team) => {
      return total + (team.lost * team.fee);
    }, 0);
  }, [teams, genderFilter]);

  // Si el cálculo exacto da 0 (quizás no llenaron la columna Fee aún), usamos el promedio global como backup
  const displayRevenueLost = exactRevenueLost > 0 ? exactRevenueLost : (activeData.lost * 3000);

  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return teams.filter((t) => {
      const matchesSearch = (t.name || "").toLowerCase().includes(q) || (t.coach || "").toLowerCase().includes(q);
      const matchesGender = genderFilter === "club" || (t.gender && t.gender.toLowerCase() === genderFilter);
      return matchesSearch && matchesGender;
    });
  }, [teams, searchTerm, genderFilter]);

  // Deep Dive Logic
  const deepDiveStats = useMemo(() => {
    if (!selectedEntity.id) return null;
    
    if (selectedEntity.type === 'coach') {
      const coachTeams = teams.filter(t => t.coach === selectedEntity.id);
      if (coachTeams.length === 0) return null;

      const totalLost = coachTeams.reduce((acc, curr) => acc + curr.lost, 0);
      const totalRet = coachTeams.reduce((acc, curr) => acc + curr.retained, 0);
      const totalLast = coachTeams.reduce((acc, curr) => acc + curr.lastYear, 0);
      // Revenue perdido específico de este coach (usando los fees de sus equipos)
      const lostRevenue = coachTeams.reduce((acc, curr) => acc + (curr.lost * curr.fee), 0);
      
      return {
        name: selectedEntity.id,
        teams: coachTeams,
        retentionRate: totalLast > 0 ? Math.round((totalRet / totalLast) * 100) : 0,
        totalLost,
        lostRevenue
      };
    } else {
      const team = teams.find(t => t.name === selectedEntity.id);
      return team ? {
        name: team.name,
        teams: [team],
        retentionRate: team.lastYear > 0 ? Math.round((team.retained / team.lastYear) * 100) : 0,
        totalLost: team.lost,
        lostRevenue: team.lost * team.fee
      } : null;
    }
  }, [selectedEntity, teams]);

  const uniqueCoaches = useMemo(() => [...new Set(teams.map(t => t.coach).filter(c => c && c !== "Unassigned"))].sort(), [teams]);
  const uniqueTeams = useMemo(() => [...new Set(teams.map(t => t.name))].sort(), [teams]);

  const handleOpenPlayerList = (teamName, statusType) => {
    const matchedPlayers = playerList.filter(p => {
      if (statusType === 'Retained') {
        return (p.status === 'Retained' || p.status === 'Y') && p.teamLast === teamName;
      }
      if (statusType === 'Lost') {
        return (p.status === 'Lost' || p.status === 'N') && p.teamLast === teamName;
      }
      return false;
    });

    setModal({
      open: true,
      title: `${statusType}: ${teamName}`,
      players: matchedPlayers
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <PlayerModal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })} title={modal.title} players={modal.players} />

      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-600 font-black uppercase tracking-widest text-[10px]">
              <ShieldCheck size={14} /> Club Intelligence System
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Executive Retention Dashboard</h1>
            <p className="text-slate-500 mt-1 font-medium italic">
              Segmentation: <span className="font-bold">Club / Boys / Girls</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
              {[{ id: "club", label: "Club Total", icon: ShieldCheck }, { id: "boys", label: "Boys Only", icon: Users }, { id: "girls", label: "Girls Only", icon: Award }].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setGenderFilter(item.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    genderFilter === item.id ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>

            <nav className="flex bg-slate-200/50 rounded-xl p-1 gap-1">
              {["overview", "diagnosis", "full-roster", "deep-dive"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.replace("-", " ")}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* LOADING */}
        {loading && <div className="bg-white p-6 rounded-2xl text-center font-bold text-slate-400 animate-pulse mb-8">Loading live data...</div>}
        {err && <div className="bg-rose-50 p-6 rounded-2xl text-center font-bold text-rose-500 mb-8">{err}</div>}

        {/* TOP NUMBERS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Scorecard label="2024–25 Total Players" value={activeData.totalLast.toLocaleString()} sub="Base Year" />
          <Scorecard label="2025–26 Total Players" value={activeData.totalThis.toLocaleString()} sub="Current Year" colorClass="text-blue-600" />
          <Scorecard label="Net Change" value={activeData.net >= 0 ? `+${activeData.net}` : `${activeData.net}`} sub="YoY Growth" highlight colorClass="text-emerald-400" />
        </div>

        {/* KPI ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KPIBox title="Retained" value={activeData.retained.toLocaleString()} sub="Stayed (Y→Y)" icon={RefreshCcw} color="bg-blue-600" />
          <KPIBox title="Lost" value={activeData.lost.toLocaleString()} sub="Left (Y→N)" icon={UserMinus} color="bg-rose-500" trend="down" />
          <KPIBox title="New" value={activeData.new.toLocaleString()} sub="Joined (N→Y)" icon={TrendingUp} color="bg-indigo-600" trend="up" />
          <KPIBox title="Avg Fee" value={`$${activeData.fee.toLocaleString()}`} sub="Global Avg Ref" icon={GraduationCap} color="bg-slate-900" />
        </div>

        {/* FINANCIAL IMPACT (DINÁMICO) */}
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-white/20 p-4 rounded-3xl"><DollarSign size={32} /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Estimated Revenue Lost ({genderFilter})</p>
              <h3 className="text-4xl font-black">${displayRevenueLost.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Revenue Logic</p>
            <p className="text-sm font-bold">
              {/* Mostramos el texto adecuado según si usamos el cálculo exacto o el estimado */}
              {exactRevenueLost > 0 ? "Exact Sum (Lost Players × Team Fee)" : "Estimated (Lost Players × Avg Fee)"}
            </p>
          </div>
        </div>

        {/* TABS CONTENT */}
        
        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
              <h4 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                <ClipboardList size={22} className="text-blue-600" /> Retention by Program
              </h4>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programs} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Legend />
                    <Bar dataKey="retained" name="Retained" stackId="a" fill="#3b82f6" barSize={35} />
                    <Bar dataKey="lost" name="Lost" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-3xl text-white flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-3">Staff Intelligence</div>
                <Award className="text-yellow-400 mb-4" size={40} />
                <h4 className="text-2xl font-black mb-4">Coach Impact</h4>
                <p className="text-slate-400 text-lg leading-relaxed italic">
                  See individual performance metrics in the "Deep Dive" tab.
                </p>
              </div>
              <button onClick={() => setActiveTab('deep-dive')} className="relative z-10 w-full py-4 bg-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all">
                Go to Deep Dive
              </button>
            </div>
          </div>
        )}

        {/* 2. DIAGNOSIS */}
        {activeTab === "diagnosis" && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h4 className="text-2xl font-black text-slate-900 mb-10">Diagnostic Curve (Age)</h4>
            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ageDiag}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" />
                  <Area yAxisId="left" type="monotone" dataKey="eligibleRate" name="Eligible %" fill="#dbeafe" stroke="#3b82f6" strokeWidth={3} />
                  <Line yAxisId="left" type="monotone" dataKey="rate" name="Gross %" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                  <Bar yAxisId="right" dataKey="players" name="Total Players" fill="#cbd5e1" barSize={16} radius={[10, 10, 0, 0]} opacity={0.35} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. FULL ROSTER */}
        {activeTab === "full-roster" && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <h4 className="text-2xl font-black text-slate-900">Team Audit ({genderFilter})</h4>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Filter by team or coach..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <th className="pb-4">Team</th>
                    <th className="pb-4">Coach</th>
                    <th className="pb-4 text-center">Prev</th>
                    <th className="pb-4 text-center">Retained</th>
                    <th className="pb-4 text-center">Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTeams.map((team, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-6">
                        <div className="font-black text-slate-900">{team.name}</div>
                        <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">{team.program}</div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-2 text-slate-500 font-bold">
                          <Briefcase size={14} className="text-slate-300" /> {team.coach}
                        </div>
                      </td>
                      <td className="py-6 text-center font-bold text-slate-400">{team.lastYear}</td>
                      <td className="py-6 text-center">
                        <button onClick={() => handleOpenPlayerList(team.name, 'Retained')} className="text-blue-600 font-black hover:underline">{team.retained}</button>
                      </td>
                      <td className="py-6 text-center">
                        <button onClick={() => handleOpenPlayerList(team.name, 'Lost')} className="text-rose-600 font-black hover:underline">{team.lost}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. DEEP DIVE */}
        {activeTab === "deep-dive" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Select Focus</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block">By Coach</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"
                    onChange={(e) => setSelectedEntity({ type: 'coach', id: e.target.value })}
                    value={selectedEntity.type === 'coach' ? selectedEntity.id : ''}
                  >
                    <option value="">Select...</option>
                    {uniqueCoaches.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="relative text-center"><span className="bg-white px-2 text-[10px] text-slate-300 font-black">OR</span></div>
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase mb-1 block">By Team</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"
                    onChange={(e) => setSelectedEntity({ type: 'team', id: e.target.value })}
                    value={selectedEntity.type === 'team' ? selectedEntity.id : ''}
                  >
                    <option value="">Select...</option>
                    {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {deepDiveStats ? (
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white"><Briefcase size={32} /></div>
                      <div>
                        <h2 className="text-3xl font-black text-slate-900">{deepDiveStats.name}</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">{selectedEntity.type.toUpperCase()} PROFILE</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center px-6 border-r border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Lost</p>
                        <p className="text-2xl font-black text-rose-500">{deepDiveStats.totalLost}</p>
                      </div>
                      <div className="text-center px-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Est. Revenue Impact</p>
                        <p className="text-2xl font-black text-rose-500">-${deepDiveStats.lostRevenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Lista de equipos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepDiveStats.teams.map((t, idx) => (
                      <div key={idx} className="p-6 bg-white rounded-3xl border border-slate-200">
                        <div className="flex justify-between mb-4">
                          <p className="font-black text-slate-900">{t.name}</p>
                          <span className={(t.retained/t.lastYear) >= 0.8 ? 'text-emerald-600 font-black' : 'text-blue-600 font-black'}>
                            {t.lastYear > 0 ? Math.round((t.retained/t.lastYear)*100) : 0}%
                          </span>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleOpenPlayerList(t.name, 'Retained')} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold">View Retained</button>
                           <button onClick={() => handleOpenPlayerList(t.name, 'Lost')} className="text-[10px] bg-rose-50 text-rose-600 px-3 py-1 rounded-lg font-bold">View Lost</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-bold">
                  Select a Coach or Team to analyze.
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="mt-16 py-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] gap-6">
          <p>Wayne Reporting Framework // Connected to Google Sheets</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Data</span>
          </div>
        </footer>
      </div>
    </div>
  );
}