import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Stars } from '@react-three/drei';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- VISUAL CONSTANTS ---
const THEME = {
  primary: '#ED1B2F',
  secondary: '#455185',
  dark: '#0f172a',
  glass: 'rgba(255, 255, 255, 0.05)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444'
};

// --- 3D COMPONENTS ---
const AnimatedSphere = ({ color, position, scale = 1 }) => (
  <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
    <Sphere args={[1, 64, 64]} position={position} scale={scale}>
      <MeshDistortMaterial 
        color={color} 
        roughness={0.1} 
        metalness={0.8} 
        distort={0.5} 
        speed={1.5} 
      />
    </Sphere>
  </Float>
);

const BackgroundScene = () => (
  <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
    <Canvas camera={{ position: [0, 0, 8] }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <AnimatedSphere color={THEME.primary} position={[-4, -2, -5]} scale={1.5} />
      <AnimatedSphere color={THEME.secondary} position={[4, 2, -5]} scale={2} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </Canvas>
  </div>
);

// --- REUSABLE UI COMPONENTS ---
const Card = ({ children, className = "" }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl ${className}`}
  >
    {children}
  </motion.div>
);

const Button = ({ onClick, variant = 'primary', children, className = "", type="button" }) => {
  const baseClass = "px-6 py-2.5 rounded-xl font-semibold transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2";
  const variants = {
    primary: `bg-gradient-to-r from-[${THEME.primary}] to-red-700 text-white hover:shadow-red-500/25`,
    secondary: `bg-gradient-to-r from-[${THEME.secondary}] to-blue-900 text-white hover:shadow-blue-500/25`,
    ghost: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    danger: "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
  };

  return (
    <button type={type} onClick={onClick} className={`${baseClass} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    yellow: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    gray: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
};

const SuperAdminDashboard = () => {
  // --- STATE MANAGEMENT ---
  const { API_URL, user } = useAuth();
  
  // Data States
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tickets, settickets] = useState([]);
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [companies, setCompanies] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [modals, setModals] = useState({
    company: false,
    adminDetail: false,
    tokenDetail: false,
    dept: false,
    user: false,
    status: false,
    adminForm: false,
    createToken: false
  });

  // Selection States
  const [selections, setSelections] = useState({
    company: null,
    admin: null,
    ticket: null,
    user: null,
    dept: null
  });

  // Form States
  const [newDept, setNewDept] = useState({ name: '', description: '', categories: [] });
  const [tempCategory, setTempCategory] = useState(''); // New state for category input
  
  const [newAdminProfile, setNewAdminProfile] = useState({ 
    name: '', email: '', password: '', expertise: [], 
    department: '', categories: [], phone: '', employeeId: '' 
  });
  const [newToken, setNewToken] = useState({
    title: '', description: '', priority: 'medium', department: '', 
    category: '', subCategory: '', reason: '', supportingDocuments: [], 
    userDetails: { name: '', email: '', employeeCode: '', companyName: '' }
  });

  // Filter States
  const [filters, setFilters] = useState({
    department: 'all',
    status: 'all',
    priority: 'all',
  });

  // --- HELPERS ---
  const toggleModal = (modalName, show = true) => {
    setModals(prev => ({ ...prev, [modalName]: show }));
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

  const getPriorityColor = (p) => {
    if (p === 'high') return 'red';
    if (p === 'medium') return 'yellow';
    return 'green';
  };

  const getStatusColor = (s) => {
    if (['resolved', 'solved', 'active'].includes(s)) return 'green';
    if (['pending', 'frozen'].includes(s)) return 'yellow';
    if (['suspended', 'closed'].includes(s)) return 'red';
    return 'blue';
  };

  // --- CATEGORY HANDLERS ---
  const addCategoryToDept = () => {
    if (tempCategory.trim()) {
      setNewDept(prev => ({
        ...prev,
        categories: [...prev.categories, { name: tempCategory.trim(), _id: Date.now().toString() }]
      }));
      setTempCategory('');
    }
  };

  const removeCategoryFromDept = (index) => {
    setNewDept(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      
      const responses = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`, config),
        axios.get(`${API_URL}/users`, config),
        axios.get(`${API_URL}/departments`, config),
        axios.get(`${API_URL}/tickets`, config),
        axios.get(`${API_URL}/admin-profiles`, config),
        axios.get(`${API_URL}/companies`, config)
      ]);

      setStats(responses[0].data);
      setUsers(responses[1].data);
      setDepartments(responses[2].data);
      settickets(responses[3].data);
      setAdminProfiles(responses[4].data);
      setCompanies(responses[5].data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // --- ANALYTICS ---
  const analytics = useMemo(() => {
    const now = new Date();
    const rangeMap = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, 'all': Infinity };
    const cutoff = now - rangeMap[selectedTimeRange];
    
    // Safety check for tickets array
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const filtered = safeTickets.filter(t => new Date(t.createdAt) >= cutoff);

    // Time Series
    const days = {};
    filtered.forEach(t => {
      const d = new Date(t.createdAt).toLocaleDateString();
      if (!days[d]) days[d] = { date: d, created: 0, solved: 0 };
      days[d].created++;
      if (['resolved', 'solved'].includes(t.status)) days[d].solved++;
    });
    const timeSeriesData = Object.values(days).sort((a,b) => new Date(a.date) - new Date(b.date));

    // Live Department Stats
    const deptPerformance = departments.map(d => {
      const deptTickets = safeTickets.filter(t => t.department?._id === d._id || t.department === d._id);
      const resolved = deptTickets.filter(t => ['resolved', 'solved'].includes(t.status));
      const avgTime = resolved.reduce((acc, t) => acc + (t.timeToSolve || 0), 0) / (resolved.length || 1);
      
      return {
        name: d.name,
        total: deptTickets.length,
        solved: resolved.length,
        efficiency: deptTickets.length ? (resolved.length / deptTickets.length) * 100 : 0,
        avgTime
      };
    });

    return { timeSeriesData, deptPerformance };
  }, [tickets, departments, selectedTimeRange]);

  // --- CRUD OPERATIONS ---
  const handleCRUD = async (action, endpoint, data, modalToClose) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      
      if (action === 'delete') await axios.delete(`${API_URL}/${endpoint}/${data}`, config);
      else if (action === 'update') await axios.patch(`${API_URL}/${endpoint}/${data.id}`, data.payload, config);
      else await axios.post(`${API_URL}/${endpoint}`, data, config);
      
      if (modalToClose) toggleModal(modalToClose, false);
      fetchData();
      alert('Operation successful');
    } catch (err) {
      alert(`Operation failed: ${err.message}`);
    }
  };

  // --- RENDERERS ---

  const renderStatsCards = () => {
    // FIX: Calculate directly from tickets array instead of using potentially stale 'stats' object
    const totalTicketsCount = tickets.length;
    const resolvedCount = tickets.filter(t => ['resolved', 'solved'].includes(t.status)).length;
    const successRate = totalTicketsCount > 0 ? ((resolvedCount / totalTicketsCount) * 100).toFixed(1) : 0;
    
    // Calculate avg resolution time from resolved tickets
    const resolvedTicketsWithTime = tickets.filter(t => ['resolved', 'solved'].includes(t.status) && t.timeToSolve);
    const totalTime = resolvedTicketsWithTime.reduce((acc, t) => acc + t.timeToSolve, 0);
    const avgTimeMs = resolvedTicketsWithTime.length ? totalTime / resolvedTicketsWithTime.length : 0;

    // Calculate rating
    const ratedTickets = tickets.filter(t => t.feedback?.rating);
    const avgRating = ratedTickets.length 
      ? (ratedTickets.reduce((acc, t) => acc + t.feedback.rating, 0) / ratedTickets.length).toFixed(1) 
      : 'N/A';

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { 
            label: 'Total Tickets', 
            value: totalTicketsCount, // Live count
            icon: '🎫', 
            color: 'from-blue-600 to-blue-800' 
          },
          { 
            label: 'Success Rate', 
            value: `${successRate}%`, // Live calculation
            icon: '📈', 
            color: 'from-[#ED1B2F] to-red-800' 
          },
          { 
            label: 'Avg Resolution', 
            value: formatTime(avgTimeMs),
            icon: '⚡', 
            color: 'from-[#455185] to-purple-800' 
          },
          { 
            label: 'User Satisfaction', 
            value: avgRating === 'N/A' ? 'N/A' : `${avgRating}/5`, 
            icon: '⭐', 
            color: 'from-yellow-500 to-amber-700' 
          }
        ].map((item, idx) => (
          <Card key={idx} className="overflow-hidden border-0 group hover:scale-105 transition-transform duration-300">
             <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
             <div className="relative z-10">
               <div className="flex justify-between items-start">
                 <div>
                   <p className="text-white/60 text-sm font-medium uppercase tracking-wider">{item.label}</p>
                   <h3 className="text-4xl font-black text-white mt-2">{item.value}</h3>
                 </div>
                 <span className="text-4xl">{item.icon}</span>
               </div>
               <div className="w-full bg-white/10 h-1 mt-4 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${item.color} w-full`}></div>
               </div>
             </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      {renderStatsCards()}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#ED1B2F]">📊</span> Ticket Volume
            </h3>
            <div className="flex gap-2">
              {['24h', '7d', '30d'].map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedTimeRange(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    selectedTimeRange === r ? 'bg-[#ED1B2F] text-white' : 'bg-white/5 text-white/50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.timeSeriesData}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ED1B2F" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ED1B2F" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#455185" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#455185" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#ffffff60" tick={{fill: '#ffffff60'}} />
                <YAxis stroke="#ffffff60" tick={{fill: '#ffffff60'}} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="created" stroke="#ED1B2F" fillOpacity={1} fill="url(#colorCreated)" />
                <Area type="monotone" dataKey="solved" stroke="#455185" fillOpacity={1} fill="url(#colorSolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-bold text-white mb-6">Department Efficiency</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {analytics?.deptPerformance.map((dept, idx) => (
              <div key={idx} className="group">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white font-medium">{dept.name}</span>
                  <span className="text-emerald-400 font-bold">{dept.efficiency.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#ED1B2F] to-[#455185] transition-all duration-1000"
                    style={{ width: `${dept.efficiency}%` }}
                  />
                </div>
                <div className="text-xs text-white/40 mt-1 flex justify-between">
                  <span>{dept.solved}/{dept.total} Solved</span>
                  <span>Avg: {formatTime(dept.avgTime)}</span>
                </div>
              </div>
            ))}
            {(!analytics?.deptPerformance || analytics.deptPerformance.length === 0) && (
              <div className="text-white/40 text-center py-4">No department data yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderTicketsTable = () => (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-2xl font-bold text-white">Support Tickets</h3>
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search tickets..." 
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#ED1B2F] flex-1"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="primary" onClick={() => toggleModal('createToken')}>+ New Ticket</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="p-4">Ticket Info</th>
              <th className="p-4">Department</th>
              <th className="p-4">Status</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Created</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {tickets
              .filter(t => filters.status === 'all' || t.status === filters.status)
              .slice(0, 10) 
              .map(ticket => (
              <tr key={ticket._id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="p-4">
                  <div className="font-bold text-lg group-hover:text-[#ED1B2F] transition-colors">{ticket.title}</div>
                  <div className="text-xs text-white/50">#{ticket.ticketNumber || ticket._id.slice(-6)} • by {ticket.createdBy?.name}</div>
                </td>
                <td className="p-4 text-sm">{ticket.department?.name}</td>
                <td className="p-4">
                  <Badge color={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                </td>
                <td className="p-4">
                  <Badge color={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                </td>
                <td className="p-4 text-sm text-white/60">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                <td className="p-4">
                  <Button variant="ghost" className="px-3 py-1 text-sm" onClick={() => {
                    setSelections({...selections, ticket});
                    toggleModal('tokenDetail');
                  }}>View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  // --- MAIN RETURN ---
  if (loading) return (
    <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center">
      <div className="relative w-24 h-24">
         <div className="absolute inset-0 border-4 border-[#ED1B2F] rounded-full animate-ping opacity-20"></div>
         <div className="absolute inset-2 border-4 border-t-[#455185] border-r-[#ED1B2F] border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  if (error) return <div className="text-red-500 text-center mt-20">{error}</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-[#ED1B2F] selection:text-white relative overflow-hidden">
      <BackgroundScene />

      <div className="relative z-10 container mx-auto px-4 py-6">
        <header className="flex flex-col md:flex-row justify-between items-end mb-10 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-2">
              Command Center
            </h1>
            <p className="text-[#455185] font-semibold text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ED1B2F] animate-pulse"></span>
              System Operational • Welcome, {user?.name}
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
             <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ED1B2F] to-[#455185] p-0.5">
               <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
                 <span className="font-bold text-xl">SA</span>
               </div>
             </div>
          </div>
        </header>

        <nav className="flex overflow-x-auto gap-2 mb-8 pb-2 sticky top-2 z-50">
          {[
            { id: 'overview', icon: '⚡', label: 'Overview' },
            { id: 'tickets', icon: '🎫', label: 'Tickets' },
            { id: 'users', icon: '👥', label: 'Users' },
            { id: 'departments', icon: '🏢', label: 'Departments' },
            { id: 'admins', icon: '🛡️', label: 'Admins' },
            { id: 'companies', icon: '💼', label: 'Companies' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-5 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-gradient-to-r from-[#ED1B2F] to-[#b91c1c] text-white shadow-lg shadow-red-900/20 scale-105' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white backdrop-blur-md border border-white/5'}
              `}
            >
              <span>{tab.icon}</span>
              <span className="font-semibold">{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'tickets' && renderTicketsTable()}
              
              {/* DEPARTMENTS TAB */}
              {activeTab === 'departments' && (
                <Card>
                  <div className="flex justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">Departments</h3>
                    <Button onClick={() => { 
                      setSelections({...selections, dept: null}); 
                      setNewDept({ name: '', description: '', categories: [] }); 
                      toggleModal('dept'); 
                    }}>+ Add Dept</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {departments.map(d => (
                      <div key={d._id} className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[#ED1B2F] transition-all group">
                         <h4 className="text-xl font-bold mb-2 group-hover:text-[#ED1B2F] transition-colors">{d.name}</h4>
                         <p className="text-white/60 text-sm mb-4 h-10 overflow-hidden">{d.description}</p>
                         <div className="flex flex-wrap gap-1 mb-4">
                            {d.categories?.slice(0,3).map((cat, i) => (
                              <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded text-white/70">{cat.name}</span>
                            ))}
                            {d.categories?.length > 3 && <span className="text-xs text-white/50">+{d.categories.length - 3}</span>}
                         </div>
                         <div className="flex justify-between items-center mt-auto border-t border-white/10 pt-3">
                           <button onClick={() => { 
                             setSelections({...selections, dept: d}); 
                             setNewDept({ 
                               name: d.name, 
                               description: d.description || '', 
                               categories: d.categories || [] 
                             }); 
                             toggleModal('dept'); 
                           }} className="text-[#455185] font-bold hover:text-white transition-colors">Edit</button>
                           <button onClick={() => handleCRUD('delete', 'departments', d._id)} className="text-[#ED1B2F] hover:text-red-400">Delete</button>
                         </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Placeholder for other tabs */}
              {['users', 'admins', 'companies'].includes(activeTab) && (
                 <Card>
                   <div className="text-center py-20">
                     <h3 className="text-2xl font-bold text-white capitalize">{activeTab} Module</h3>
                     <p className="text-white/50">Content for {activeTab} is connected via the state/API hooks.</p>
                   </div>
                 </Card>
              )}

            </motion.div>
          </AnimatePresence>
        </main>

        {/* --- MODALS --- */}
        {Object.entries(modals).map(([key, isOpen]) => {
           if (!isOpen) return null;
           return (
             <div key={key} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="bg-[#1e293b] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
               >
                 <div className="bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-4 flex justify-between items-center">
                   <h3 className="text-white font-bold text-lg capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h3>
                   <button onClick={() => toggleModal(key, false)} className="text-white hover:text-white/50 text-2xl">×</button>
                 </div>
                 <div className="p-6 max-h-[70vh] overflow-y-auto text-white">
                   
                   {/* DEPARTMENT MODAL WITH CATEGORIES */}
                   {key === 'dept' && (
                     <form onSubmit={(e) => { 
                       e.preventDefault(); 
                       handleCRUD(selections.dept ? 'update' : 'create', 'departments', selections.dept ? { id: selections.dept._id, payload: newDept } : newDept, 'dept'); 
                     }}>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold mb-1">Department Name</label>
                            <input className="w-full bg-black/20 p-2 rounded border border-white/10 focus:border-[#ED1B2F] outline-none" value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} required />
                          </div>
                          <div>
                            <label className="block text-sm font-bold mb-1">Description</label>
                            <textarea className="w-full bg-black/20 p-2 rounded border border-white/10 focus:border-[#ED1B2F] outline-none" value={newDept.description} onChange={e => setNewDept({...newDept, description: e.target.value})} />
                          </div>
                          
                          {/* Categories Section */}
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <label className="block text-sm font-bold mb-2">Ticket Categories</label>
                            <div className="flex gap-2 mb-3">
                              <input 
                                type="text" 
                                className="flex-1 bg-black/20 p-2 rounded border border-white/10 focus:border-[#ED1B2F] outline-none"
                                placeholder="Add category (e.g. Hardware, Network)"
                                value={tempCategory}
                                onChange={(e) => setTempCategory(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategoryToDept())}
                              />
                              <Button variant="secondary" onClick={addCategoryToDept}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {newDept.categories.map((cat, idx) => (
                                <span key={idx} className="bg-[#455185]/30 border border-[#455185] text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                  {cat.name}
                                  <button type="button" onClick={() => removeCategoryFromDept(idx)} className="text-white/50 hover:text-white font-bold">×</button>
                                </span>
                              ))}
                              {newDept.categories.length === 0 && <span className="text-white/30 text-sm italic">No categories added yet</span>}
                            </div>
                          </div>

                          <div className="pt-4 flex gap-3">
                            <Button type="submit" className="w-full">Save Department</Button>
                          </div>
                        </div>
                     </form>
                   )}

                   {/* CREATE TICKET MODAL */}
                   {key === 'createToken' && (
                     <form onSubmit={(e) => { e.preventDefault(); handleCRUD('create', 'tickets/on-behalf', newToken, 'createToken'); }}>
                        <div className="space-y-4">
                           <input placeholder="Title" className="w-full bg-black/20 p-2 rounded border border-white/10" value={newToken.title} onChange={e => setNewToken({...newToken, title: e.target.value})} />
                           <textarea placeholder="Description" className="w-full bg-black/20 p-2 rounded border border-white/10" value={newToken.description} onChange={e => setNewToken({...newToken, description: e.target.value})} />
                           <div className="grid grid-cols-2 gap-4">
                             <select className="bg-black/20 p-2 rounded border border-white/10" value={newToken.priority} onChange={e => setNewToken({...newToken, priority: e.target.value})}>
                               <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                             </select>
                           </div>
                           <Button type="submit">Create Ticket</Button>
                        </div>
                     </form>
                   )}

                   {/* TICKET DETAIL MODAL */}
                   {key === 'tokenDetail' && selections.ticket && (
                     <div>
                       <h4 className="text-xl font-bold mb-2">{selections.ticket.title}</h4>
                       <p className="text-white/60 mb-4">{selections.ticket.description}</p>
                       <div className="bg-black/20 p-4 rounded-lg">
                         <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>Status: <Badge>{selections.ticket.status}</Badge></div>
                            <div>Priority: <Badge>{selections.ticket.priority}</Badge></div>
                            <div>Department: {selections.ticket.department?.name}</div>
                            <div>Created By: {selections.ticket.createdBy?.name}</div>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               </motion.div>
             </div>
           );
        })}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;