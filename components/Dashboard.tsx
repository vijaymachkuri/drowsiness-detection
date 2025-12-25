import React from 'react';
import { DetectionStats, AlertLevel } from '../types';
import { Activity, Eye, Zap, AlertTriangle, Battery } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  stats: DetectionStats;
  alertLevel: AlertLevel;
  historyData: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, alertLevel, historyData }) => {
  const isCritical = alertLevel === AlertLevel.CRITICAL;
  const isWarning = alertLevel === AlertLevel.WARNING;

  const scoreColor = isCritical ? 'text-red-500' : isWarning ? 'text-yellow-400' : 'text-cyan-400';
  const borderColor = isCritical ? 'border-red-500' : 'border-cyan-500/30';

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fatigue Score */}
        <div className={`bg-gray-900/80 backdrop-blur border ${borderColor} p-4 rounded-lg relative overflow-hidden group`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase font-display">Neural Load</h3>
            <Activity size={16} className={scoreColor} />
          </div>
          <div className={`text-4xl font-bold font-display ${scoreColor} tracking-tighter`}>
            {Math.round(stats.fatigueScore)}<span className="text-sm opacity-60">%</span>
          </div>
          <div className="w-full bg-gray-800 h-1 mt-3 rounded-full overflow-hidden">
             <div 
               className={`h-full transition-all duration-300 ${isCritical ? 'bg-red-500' : 'bg-cyan-400'}`} 
               style={{ width: `${stats.fatigueScore}%` }}
             ></div>
          </div>
        </div>

        {/* EAR */}
        <div className="bg-gray-900/80 backdrop-blur border border-cyan-500/30 p-4 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase font-display">Ocular Openness</h3>
            <Eye size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-display text-white">
            {stats.ear.toFixed(2)}
          </div>
          <div className="text-xs text-cyan-500/70 mt-1">Threshold: 0.25</div>
        </div>

        {/* MAR */}
        <div className="bg-gray-900/80 backdrop-blur border border-cyan-500/30 p-4 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase font-display">Oral Variance</h3>
            <Zap size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-display text-white">
            {stats.mar.toFixed(2)}
          </div>
          <div className="text-xs text-cyan-500/70 mt-1">{stats.isYawning ? 'YAWN DETECTED' : 'Stable'}</div>
        </div>

        {/* System Status */}
        <div className={`bg-gray-900/80 backdrop-blur border ${isCritical ? 'border-red-500 animate-pulse' : 'border-cyan-500/30'} p-4 rounded-lg`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase font-display">System State</h3>
            <AlertTriangle size={16} className={isCritical ? 'text-red-500' : 'text-green-500'} />
          </div>
          <div className={`text-xl font-bold font-display ${isCritical ? 'text-red-500' : 'text-green-500'}`}>
            {isCritical ? 'CRITICAL ALERT' : 'OPTIMAL'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Monitoring active</div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 bg-gray-900/80 backdrop-blur border border-cyan-500/30 p-4 rounded-lg min-h-[200px] flex flex-col">
        <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase font-display mb-4">Fatigue Timeline</h3>
        <div className="flex-1 w-full h-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#050505', borderColor: '#00f3ff', color: '#fff' }}
                  itemStyle={{ color: '#00f3ff' }}
                />
                <Area type="monotone" dataKey="score" stroke="#00f3ff" fillOpacity={1} fill="url(#colorScore)" />
             </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;