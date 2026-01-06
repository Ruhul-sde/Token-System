import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext';

// Import components
import Header3D from './Header3D';
import StatsGrid from './StatsGrid';
import AnalyticsChart from './AnalyticsChart';
import KnowledgeBase from './KnowledgeBase';
import TicketModal from './TicketModal';
import CreateTicketModal from './CreateTicketModal';

// Import constants
import { THEME, TABS, STATUS_COLORS, PRIORITY_COLORS } from './constants';

const AdminDashboard = () => {
  const { user } = useAuth();
  const {
    tickets,
    departments,
    stats,
    loading,
    error,
    fetchDashboardData,
    getFilteredTickets,
    getDepartmentStats,
    selectedTicket,
    setSelectedTicket
  } = useAdmin();

  // UI State
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', department: 'all' });
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Status Update Logic State
  const [tempStatus, setTempStatus] = useState('');
  const [tempSolution, setTempSolution] = useState('');
  
  // Solution Sorting & Viewing
  const [solutionCategoryFilter, setSolutionCategoryFilter] = useState('all');
  const [copiedSolutionId, setCopiedSolutionId] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const filteredTickets = getFilteredTickets(filters);
  const departmentStats = getDepartmentStats();

  // --- Helper Functions ---
  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.pending;
  const getPriorityColor = (priority) => PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;

  // --- Actions ---
  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setTempStatus(ticket.status);
    setTempSolution(ticket.solution || '');
    setShowModal(true);
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white animate-pulse">Initializing System...</div>;
  if (error) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-[#ED1B2F] selection:text-white pb-20">
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #455185; }
      `}</style>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Header3D />

        {/* --- Top Bar --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
          <div>
            <p className="text-slate-400 text-sm font-medium tracking-wider uppercase mb-1">Welcome back</p>
            <h2 className="text-3xl font-bold text-white">{user?.name}</h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-all transform hover:scale-105 active:scale-95 ${THEME.buttonPrimary}`}
          >
            + New Ticket
          </button>
        </div>

        {/* --- Stats Grid --- */}
        <StatsGrid stats={stats} />

        {/* --- Chart Section --- */}
        <AnalyticsChart departmentStats={departmentStats} />

        {/* --- Tabs --- */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' 
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* --- Tab Content: Tickets --- */}
        {activeTab === 'tickets' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8">
              {['status', 'priority', 'department'].map(filterType => (
                <div key={filterType} className="relative group">
                  <select
                    value={filters[filterType]}
                    onChange={(e) => setFilters({ ...filters, [filterType]: e.target.value })}
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
                    onClick={() => handleTicketClick(ticket)}
                    className={`group relative ${THEME.glass} p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:border-[#455185] hover:shadow-[0_0_20px_rgba(69,81,133,0.2)]`}
                  >
                    <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-[#ED1B2F] to-[#455185] rounded-r-full group-hover:w-2 transition-all"></div>
                    <div className="pl-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white group-hover:text-[#ED1B2F] transition-colors">{ticket.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm line-clamp-1 mb-3">{ticket.description}</p>
                        <div className="flex gap-4 text-xs text-slate-500 font-mono">
                          <span className="flex items-center gap-1">👤 {ticket.createdBy?.name || 'Unknown'}</span>
                          <span className="flex items-center gap-1">📅 {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          {ticket.department && <span className="text-[#455185]">🏢 {ticket.department.name}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-mono text-slate-600 bg-black/20 px-2 py-1 rounded">
                          #{ticket.ticketNumber || ticket._id.slice(-6)}
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
        )}

        {/* --- Tab Content: Solutions --- */}
        {activeTab === 'solutions' && (
          <KnowledgeBase 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            solutionCategoryFilter={solutionCategoryFilter}
            setSolutionCategoryFilter={setSolutionCategoryFilter}
            copiedSolutionId={copiedSolutionId}
            setCopiedSolutionId={setCopiedSolutionId}
          />
        )}
      </div>

      {/* --- Modals --- */}
      {showModal && selectedTicket && (
        <TicketModal
          selectedTicket={selectedTicket}
          setShowModal={setShowModal}
          tempStatus={tempStatus}
          setTempStatus={setTempStatus}
          tempSolution={tempSolution}
          setTempSolution={setTempSolution}
        />
      )}

      <CreateTicketModal
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
      />
    </div>
  );
};

export default AdminDashboard;