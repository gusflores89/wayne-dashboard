import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Users, UserPlus, UserMinus, RefreshCcw, TrendingUp, Award, AlertTriangle, ChevronRight, Activity
} from 'lucide-react';

// Data extracted from the provided CSV files
const KPI_DATA = {
  totalLastYear: 601,
  totalThisYear: 545,
  retained: 338,
  lost: 263,
  new: 207,
  retentionRate: 56.2,
  netChange: -56
};

const COMPOSITION_DATA = [
  { name: 'Retained', value: 338, color: '#3b82f6' },
  { name: 'New', value: 207, color: '#10b981' },
];

const AGE_GROUP_DATA = [
  { year: '2008', rate: 46.8, players: 47 },
  { year: '2009', rate: 44.8, players: 58 },
  { year: '2010', rate: 58.9, players: 56 },
  { year: '2011', rate: 54.3, players: 57 },
  { year: '2012', rate: 72.0, players: 68 },
  { year: '2013', rate: 73.6, players: 76 },
  { year: '2014', rate: 77.7, players: 63 },
  { year: '2015', rate: 71.4, players: 35 },
  { year: '2016', rate: 54.0, players: 37 },
  { year: '2017', rate: 42.8, players: 28 },
  { year: '2018', rate: 40.0, players: 25 },
  { year: '2019', rate: 100.0, players: 4 },
];

const TOP_TEAMS = [
  { name: '2013 Academy I', rate: 100, retained: 13 },
  { name: '2014 Pre MLS', rate: 90, retained: 27 },
  { name: '2013 Pre-MLS', rate: 88.8, retained: 16 },
  { name: '2010 MLS', rate: 88, retained: 22 },
  { name: '2014 Academy I', rate: 86.6, retained: 13 },
];

const StatCard = ({ title, value, subValue, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      {subValue && (
        <div className={`mt-2 flex items-center text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
          {subValue}
        </div>
      )}
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wayne Retention Framework</h1>
            <p className="text-gray-500">Season 24/25 vs 25/26 | Squad Analysis</p>
          </div>
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 self-start">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('teams')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'teams' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Teams & Ages
            </button>
          </div>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Retention Rate" 
            value={`${KPI_DATA.retentionRate}%`} 
            subValue="Club Average" 
            icon={RefreshCcw} 
            color="bg-blue-500"
          />
          <StatCard 
            title="Retained Players" 
            value={KPI_DATA.retained} 
            subValue={`${KPI_DATA.totalLastYear} total last year`} 
            icon={Users} 
            color="bg-indigo-500"
          />
          <StatCard 
            title="New Players" 
            value={KPI_DATA.new} 
            subValue="New signings this season" 
            icon={UserPlus} 
            color="bg-emerald-500"
          />
          <StatCard 
            title="Net Change" 
            value={KPI_DATA.netChange} 
            subValue="Vs. Last Year" 
            icon={TrendingUp} 
            color="bg-orange-500"
            trend="down"
          />
        </div>

        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Composition Pie Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1">
              <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Activity size={20} className="text-blue-500" />
                Current Squad Mix
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={COMPOSITION_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {COMPOSITION_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Players 25/26:</span>
                  <span className="text-sm font-bold">{KPI_DATA.totalThisYear}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Lost Players:</span>
                  <span className="text-sm font-bold text-red-500">{KPI_DATA.lost}</span>
                </div>
              </div>
            </div>

            {/* Seasonal Comparison */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
              <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-500" />
                Volume by Birth Year
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={AGE_GROUP_DATA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="players" name="Players" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 text-xs text-gray-400 italic">
                * Birth years 2012-2014 represent the largest player pools in the club.
              </p>
            </div>

            {/* Top Teams Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Award size={20} className="text-yellow-500" />
                  Retention Leaders (Top 5 Teams)
                </h4>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Metric: Retention %</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 font-semibold text-sm text-gray-500">Team Name</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Retention %</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Retained Count</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Team Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {TOP_TEAMS.map((team, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 font-medium text-gray-900">{team.name}</td>
                        <td className="py-4">
                          <span className="text-blue-600 font-bold">{team.rate}%</span>
                        </td>
                        <td className="py-4 text-gray-600">{team.retained}</td>
                        <td className="py-4">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${team.rate}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Loyalty by Age Line Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500" />
                Loyalty by Birth Year (Retention Rate %)
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={AGE_GROUP_DATA}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} unit="%" />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      name="Retention Rate" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorRate)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 p-4 bg-amber-50 rounded-xl flex gap-4 items-center">
                <AlertTriangle className="text-amber-500 flex-shrink-0" size={24} />
                <p className="text-sm text-amber-800">
                  <span className="font-bold">Insight:</span> Retention drops significantly in birth years <span className="font-bold">2017 and 2018</span>. It is recommended to investigate coaching changes or local competition for these entry-level age groups.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lost Players Summary */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <UserMinus size={20} className="text-red-500" />
                  Churn / Lost Players
                </h4>
                <div className="flex items-end gap-4 mb-6">
                  <span className="text-4xl font-bold text-red-500">{KPI_DATA.lost}</span>
                  <span className="text-sm text-gray-500 pb-1">Did not return this season</span>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Financial Impact</p>
                    <p className="text-sm text-gray-700">Represents approximately 43% of the previous season's roster pool.</p>
                  </div>
                  <button className="w-full py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                    View exit reason report <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* New Players Summary */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <UserPlus size={20} className="text-emerald-500" />
                  New Acquisitions
                </h4>
                <div className="flex items-end gap-4 mb-6">
                  <span className="text-4xl font-bold text-emerald-500">{KPI_DATA.new}</span>
                  <span className="text-sm text-gray-500 pb-1">Newly registered players</span>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Attraction Strength</p>
                    <p className="text-sm text-gray-700">The club offset 78% of player losses through new talent acquisition.</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <TrendingUp size={16} /> High demand in 2014-2015 categories
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-400 text-sm">
          <p>© 2024 Wayne Retention Analysis Framework - System Generated Report</p>
        </footer>
      </div>
    </div>
  );
};

export default App;