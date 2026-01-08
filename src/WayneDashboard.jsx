import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, Area, Legend
} from 'recharts';
import { 
  UserMinus, RefreshCcw, TrendingUp, Award, Search, ShieldCheck, 
  GraduationCap, ClipboardList, Briefcase, ChevronRight
} from 'lucide-react';

/**
 * DATOS ESTRATÉGICOS (Basados en el análisis de retención del club)
 */
const DATA_24_25_VS_25_26 = {
  totalLastYear: 601,
  totalThisYear: 545,
  retained: 338,
  lost: 263,
  new: 207,
  ageOuts: 42, // Jugadores graduados por edad
  retentionRate: 56.2,
  eligibleRetention: 60.5,
  churnRate: 43.8,
  netChange: -56
};

const PROGRAMS = [
  { name: 'MLS Next', retained: 85, lost: 25, churn: 22.7 },
  { name: 'Academy', retained: 140, lost: 110, churn: 44.0 },
  { name: 'NPL/Pre-NPL', retained: 65, lost: 78, churn: 54.5 },
  { name: 'Early Dev (7v7)', retained: 48, lost: 50, churn: 51.0 },
];

const AGE_DIAGNOSTIC = [
  { year: '2008', rate: 46.8, eligibleRate: 49.2, players: 47 },
  { year: '2009', rate: 44.8, eligibleRate: 46.5, players: 58 },
  { year: '2010', rate: 58.9, eligibleRate: 61.2, players: 56 },
  { year: '2011', rate: 54.3, eligibleRate: 55.0, players: 57 },
  { year: '2012', rate: 72.0, eligibleRate: 74.5, players: 68 },
  { year: '2013', rate: 73.6, eligibleRate: 75.1, players: 76 },
  { year: '2014', rate: 77.7, eligibleRate: 78.0, players: 63 },
  { year: '2015', rate: 71.4, eligibleRate: 72.0, players: 35 },
  { year: '2016', rate: 54.0, eligibleRate: 54.0, players: 37 },
  { year: '2017', rate: 42.8, eligibleRate: 42.8, players: 28 },
  { year: '2018', rate: 40.0, eligibleRate: 40.0, players: 25 },
];

const FULL_TEAM_LIST = [
  { name: '2013 Academy I', program: 'Academy', rate: 100, count: 13, coach: 'Gustavo R.' },
  { name: '2014 Pre MLS', program: 'MLS Next', rate: 90, count: 27, coach: 'Mike S.' },
  { name: '2013 Pre-MLS', program: 'MLS Next', rate: 88, count: 16, coach: 'Mike S.' },
  { name: '2010 MLS', program: 'MLS Next', rate: 88, count: 22, coach: 'Alex T.' },
  { name: '2014 Academy I', program: 'Academy', rate: 86, count: 13, coach: 'Gustavo R.' },
  { name: '2016 Pre MLS', program: 'MLS Next', rate: 83, count: 10, coach: 'Sarah L.' },
  { name: '2010 MLS 2', program: 'MLS Next', rate: 82, count: 14, coach: 'Alex T.' },
  { name: '2013 Academy II', program: 'Academy', rate: 81, count: 9, coach: 'Gustavo R.' },
  { name: '2015 Pre MLS', program: 'MLS Next', rate: 81, count: 9, coach: 'Sarah L.' },
  { name: '2013 Pre-NPL', program: 'NPL', rate: 81, count: 13, coach: 'Kevin J.' },
  { name: '2012 MLS', program: 'MLS Next', rate: 77, count: 14, coach: 'Mike S.' },
  { name: '2012 Academy I', program: 'Academy', rate: 72, count: 16, coach: 'Gustavo R.' },
  { name: '2012 NPL', program: 'NPL', rate: 72, count: 13, coach: 'Kevin J.' },
  { name: '2015 Academy II', program: 'Academy', rate: 70, count: 7, coach: 'Sarah L.' },
  { name: '2009 MLS', program: 'MLS Next', rate: 66, count: 16, coach: 'Alex T.' },
  { name: '2011 Academy I', program: 'Academy', rate: 63, count: 7, coach: 'Kevin J.' },
];

