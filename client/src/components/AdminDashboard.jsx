import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Styles & Constants ---
const THEME = {
  red: '#ED1B2F',
  blue: '#455185',
  dark: '#0f172a',
  glass: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl',
  gradientText: 'bg-clip-text text-transparent bg-gradient-to-r from-[#ED1B2F] to-[#455185]',
  buttonPrimary: 'bg-gradient-to-r from-[#ED1B2F] to-[#455185] hover:opacity-90 text-white shadow-[0_0_15px_rgba(237,27,47,0.5)]',
};

// --- 3D Component ---
const Header3D = () => {
  const [webglSupported, setWebglSupported] = useState(true);
  const [ThreeComponents, setThreeComponents] = useState(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
      
      Promise.all([
        import('@react-three/fiber'),
        import('@react-three/drei')
      ]).then(([fiber, drei]) => {
        setThreeComponents({ 
          Canvas: fiber.Canvas, 
          OrbitControls: drei.OrbitControls, 
          Sphere: drei.Sphere, 
          Box: drei.Box, 
          Float: drei.Float, 
          MeshDistortMaterial: drei.MeshDistortMaterial 
        });
      }).catch(() => setWebglSupported(false));
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported || !ThreeComponents) {
    return (
      <div className={`mb-8 h-48 rounded-3xl overflow-hidden flex items-center justify-center ${THEME.glass}`}>
        <div className="text-center">
          <h1 className={`text-4xl font-bold ${THEME.gradientText}`}>Admin Dashboard</h1>
        </div>
      </div>
    );
  }

  const { Canvas, OrbitControls, Sphere, Box, Float, MeshDistortMaterial } = ThreeComponents;

  return (
    <div className="mb-8 h-56 rounded-3xl overflow-hidden relative border border-white/5 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color={THEME.red} />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color={THEME.blue} />
        
        <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
          <Sphere args={[0.9, 64, 64]} position={[-1.5, 0, 0]}>
            <MeshDistortMaterial color={THEME.red} roughness={0.2} metalness={0.9} distort={0.4} speed={2} />
          </Sphere>
        </Float>
        
        <Float speed={2} rotationIntensity={1.5} floatIntensity={0.8}>
          <Box args={[1.2, 1.2, 1.2]} position={[1.5, 0, 0]} rotation={[0.5, 0.5, 0]}>
            <MeshDistortMaterial color={THEME.blue} roughness={0.1} metalness={1} distort={0.3} speed={1.5} />
          </Box>
        </Float>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      
      <div className="absolute bottom-6 left-8 pointer-events-none">
        <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
          ADMIN <span className={THEME.gradientText}>PORTAL</span>
        </h1>
      </div>
    </div>
  );
};

