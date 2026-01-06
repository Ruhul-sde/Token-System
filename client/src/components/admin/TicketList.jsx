import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { THEME, getStatusColor, getPriorityColor } from './constants';

const TicketList = () => {
  const { 
    filteredTickets, 
    departments, 
    filters, 
    updateFilters,
    openTicketModal
  } = useAdmin();

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        {['status', 'priority', 'department'].map(filterType => (
          <div key={filterType} className="relative group">
            <select
              value={filters[filterType]}
              onChange={(e) => updateFilters({ [filterType]: e.target.value })}
              className="appearance-none bg-[#1e293b] border border-[#334155] text-slate-300 pl-4 pr-10 py-2.5 rounded-xl focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent outline-none capitalize min-w-[160px] cursor-pointer hover:border-[#455185] transition-colors"
            >
              <option value="all">All {filterType}</option>
              {filterType === 'status' && ['pending', 'assigned', 'in-progress', 'resolved'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
              {filterType === 'priority' && ['high', 'medium', 'low'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
              {filterType === 'department' && departments.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
          </div>
        ))}
      </div>

      {/* Ticket List */}
      <div className="grid gap-4">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <div className="text-6xl mb-4 grayscale">📭</div>
            <p>No tickets found matching filters</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket._id}
              onClick={() => openTicketModal(ticket)}
              className={`group relative ${THEME.glass} p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:border-[#455185] hover:shadow-[0_0_20px_rgba(69,81,133,0.2)]`}
            >
              <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-[#ED1B2F] to-[#455185] rounded-r-full group-hover:w-2 transition-all"></div>
              <div className="pl-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#ED1B2F] transition-colors">
                      {ticket.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-1 mb-3">{ticket.description}</p>
                  <div className="flex gap-4 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">👤 {ticket.createdBy?.name}</span>
                    <span className="flex items-center gap-1">📅 {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket.department && <span className="text-[#455185]">🏢 {ticket.department.name}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs font-mono text-slate-600 bg-black/20 px-2 py-1 rounded">
                    #{ticket.ticketNumber || ticket._id?.slice(-6)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default TicketList;