// --- COMPONENTES AUXILIARES ---

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
      <p className={`text-xs mt-1 font-bold ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
        {sub}
      </p>
    </div>
  </div>
);

export default function WayneDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeams = useMemo(() => {
    // Blindaje contra nulos y mejora de búsqueda para evitar crashes
    const q = searchTerm.toLowerCase().trim();
    return FULL_TEAM_LIST.filter(t => 
      (t.name || '').toLowerCase().includes(q) || 
      (t.coach || '').toLowerCase().includes(q)
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER EXECUTIVO */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-600 font-black uppercase tracking-widest text-[10px]">
              <ShieldCheck size={14} /> Club Intelligence System
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
            <p className="text-slate-500 mt-1 font-medium italic">Comparison: <span className="text-blue-600 font-bold">Season 24/25</span> → <span className="text-emerald-600 font-bold">Season 25/26</span></p>
          </div>
          
          <nav className="flex bg-slate-200/50 rounded-xl p-1 gap-1">
            {['overview', 'diagnosis', 'full-roster'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </header>

        {/* CONTROL PANEL: KPIs PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KPIBox title="Gross Retention" value={`${DATA_24_25_VS_25_26.retentionRate}%`} sub="24/25 → 25/26 Rate" icon={RefreshCcw} color="bg-blue-600" />
          <KPIBox title="Churn Rate (Lost %)" value={`${DATA_24_25_VS_25_26.churnRate}%`} sub={`${DATA_24_25_VS_25_26.lost} players left`} icon={UserMinus} color="bg-rose-500" trend="down" />
          <KPIBox title="Eligible Retention" value={`${DATA_24_25_VS_25_26.eligibleRetention}%`} sub={`Excludes ${DATA_24_25_VS_25_26.ageOuts} Age-outs`} icon={GraduationCap} color="bg-indigo-600" />
          <KPIBox title="Net Change" value={DATA_24_25_VS_25_26.netChange} sub="Final Season Balance" icon={TrendingUp} color="bg-slate-900" trend="down" />
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
              <h4 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                <ClipboardList size={22} className="text-blue-600" /> Retention by Program Segment
              </h4>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={PROGRAMS} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontStyle="bold" width={100} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="retained" name="Retained" stackId="a" fill="#3b82f6" barSize={35} />
                    <Bar dataKey="lost" name="Lost" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl text-white flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-3">
                  Placeholder — coach-level data not connected yet
                </div>
                <Award className="text-yellow-400 mb-4" size={40} />
                <h4 className="text-2xl font-black mb-4">Coach Impact Analysis</h4>
                <p className="text-slate-400 text-lg leading-relaxed italic">
                  Coach-level retention metrics will appear here once we connect rosters with coach assignments (24/25 vs 25/26).
                </p>
              </div>
              <div className="mt-8 space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-sm font-bold text-slate-300">Next step:</span>
                  <span className="text-emerald-400 font-black text-[10px] uppercase tracking-tighter">Add Coach Assignments</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-sm font-bold text-slate-300">Output:</span>
                  <span className="text-blue-400 font-black">Retention by Coach</span>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <ShieldCheck size={200} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="mb-10">
              <h4 className="text-2xl font-black text-slate-900 mb-2">Retention Diagnostic Curve</h4>
              <p className="text-slate-500 font-medium">Visualization of "leakage" points by birth year. Eligible rate excludes graduation gaps.</p>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={AGE_DIAGNOSTIC}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} />
                  
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} unit="%" domain={[0, 100]} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} domain={[0, 'dataMax + 10']} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />

                  <Tooltip 
                    formatter={(value, name) => {
                      const label = String(name || '');
                      if (label.includes('%')) return [`${value}%`, label];
                      return [value, label];
                    }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" />

                  <Area yAxisId="left" type="monotone" dataKey="eligibleRate" name="Eligible Retention %" fill="#dbeafe" stroke="#3b82f6" strokeWidth={4} />
                  <Line yAxisId="left" type="monotone" dataKey="rate" name="Gross Retention %" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                  <Bar yAxisId="right" dataKey="players" name="Players Pool" fill="#cbd5e1" barSize={15} radius={[10, 10, 0, 0]} opacity={0.3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'full-roster' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <h4 className="text-2xl font-black text-slate-900">Comprehensive Roster Analysis</h4>
              <div className="relative w-full md:w-80">
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
                    <th className="pb-4 text-center">Retention %</th>
                    <th className="pb-4 text-center">Players</th>
                    <th className="pb-4">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTeams.map((team, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-6">
                        <div className="font-black text-slate-900">{team.name}</div>
                        <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">{team.program}</div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-2 text-slate-500 font-bold">
                          <Briefcase size={14} className="text-slate-300" /> {team.coach || 'Unassigned'}
                        </div>
                      </td>
                      <td className="py-6 text-center">
                        <span className={`text-xl font-black ${team.rate >= 80 ? 'text-emerald-600' : team.rate >= 60 ? 'text-blue-600' : 'text-rose-500'}`}>
                          {team.rate}%
                        </span>
                      </td>
                      <td className="py-6 text-center font-bold text-slate-400">{team.count}</td>
                      <td className="py-6">
                        <div className="w-full max-w-[150px] h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${team.rate >= 80 ? 'bg-emerald-500' : team.rate >= 60 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${team.rate}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <footer className="mt-16 py-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] gap-6">
          <p>Wayne Reporting Framework v3.0 // Template ready — Google Sheet connection pending</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live Diagnosis</span>
            <span className="text-slate-300">|</span>
            <button className="hover:text-slate-900 transition-colors flex items-center gap-2">Export Detailed PDF <ChevronRight size={12} /></button>
          </div>
        </footer>
      </div>
    </div>
  );
}