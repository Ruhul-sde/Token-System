import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { THEME } from './constants';

const AnalyticsChart = ({ departmentStats }) => {
  // Check if we have data and if stats array has items
  if (!departmentStats || departmentStats.length === 0) {
    return (
      <div className={`${THEME.glass} rounded-3xl p-8 mb-12 border-l-4 border-l-[#ED1B2F]`}>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ED1B2F]"></span> 
          Analytics Overview
        </h3>
        <div className="h-[300px] w-full flex items-center justify-center">
          <p className="text-slate-400">No department data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${THEME.glass} rounded-3xl p-8 mb-12 border-l-4 border-l-[#ED1B2F]`}>
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#ED1B2F]"></span> 
        Analytics Overview
      </h3>
      <div className="h-[300px] w-full min-h-0 min-w-0"> {/* Added min-h-0 and min-w-0 */}
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart 
            data={departmentStats}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8" 
              tick={{fontSize: 12}} 
              axisLine={false} 
              tickLine={false} 
              minTickGap={10}
            />
            <YAxis 
              stroke="#94a3b8" 
              tick={{fontSize: 12}} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155', 
                borderRadius: '12px', 
                color: '#fff' 
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '20px',
                fontSize: '12px'
              }} 
            />
            <Bar 
              dataKey="solved" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
              barSize={20} 
              name="Resolved" 
            />
            <Bar 
              dataKey="pending" 
              fill="#eab308" 
              radius={[4, 4, 0, 0]} 
              barSize={20} 
              name="Pending" 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsChart;