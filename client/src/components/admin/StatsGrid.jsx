import React from 'react';
import { THEME } from './constants';

const StatsGrid = ({ stats }) => {
  if (!stats) return null;

  const statItems = [
    { label: 'Total Tickets', val: stats.overview.totaltickets, color: 'white' },
    { label: 'Pending', val: stats.overview.pendingtickets, color: '#eab308' },
    { label: 'Assigned', val: stats.overview.assignedtickets, color: '#455185' },
    { label: 'Resolved', val: stats.overview.resolvedtickets, color: '#10b981' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
      {statItems.map((stat, i) => (
        <div key={i} className={`${THEME.glass} p-6 rounded-2xl hover:bg-white/10 transition-colors group relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-5xl font-bold" style={{ color: stat.color }}>#</div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{stat.label}</h3>
          <p className="text-4xl font-black" style={{ color: stat.color }}>{stat.val}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;