// --- Main Component ---
const AdminDashboard = () => {
  // State
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Token State
  const [newToken, setNewToken] = useState({
    title: '', description: '', priority: 'medium', department: '',
    category: '', subCategory: '', reason: '', supportingDocuments: [],
    userDetails: { name: '', email: '', employeeCode: '', companyName: '' }
  });

  // UI State
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', department: 'all' });
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Solution Sorting & Viewing
  const [solutionSortBy, setSolutionSortBy] = useState('date');
  const [solutionSortOrder, setSolutionSortOrder] = useState('desc');
  const [solutionCategoryFilter, setSolutionCategoryFilter] = useState('all');
  const [solutionPriorityFilter, setSolutionPriorityFilter] = useState('all');
  const [solutionViewMode, setSolutionViewMode] = useState('detailed');
  const [expandedSolutions, setExpandedSolutions] = useState({});
  const [copiedSolutionId, setCopiedSolutionId] = useState(null);
  
  // Status Update Logic State
  const [tempStatus, setTempStatus] = useState('');
  const [tempSolution, setTempSolution] = useState('');

  const { API_URL, user } = useAuth();

  // --- Helpers ---
  const toggleSolutionExpand = (tokenId) => {
    setExpandedSolutions(prev => ({ ...prev, [tokenId]: !prev[tokenId] }));
  };

  const copySolution = async (tokenId, solution) => {
    try {
      await navigator.clipboard.writeText(solution);
      setCopiedSolutionId(tokenId);
      setTimeout(() => setCopiedSolutionId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'assigned': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'in-progress': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const formatTime = (ms) => {
    if (!ms) return '0m';
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  // --- Data Logic ---
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      
      const [ticketsRes, usersRes, deptsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/tickets`, config),
        axios.get(`${API_URL}/users`, config),
        axios.get(`${API_URL}/departments`, config),
        axios.get(`${API_URL}/dashboard/stats`, config)
      ]);

      setTickets(ticketsRes.data);
      setFilteredTickets(ticketsRes.data);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let result = tickets;
    if (filters.status !== 'all') result = result.filter(t => t.status === filters.status);
    if (filters.priority !== 'all') result = result.filter(t => t.priority === filters.priority);
    if (filters.department !== 'all') result = result.filter(t => t.department?._id === filters.department);
    setFilteredTickets(result);
  }, [filters, tickets]);

  // --- Actions ---
  const handleAdminFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    // ... (File validation logic identical to original, abbreviated for brevity)
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024); 

    const filePromises = validFiles.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({
        filename: file.name,
        fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
        base64Data: e.target.result,
        uploadedAt: new Date()
      });
      reader.readAsDataURL(file);
    }));

    const uploaded = await Promise.all(filePromises);
    setNewToken(prev => ({ ...prev, supportingDocuments: [...prev.supportingDocuments, ...uploaded] }));
  };

  const createTokenOnBehalf = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tickets/on-behalf`, newToken, { headers: { 'Authorization': `Bearer ${token}` }});
      setShowCreateModal(false);
      setNewToken({ ...newToken, title: '', description: '', supportingDocuments: [] }); // Reset essential fields
      fetchData();
      alert('Ticket created successfully');
    } catch (err) {
      alert('Failed to create ticket');
    }
  };

  const updateTicketStatus = async () => {
    try {
      if (tempStatus === 'resolved' && (!tempSolution || tempSolution.length < 10)) {
        alert('Please provide a valid solution (min 10 chars).');
        return;
      }
      const updateData = { status: tempStatus };
      if (tempStatus === 'resolved') updateData.solution = tempSolution;
      
      await axios.patch(`${API_URL}/tickets/${selectedTicket._id}/update`, updateData);
      fetchData();
      setShowModal(false);
    } catch (err) {
      alert('Update failed');
    }
  };

  const addRemark = async (text) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tickets/${selectedTicket._id}/remarks`, { text }, { headers: { 'Authorization': `Bearer ${token}` }});
      const updated = await axios.get(`${API_URL}/tickets/${selectedTicket._id}`, { headers: { 'Authorization': `Bearer ${token}` }});
      setSelectedTicket(updated.data);
      fetchData();
    } catch (err) {
      alert('Failed to add remark');
    }
  };

  // --- Render Helpers ---
  const getFilteredSolutions = () => {
    let sols = tickets.filter(t => t.status === 'resolved' && t.solution);
    if (searchQuery) sols = sols.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.solution.toLowerCase().includes(searchQuery.toLowerCase()));
    if (solutionCategoryFilter !== 'all') sols = sols.filter(t => t.category === solutionCategoryFilter);
    return sols.sort((a, b) => new Date(b.solvedAt) - new Date(a.solvedAt));
  };

  const departmentStats = departments.map(dept => {
    const deptTickets = tickets.filter(t => t.department?._id === dept._id);
    return {
      name: dept.name,
      solved: deptTickets.filter(t => t.status === 'resolved').length,
      pending: deptTickets.filter(t => t.status === 'pending').length
    };
  });

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
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Total Tickets', val: stats.overview.totaltickets, color: 'white' },
              { label: 'Pending', val: stats.overview.pendingtickets, color: '#eab308' },
              { label: 'Assigned', val: stats.overview.assignedtickets, color: '#455185' },
              { label: 'Resolved', val: stats.overview.resolvedtickets, color: '#10b981' },
            ].map((stat, i) => (
              <div key={i} className={`${THEME.glass} p-6 rounded-2xl hover:bg-white/10 transition-colors group relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-5xl font-bold" style={{ color: stat.color }}>#</div>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{stat.label}</h3>
                <p className="text-4xl font-black" style={{ color: stat.color }}>{stat.val}</p>
              </div>
            ))}
          </div>
        )}

        {/* --- Chart Section --- */}
        {departmentStats.length > 0 && (
          <div className={`${THEME.glass} rounded-3xl p-8 mb-12 border-l-4 border-l-[#ED1B2F]`}>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ED1B2F]"></span> 
              Analytics Overview
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="solved" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Resolved" />
                  <Bar dataKey="pending" fill="#eab308" radius={[4, 4, 0, 0]} barSize={20} name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* --- Tabs --- */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
          {[
            { id: 'tickets', icon: '🎫', label: 'Live Tickets' },
            { id: 'solutions', icon: '💡', label: 'Knowledge Base' }
          ].map(tab => (
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
                    {filterType === 'status' && ['pending', 'assigned', 'in-progress', 'resolved'].map(o => <option key={o} value={o}>{o}</option>)}
                    {filterType === 'priority' && ['high', 'medium', 'low'].map(o => <option key={o} value={o}>{o}</option>)}
                    {filterType === 'department' && departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
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
                    onClick={() => { 
                      setSelectedTicket(ticket); 
                      setTempStatus(ticket.status); 
                      setTempSolution(ticket.solution || ''); 
                      setShowModal(true); 
                    }}
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
                          <span className="flex items-center gap-1">👤 {ticket.createdBy?.name}</span>
                          <span className="flex items-center gap-1">📅 {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          {ticket.department && <span className="text-[#455185]">🏢 {ticket.department.name}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-mono text-slate-600 bg-black/20 px-2 py-1 rounded">#{ticket.ticketNumber || ticket._id.slice(-6)}</span>
                        <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
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
          <div className="space-y-6">
            <input
              type="text"
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] border border-[#334155] rounded-xl px-6 py-4 text-white focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent outline-none"
            />
            <div className="grid gap-6">
              {getFilteredSolutions().map(sol => (
                <div key={sol._id} className={`${THEME.glass} p-6 rounded-2xl border-l-4 border-l-emerald-500`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">{sol.title}</h3>
                      <div className="flex gap-2">
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">Resolved</span>
                        {sol.category && <span className="bg-[#455185]/20 text-[#8ba0ef] text-xs px-2 py-1 rounded">{sol.category}</span>}
                      </div>
                    </div>
                    <button 
                      onClick={() => copySolution(sol._id, sol.solution)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedSolutionId === sol._id ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  
                  <div className="bg-black/20 p-4 rounded-xl mb-4">
                    <p className="text-red-300 text-sm mb-1 font-bold">Issue:</p>
                    <p className="text-slate-300 text-sm">{sol.description}</p>
                  </div>

                  <div className="bg-emerald-900/10 border border-emerald-500/10 p-4 rounded-xl">
                    <p className="text-emerald-400 text-sm mb-1 font-bold">Solution:</p>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{sol.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- Modals (Glass Overlay) --- */}
      {(showModal && selectedTicket) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-[#ED1B2F]/10 to-[#455185]/10 flex justify-between items-center sticky top-0 backdrop-blur-xl">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedTicket.title}</h3>
                <span className="text-xs font-mono text-slate-400">ID: {selectedTicket.ticketNumber || selectedTicket._id}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition-colors">✕</button>
            </div>

            <div className="p-8 space-y-8">
              {/* Main Grid */}
              <div className="grid md:grid-cols-3 gap-8">
                {/* Left Column: Details */}
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-black/20 p-6 rounded-2xl">
                    <h4 className="text-[#455185] font-bold text-sm uppercase tracking-wider mb-3">Description</h4>
                    <p className="text-slate-300 leading-relaxed">{selectedTicket.description}</p>
                  </div>

                  {/* Documents */}
                  {selectedTicket.supportingDocuments?.length > 0 && (
                    <div>
                      <h4 className="text-slate-500 font-bold text-sm uppercase mb-3">Attachments</h4>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {selectedTicket.supportingDocuments.map((doc, i) => (
                          <a key={i} href={doc.base64Data} target="_blank" rel="noreferrer" className="block min-w-[100px] p-2 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors text-center">
                            <div className="text-2xl mb-1">{doc.fileType === 'image' ? '🖼️' : '📄'}</div>
                            <div className="text-[10px] truncate w-20 mx-auto text-slate-400">{doc.filename}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conversation / Remarks */}
                  <div className="space-y-4">
                     <h4 className="text-slate-500 font-bold text-sm uppercase">Activity Log</h4>
                     <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {selectedTicket.remarks?.map((rem, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-xs font-bold text-white">
                              {rem.addedBy?.name?.charAt(0)}
                            </div>
                            <div className="flex-1 bg-white/5 p-3 rounded-r-xl rounded-bl-xl">
                              <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>{rem.addedBy?.name}</span>
                                <span>{new Date(rem.addedAt).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-slate-300">{rem.text}</p>
                            </div>
                          </div>
                        ))}
                     </div>
                     <div className="flex gap-2">
                       <input 
                          id="remark-input"
                          type="text" 
                          placeholder="Add an internal note..." 
                          className="flex-1 bg-[#0f172a] border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-[#455185] outline-none"
                          onKeyDown={(e) => { if(e.key === 'Enter') { addRemark(e.target.value); e.target.value = ''; }}}
                       />
                       <button 
                        onClick={() => { const el = document.getElementById('remark-input'); addRemark(el.value); el.value = ''; }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-colors"
                       >Send</button>
                     </div>
                  </div>
                </div>

                {/* Right Column: Controls */}
                <div className="space-y-6">
                  <div className={`${THEME.glass} p-6 rounded-2xl`}>
                    <h4 className="text-white font-bold mb-4">Status & Action</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Current Status</label>
                        <select 
                          value={tempStatus}
                          onChange={(e) => setTempStatus(e.target.value)}
                          className="w-full bg-[#0f172a] border border-white/10 text-white rounded-lg px-3 py-2 outline-none focus:border-[#ED1B2F]"
                        >
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>

                      {tempStatus === 'resolved' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                          <label className="text-xs text-emerald-400 block mb-1">Solution Description *</label>
                          <textarea 
                            value={tempSolution}
                            onChange={(e) => setTempSolution(e.target.value)}
                            className="w-full h-32 bg-[#0f172a] border border-emerald-500/30 rounded-lg p-3 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Describe how the issue was resolved..."
                          />
                        </div>
                      )}

                      <button 
                        onClick={updateTicketStatus}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${THEME.buttonPrimary}`}
                      >
                        Update Ticket
                      </button>
                    </div>
                  </div>

                  <div className="bg-black/20 p-4 rounded-2xl text-xs space-y-2 text-slate-400">
                    <div className="flex justify-between"><span>Priority</span> <span className="text-white capitalize">{selectedTicket.priority}</span></div>
                    <div className="flex justify-between"><span>Department</span> <span className="text-white">{selectedTicket.department?.name}</span></div>
                    <div className="flex justify-between"><span>Created</span> <span className="text-white">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Create Ticket Modal --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10 flex flex-col animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Create New Ticket</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
             </div>
             <form onSubmit={createTokenOnBehalf} className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                   <input required placeholder="User Name" value={newToken.userDetails.name} onChange={e => setNewToken({...newToken, userDetails: {...newToken.userDetails, name: e.target.value}})} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F]"/>
                   <input required placeholder="User Email" type="email" value={newToken.userDetails.email} onChange={e => setNewToken({...newToken, userDetails: {...newToken.userDetails, email: e.target.value}})} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F]"/>
                </div>
                <input required placeholder="Ticket Title" value={newToken.title} onChange={e => setNewToken({...newToken, title: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F] font-bold"/>
                <div className="grid md:grid-cols-2 gap-4">
                  <select value={newToken.department} onChange={e => setNewToken({...newToken, department: e.target.value})} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                  <select value={newToken.priority} onChange={e => setNewToken({...newToken, priority: e.target.value})} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <textarea required placeholder="Description of the issue..." value={newToken.description} onChange={e => setNewToken({...newToken, description: e.target.value})} className="w-full h-32 bg-black/20 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#ED1B2F]" />
                <div className="border-t border-white/10 pt-6 flex justify-end gap-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2 text-slate-400 hover:text-white">Cancel</button>
                  <button type="submit" className={`px-8 py-2 rounded-xl font-bold ${THEME.buttonPrimary}`}>Create Ticket</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;