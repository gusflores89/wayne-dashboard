// src/WayneDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Legend,
} from "recharts";
import {
  UserMinus,
  RefreshCcw,
  TrendingUp,
  Award,
  Search,
  ShieldCheck,
  GraduationCap,
  ClipboardList,
  Briefcase,
  ChevronRight,
  DollarSign,
  Users,
} from "lucide-react";

import { KPIS_URL, PROGRAMS_URL, AGE_URL, TEAMS_URL, PLAYERS_URL, assertEnv } from "./data/sheet";
import { fetchKpisGender } from "./data/kpisGender";

/* -----------------------------
   Helpers CSV (simple)
------------------------------*/
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }
    cur += ch;
  }

  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
}

function rowsToObjects(rows) {
  if (!rows?.length) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? "";
    });
    out.push(obj);
  }
  return out;
}

function toNumber(x) {
  const clean = String(x ?? "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function normGender(x) {
  const g = String(x || "").toLowerCase().trim();
  if (g.startsWith("b") || g.startsWith("m")) return "boys";
  if (g.startsWith("g") || g.startsWith("f")) return "girls";
  return "club";
}

function pick(obj, candidates) {
  const keys = Object.keys(obj || {});
  for (const c of candidates) {
    const found = keys.find((k) => k.toLowerCase().trim() === c.toLowerCase().trim());
    if (found) return obj[found];
  }
  return "";
}

/* -----------------------------
   UI components
------------------------------*/
const Scorecard = ({ label, value, sub, highlight, colorClass = "" }) => (
  <div
    className={`p-8 rounded-[2rem] flex flex-col justify-center ${
      highlight ? "bg-slate-900 text-white shadow-xl" : "bg-white border border-slate-100"
    }`}
  >
    <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-slate-400">
      {label}
    </span>
    <span className={`text-5xl font-black leading-none ${colorClass}`}>{value}</span>
    <span className={`text-xs font-bold mt-3 uppercase tracking-wider ${highlight ? "text-slate-500" : "text-slate-400"}`}>
      {sub}
    </span>
  </div>
);

const KPIBox = ({ title, value, sub, icon: Icon, color, trend }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div className="flex items-start justify-between">
      <div className={`p-2 rounded-lg ${color} text-white`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Exec Metric</span>
    </div>
    <div className="mt-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      <p className={`text-xs mt-1 font-bold ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-slate-400"}`}>
        {sub}
      </p>
    </div>
  </div>
);

/* -----------------------------
   Main component
------------------------------*/
export default function WayneDashboard() {
  // valida env (si falta algo, tira error claro)
  assertEnv();

  const [activeTab, setActiveTab] = useState("overview");
  const [genderFilter, setGenderFilter] = useState("club"); // club | boys | girls
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [kpisGender, setKpisGender] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [ageDiag, setAgeDiag] = useState([]);
  const [teams, setTeams] = useState([]);

  // 1) KPIs_Gender (Club/Boys/Girls)
  useEffect(() => {
    let mounted = true;
    fetchKpisGender()
      .then((data) => mounted && setKpisGender(data))
      .catch((e) => console.error("KPIs_Gender error:", e));
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Load other CSVs (Programs / Age / Teams). (KPIS_URL y PLAYERS_URL quedan listos para futuras features)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const urls = [
          ["programs", PROGRAMS_URL],
          ["age", AGE_URL],
          ["teams", TEAMS_URL],
          // opcional: los traemos igual para chequear que existan
          ["kpis", KPIS_URL],
          ["players", PLAYERS_URL],
        ];

        const results = {};
        for (const [key, url] of urls) {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`Fetch failed (${key}): ${res.status}`);
          const text = await res.text();
          const rows = parseCSV(text);
          results[key] = rowsToObjects(rows);
        }

        if (cancelled) return;

        setPrograms(
          (results.programs || []).map((r) => ({
            name: pick(r, ["name", "program", "segment"]) || "",
            retained: toNumber(pick(r, ["retained", "Retained"])),
            lost: toNumber(pick(r, ["lost", "Lost"])),
            churn: pick(r, ["churn", "Churn", "churnRate"]) || "",
          }))
        );

        setAgeDiag(
          (results.age || []).map((r) => ({
            year: String(pick(r, ["year", "Year", "birthYear"]) || "").trim(),
            rate: toNumber(pick(r, ["rate", "Rate"])),
            eligibleRate: toNumber(pick(r, ["eligibleRate", "EligibleRate", "eligible_rate"])),
            players: toNumber(pick(r, ["players", "Players", "pool"])),
            risk: pick(r, ["risk", "Risk"]) || "",
          }))
        );

        setTeams(
          (results.teams || []).map((r) => ({
            name: pick(r, ["name", "team", "Team"]) || "",
            program: pick(r, ["program", "segment", "Program"]) || "",
            coach: pick(r, ["coach", "Coach"]) || "",
            gender: normGender(pick(r, ["gender", "Gender"])),
            lastYear: toNumber(pick(r, ["lastYear", "Players Last Year", "playersLastYear"])),
            retained: toNumber(pick(r, ["retained", "Retained"])),
            lost: toNumber(pick(r, ["lost", "Lost"])),
          }))
        );
      } catch (e) {
        console.error(e);
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 3) Active KPI numbers (from KPIs_Gender)
  const activeData = kpisGender?.[genderFilter] ?? {
    totalLastYear: 0,
    totalThisYear: 0,
    netChange: 0,
    retained: 0,
    lost: 0,
    new: 0,
    avgFee: 3000,
    revenueLost: 0,
  };

  const fee = activeData.avgFee || 3000;
  const totalRevenueLost = activeData.revenueLost || activeData.lost * fee;

  // 4) Filter teams table by gender + search
  const filteredTeams = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return (teams || []).filter((t) => {
      const matchesSearch =
        (t.name || "").toLowerCase().includes(q) || (t.coach || "").toLowerCase().includes(q);
      const matchesGender = genderFilter === "club" || t.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [teams, searchTerm, genderFilter]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* HEADER + GENDER SELECTOR */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-600 font-black uppercase tracking-widest text-[10px]">
              <ShieldCheck size={14} /> Club Intelligence System
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Executive Retention Dashboard</h1>
            <p className="text-slate-500 mt-1 font-medium italic">
              Totals segmented by <span className="font-bold">Club / Boys / Girls</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
              {[
                { id: "club", label: "Club Total", icon: ShieldCheck },
                { id: "boys", label: "Boys Only", icon: Users },
                { id: "girls", label: "Girls Only", icon: Award },
              ].map((item) => (
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
              {["overview", "diagnosis", "full-roster"].map((tab) => (
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
        </header>

        {/* STATUS */}
        {loading && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-8 text-slate-600 font-bold">
            Loading Google Sheet data...
          </div>
        )}
        {err && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-8 text-rose-700">
            <div className="font-black uppercase text-xs tracking-widest mb-1">Data Error</div>
            <div className="font-bold">{err}</div>
          </div>
        )}

        {/* TOP NUMBERS (Wayne requirement) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Scorecard label="2024–25 Total Players" value={activeData.totalLastYear.toLocaleString()} sub="Base Year" />
          <Scorecard
            label="2025–26 Total Players"
            value={activeData.totalThisYear.toLocaleString()}
            sub="Current Year"
            colorClass="text-blue-600"
          />
          <Scorecard
            label="Net Change"
            value={activeData.netChange >= 0 ? `+${activeData.netChange}` : `${activeData.netChange}`}
            sub="YoY Growth"
            highlight
            colorClass="text-emerald-400"
          />
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KPIBox title="Retained" value={activeData.retained.toLocaleString()} sub="Stayed (Y→Y)" icon={RefreshCcw} color="bg-blue-600" />
          <KPIBox title="Lost" value={activeData.lost.toLocaleString()} sub="Left (Y→N)" icon={UserMinus} color="bg-rose-500" trend="down" />
          <KPIBox title="New" value={activeData.new.toLocaleString()} sub="Joined (N→Y)" icon={TrendingUp} color="bg-indigo-600" trend="up" />
          <KPIBox title="Avg Fee" value={`$${fee.toLocaleString()}`} sub="Used for revenue impact" icon={GraduationCap} color="bg-slate-900" />
        </div>

        {/* FINANCIAL IMPACT */}
        <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-white/20 p-4 rounded-3xl">
              <DollarSign size={32} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">
                Estimated Revenue Lost ({genderFilter === "club" ? "Club" : genderFilter})
              </p>
              <h3 className="text-4xl font-black">${totalRevenueLost.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Revenue Logic</p>
            <p className="text-sm font-bold">
              {activeData.lost.toLocaleString()} Lost × ${fee.toLocaleString()}
            </p>
          </div>
        </div>

        {/* TABS */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
              <h4 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                <ClipboardList size={22} className="text-blue-600" /> Retention by Program Segment
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
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-3">
                  Placeholder — coach-level mapping
                </div>
                <Award className="text-yellow-400 mb-4" size={40} />
                <h4 className="text-2xl font-black mb-4">Coach Impact Analysis</h4>
                <p className="text-slate-400 text-lg leading-relaxed italic">
                  Once Teams/Players mapping is finalized, we’ll add retention by coach for{" "}
                  <span className="text-white font-bold">{genderFilter}</span>.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <ShieldCheck size={200} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "diagnosis" && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="mb-10">
              <h4 className="text-2xl font-black text-slate-900 mb-2">Retention Diagnostic Curve</h4>
              <p className="text-slate-500 font-medium">
                Rate = gross retention %. Eligible Rate excludes age-outs/invalid transitions.
              </p>
            </div>

            <div className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={ageDiag}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" />
                  <Area yAxisId="left" type="monotone" dataKey="eligibleRate" name="Eligible Rate" fill="#dbeafe" stroke="#3b82f6" strokeWidth={3} />
                  <Line yAxisId="left" type="monotone" dataKey="rate" name="Rate" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                  <Bar yAxisId="right" dataKey="players" name="Players" fill="#cbd5e1" barSize={16} radius={[10, 10, 0, 0]} opacity={0.35} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "full-roster" && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <h4 className="text-2xl font-black text-slate-900">
                Team Audit ({genderFilter === "club" ? "Club-wide" : genderFilter})
              </h4>
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
                    <th className="pb-4">Team & Program</th>
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
                        <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">
                          {team.program}
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-2 text-slate-500 font-bold">
                          <Briefcase size={14} className="text-slate-300" /> {team.coach || "Unassigned"}
                        </div>
                      </td>
                      <td className="py-6 text-center font-bold text-slate-400">
                        {team.lastYear ? team.lastYear.toLocaleString() : "-"}
                      </td>
                      <td className="py-6 text-center">
                        <span className="text-blue-600 font-black">{(team.retained || 0).toLocaleString()}</span>
                      </td>
                      <td className="py-6 text-center">
                        <span className="text-rose-600 font-black">{(team.lost || 0).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                  {!filteredTeams.length && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 font-bold">
                        No teams match your filter/search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <footer className="mt-16 py-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] gap-6">
          <p>Wayne Reporting Framework // Google Sheet connected</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-emerald-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Data
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
