
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const AnimatedSphere = ({ color, position }) => (
  <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
    <Sphere args={[0.5, 64, 64]} position={position}>
      <MeshDistortMaterial color={color} roughness={0.2} metalness={0.9} distort={0.4} speed={2} />
    </Sphere>
  </Float>
);

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [adminProfiles, setAdminProfiles] = useState([]);

  // Enhanced UI States
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Modal states
  const [showAdminDetailModal, setShowAdminDetailModal] = useState(false);
  const [showTokenDetailModal, setShowTokenDetailModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [statusAction, setStatusAction] = useState({ status: '', reason: '' });

  // Form states
  const [showAdminProfileForm, setShowAdminProfileForm] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', description: '', categories: [] });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', subCategories: [] });
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newAdminProfile, setNewAdminProfile] = useState({ 
    name: '', email: '', password: '', expertise: [], 
    department: '', categories: [], phone: '', employeeId: ''
  });
  const [newExpertise, setNewExpertise] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    department: 'all',
    status: 'all',
    priority: 'all',
    adminPerformance: 'all'
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { API_URL, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };

      const [statsRes, usersRes, deptsRes, tokensRes, profilesRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`, config),
        axios.get(`${API_URL}/users`, config),
        axios.get(`${API_URL}/departments`, config),
        axios.get(`${API_URL}/tokens`, config),
        axios.get(`${API_URL}/admin-profiles`, config)
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setTokens(tokensRes.data);
      setAdminProfiles(profilesRes.data);
    } catch (error) {
      setError(`Failed to load dashboard data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Department CRUD
  const saveDepartment = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await axios.patch(`${API_URL}/departments/${editingDept._id}`, newDept);
      } else {
        await axios.post(`${API_URL}/departments`, newDept);
      }
      setNewDept({ name: '', description: '', categories: [] });
      setShowDeptModal(false);
      setEditingDept(null);
      fetchData();
    } catch (error) {
      alert('Failed to save department');
    }
  };

  const deleteDepartment = async (deptId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await axios.delete(`${API_URL}/departments/${deptId}`);
        fetchData();
      } catch (error) {
        alert('Failed to delete department');
      }
    }
  };

  // Admin Profile CRUD
  const createAdminProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      await axios.post(`${API_URL}/admin-profiles`, newAdminProfile, config);
      setNewAdminProfile({ name: '', email: '', password: '', expertise: [], department: '', categories: [], phone: '', employeeId: '' });
      setShowAdminProfileForm(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create admin profile');
    }
  };

  const deleteAdminProfile = async (profileId) => {
    if (window.confirm('Are you sure you want to delete this admin profile?')) {
      try {
        await axios.delete(`${API_URL}/admin-profiles/${profileId}`);
        fetchData();
      } catch (error) {
        alert('Failed to delete admin profile');
      }
    }
  };

  // User status management
  const updateUserStatus = async (userId, status, reason) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      await axios.patch(`${API_URL}/users/${userId}/status`, { status, reason }, config);
      setShowStatusModal(false);
      setStatusAction({ status: '', reason: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update user status');
    }
  };

  // Category helpers
  const addCategoryToDept = () => {
    if (newCategory.name.trim()) {
      setNewDept({
        ...newDept,
        categories: [...newDept.categories, { ...newCategory, _id: Date.now().toString() }]
      });
      setNewCategory({ name: '', description: '', subCategories: [] });
    }
  };

  const addSubCategory = () => {
    if (newSubCategory.trim()) {
      setNewCategory({
        ...newCategory,
        subCategories: [...newCategory.subCategories, newSubCategory.trim()]
      });
      setNewSubCategory('');
    }
  };

  const addExpertise = () => {
    if (newExpertise.trim()) {
      setNewAdminProfile({
        ...newAdminProfile,
        expertise: [...newAdminProfile.expertise, newExpertise.trim()]
      });
      setNewExpertise('');
    }
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!tokens.length) return null;

    const now = new Date();
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };
    
    const cutoff = now - timeRanges[selectedTimeRange];
    const filteredTokens = tokens.filter(t => new Date(t.createdAt) >= cutoff);

    // Time-based statistics
    const tokensByDay = {};
    filteredTokens.forEach(token => {
      const day = new Date(token.createdAt).toLocaleDateString();
      if (!tokensByDay[day]) {
        tokensByDay[day] = { created: 0, solved: 0, pending: 0 };
      }
      tokensByDay[day].created++;
      if (token.status === 'solved') tokensByDay[day].solved++;
      if (token.status === 'pending') tokensByDay[day].pending++;
    });

    const timeSeriesData = Object.entries(tokensByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Department performance
    const deptPerformance = departments.map(dept => {
      const deptTokens = filteredTokens.filter(t => t.department?._id === dept._id);
      const solved = deptTokens.filter(t => t.status === 'solved').length;
      const avgTime = deptTokens.filter(t => t.timeToSolve).reduce((sum, t) => sum + t.timeToSolve, 0) / (deptTokens.filter(t => t.timeToSolve).length || 1);
      
      return {
        name: dept.name,
        total: deptTokens.length,
        solved,
        pending: deptTokens.filter(t => t.status === 'pending').length,
        avgTime: avgTime / (1000 * 60 * 60),
        efficiency: deptTokens.length ? (solved / deptTokens.length * 100).toFixed(1) : 0
      };
    });

    // Admin performance metrics
    const adminStats = users
      .filter(u => u.role === 'admin')
      .map(admin => {
        const adminTokens = filteredTokens.filter(t => t.assignedTo?._id === admin._id);
        const solved = adminTokens.filter(t => t.status === 'solved');
        const totalTime = solved.reduce((sum, t) => sum + (t.timeToSolve || 0), 0);
        const avgTime = solved.length ? totalTime / solved.length : 0;
        const feedbackTokens = solved.filter(t => t.feedback?.rating);
        const avgRating = feedbackTokens.length 
          ? feedbackTokens.reduce((sum, t) => sum + t.feedback.rating, 0) / feedbackTokens.length 
          : 0;

        return {
          admin,
          total: adminTokens.length,
          solved: solved.length,
          working: adminTokens.filter(t => ['assigned', 'in-progress'].includes(t.status)).length,
          totalTime,
          avgTime,
          avgRating,
          feedbackCount: feedbackTokens.length,
          efficiency: adminTokens.length ? (solved.length / adminTokens.length * 100) : 0
        };
      })
      .sort((a, b) => b.solved - a.solved);

    // Priority distribution
    const priorityDist = {
      high: filteredTokens.filter(t => t.priority === 'high').length,
      medium: filteredTokens.filter(t => t.priority === 'medium').length,
      low: filteredTokens.filter(t => t.priority === 'low').length
    };

    // Status distribution
    const statusDist = {
      solved: filteredTokens.filter(t => t.status === 'solved').length,
      pending: filteredTokens.filter(t => t.status === 'pending').length,
      assigned: filteredTokens.filter(t => ['assigned', 'in-progress'].includes(t.status)).length
    };

    // Feedback analysis
    const feedbackAnalysis = filteredTokens
      .filter(t => t.feedback?.rating)
      .reduce((acc, token) => {
        const rating = token.feedback.rating;
        acc.total++;
        acc.sum += rating;
        acc.ratings[rating] = (acc.ratings[rating] || 0) + 1;
        return acc;
      }, { total: 0, sum: 0, ratings: {} });

    return {
      timeSeriesData,
      deptPerformance,
      adminStats,
      priorityDist,
      statusDist,
      feedbackAnalysis,
      avgRating: feedbackAnalysis.total ? (feedbackAnalysis.sum / feedbackAnalysis.total).toFixed(2) : 0,
      avgSolveTime: filteredTokens.filter(t => t.timeToSolve).reduce((sum, t) => sum + t.timeToSolve, 0) / (filteredTokens.filter(t => t.timeToSolve).length || 1)
    };
  }, [tokens, departments, users, selectedTimeRange]);

  // Sorting function
  const sortedData = (data, key) => {
    if (!sortConfig.key || sortConfig.key !== key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Search and filter
  const filteredAdmins = useMemo(() => {
    let filtered = adminProfiles;

    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(p => p.department?._id === filters.department);
    }

    return filtered;
  }, [adminProfiles, searchQuery, filters.department]);

  const filteredTokensList = useMemo(() => {
    let filtered = tokens;

    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(t => t.department?._id === filters.department);
    }

    return filtered;
  }, [tokens, filters]);

  const formatTime = (ms) => {
    if (!ms) return 'N/A';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const COLORS = ['#ED1B2F', '#455185', '#00C49F', '#FFBB28', '#8884D8', '#FF8042'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#ED1B2F] mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
        <div className="bg-red-500/20 border border-red-500 rounded-2xl p-8 max-w-md">
          <div className="text-red-400 text-xl mb-4">⚠️ Error</div>
          <div className="text-white">{error}</div>
          <button onClick={fetchData} className="mt-4 px-6 py-2 bg-[#ED1B2F] hover:bg-[#d41829] text-white rounded-lg transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 3D Header */}
        <div className="mb-8 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          <Canvas camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ED1B2F" />
            <AnimatedSphere color="#ED1B2F" position={[-1.5, 0, 0]} />
            <AnimatedSphere color="#455185" position={[1.5, 0, 0]} />
            <AnimatedSphere color="#00C49F" position={[0, 1.5, 0]} />
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        </div>

        {/* Modern Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-[#ED1B2F] via-purple-500 to-[#455185] bg-clip-text text-transparent mb-2">
              Command Center
            </h1>
            <p className="text-white/60 text-lg">Real-time Analytics & Performance Monitoring</p>
            <p className="text-white/40 text-sm mt-1">Welcome back, {user?.name}</p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {['24h', '7d', '30d', 'all'].map(range => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedTimeRange === range
                    ? 'bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white shadow-lg'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Cards */}
        {stats && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/50 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-blue-400 text-3xl">🎫</div>
                <div className="text-blue-400/50 text-sm">Total</div>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{stats.overview.totalTokens}</div>
              <div className="text-blue-300/70 text-sm">Support Tickets</div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 hover:border-green-500/50 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-green-400 text-3xl">✅</div>
                <div className="text-green-400/50 text-sm">Resolved</div>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{stats.overview.solvedTokens}</div>
              <div className="text-green-300/70 text-sm">
                {((stats.overview.solvedTokens / stats.overview.totalTokens) * 100 || 0).toFixed(1)}% Success Rate
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-purple-400 text-3xl">⚡</div>
                <div className="text-purple-400/50 text-sm">Avg Time</div>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{formatTime(analytics.avgSolveTime)}</div>
              <div className="text-purple-300/70 text-sm">Resolution Time</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30 hover:border-yellow-500/50 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="text-yellow-400 text-3xl">⭐</div>
                <div className="text-yellow-400/50 text-sm">Rating</div>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{analytics.avgRating}</div>
              <div className="text-yellow-300/70 text-sm">{analytics.feedbackAnalysis.total} Reviews</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'analytics', icon: '📈', label: 'Analytics' },
            { id: 'departments', icon: '🏢', label: 'Departments' },
            { id: 'admins', icon: '👥', label: 'Admin Team' },
            { id: 'users', icon: '👤', label: 'User Management' },
            { id: 'tokens', icon: '🎫', label: 'All Tickets' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white shadow-lg transform scale-105'
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Time Series Chart */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">📅 Ticket Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.timeSeriesData}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" stroke="#ffffff60" />
                    <YAxis stroke="#ffffff60" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="created" stroke="#8884d8" fillOpacity={1} fill="url(#colorCreated)" />
                    <Area type="monotone" dataKey="solved" stroke="#00C49F" fillOpacity={1} fill="url(#colorSolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">📊 Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Solved', value: analytics.statusDist.solved },
                        { name: 'Assigned', value: analytics.statusDist.assigned },
                        { name: 'Pending', value: analytics.statusDist.pending }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Performance Cards */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6">🏢 Department Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.deptPerformance.map(dept => (
                  <div key={dept.name} className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-5 border border-white/20 hover:border-[#ED1B2F]/50 transition-all">
                    <h4 className="text-white font-bold text-lg mb-3">{dept.name}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">Total Tickets</span>
                        <span className="text-white font-semibold">{dept.total}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">Solved</span>
                        <span className="text-green-400 font-semibold">{dept.solved}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">Efficiency</span>
                        <span className="text-purple-400 font-semibold">{dept.efficiency}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm">Avg Time</span>
                        <span className="text-blue-400 font-semibold">{dept.avgTime.toFixed(1)}h</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#ED1B2F] to-[#455185] h-full transition-all"
                        style={{ width: `${dept.efficiency}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Admin Performance Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">👨‍💼 Admin Performance Analytics</h3>
                <select
                  value={filters.adminPerformance}
                  onChange={(e) => setFilters({ ...filters, adminPerformance: e.target.value })}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                >
                  <option value="all" className="text-gray-900">All Admins</option>
                  <option value="top" className="text-gray-900">Top Performers</option>
                  <option value="active" className="text-gray-900">Active Only</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                        Admin {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('total')}>
                        Total {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('solved')}>
                        Solved {sortConfig.key === 'solved' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('efficiency')}>
                        Efficiency {sortConfig.key === 'efficiency' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('avgTime')}>
                        Avg Time {sortConfig.key === 'avgTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('avgRating')}>
                        Rating {sortConfig.key === 'avgRating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.adminStats.map((stat, idx) => (
                      <tr 
                        key={stat.admin._id}
                        className="border-b border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedAdmin({ ...stat.admin, profile: adminProfiles.find(p => p.user?._id === stat.admin._id) });
                          setShowAdminDetailModal(true);
                        }}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold">
                              {stat.admin.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="text-white font-semibold">{stat.admin.name}</div>
                              <div className="text-white/50 text-xs">{stat.admin.department?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                            {stat.total}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                            {stat.solved}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-white/10 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${stat.efficiency}%` }}
                              ></div>
                            </div>
                            <span className="text-white/80 text-sm font-semibold">{stat.efficiency.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-white/80 font-medium">
                          {formatTime(stat.avgTime)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {stat.avgRating > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-yellow-400 font-bold">{stat.avgRating.toFixed(1)}</span>
                              <span className="text-yellow-400">⭐</span>
                            </div>
                          ) : (
                            <span className="text-white/30">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Distribution */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">🎯 Priority Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'High', value: analytics.priorityDist.high, fill: '#EF4444' },
                    { name: 'Medium', value: analytics.priorityDist.medium, fill: '#FBBF24' },
                    { name: 'Low', value: analytics.priorityDist.low, fill: '#10B981' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#ffffff60" />
                    <YAxis stroke="#ffffff60" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#EF4444', '#FBBF24', '#10B981'][index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Efficiency Radar */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">📡 Department Efficiency</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analytics.deptPerformance}>
                    <PolarGrid stroke="#ffffff20" />
                    <PolarAngleAxis dataKey="name" stroke="#ffffff60" />
                    <PolarRadiusAxis stroke="#ffffff60" />
                    <Radar name="Efficiency" dataKey="efficiency" stroke="#ED1B2F" fill="#ED1B2F" fillOpacity={0.6} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">🏢 Department Management</h3>
                <button
                  onClick={() => {
                    setShowDeptModal(true);
                    setEditingDept(null);
                    setNewDept({ name: '', description: '', categories: [] });
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="mr-2">➕</span>
                  New Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => {
                  const deptTokens = tokens.filter(t => t.department?._id === dept._id);
                  const solved = deptTokens.filter(t => t.status === 'solved').length;
                  
                  return (
                    <div key={dept._id} className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-6 border border-white/20 hover:border-[#ED1B2F]/50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-xl mb-2">{dept.name}</h4>
                          <p className="text-white/60 text-sm line-clamp-2">{dept.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingDept(dept);
                              setNewDept({ name: dept.name, description: dept.description || '', categories: dept.categories || [] });
                              setShowDeptModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteDepartment(dept._id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {dept.categories && dept.categories.length > 0 && (
                        <div className="mb-4">
                          <div className="text-white/50 text-xs mb-2">Categories ({dept.categories.length})</div>
                          <div className="flex flex-wrap gap-2">
                            {dept.categories.slice(0, 3).map((cat, idx) => (
                              <span key={idx} className="px-2 py-1 bg-[#455185]/30 text-[#455185] border border-[#455185]/50 rounded-lg text-xs">
                                {cat.name}
                              </span>
                            ))}
                            {dept.categories.length > 3 && (
                              <span className="px-2 py-1 bg-white/10 text-white/60 rounded-lg text-xs">
                                +{dept.categories.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-white/50 text-xs">Total</div>
                          <div className="text-white font-bold text-lg">{deptTokens.length}</div>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-2">
                          <div className="text-green-400/70 text-xs">Solved</div>
                          <div className="text-green-400 font-bold text-lg">{solved}</div>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all"
                          style={{ width: `${deptTokens.length ? (solved / deptTokens.length * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h3 className="text-2xl font-bold text-white">👥 Admin Team Directory</h3>
                
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Search admins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  />
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  >
                    <option value="all" className="text-gray-900">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAdminProfileForm(true)}
                    className="px-6 py-2 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-lg transition-all shadow-lg whitespace-nowrap"
                  >
                    ➕ New Admin
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAdmins.map(profile => {
                  const adminStat = analytics?.adminStats.find(s => s.admin._id === profile.user?._id);
                  
                  return (
                    <div 
                      key={profile._id}
                      onClick={() => {
                        setSelectedAdmin({ ...profile.user, profile });
                        setShowAdminDetailModal(true);
                      }}
                      className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-5 border border-white/20 hover:border-[#ED1B2F]/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {profile.user?.name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-lg group-hover:text-[#ED1B2F] transition-colors">
                            {profile.user?.name}
                          </h4>
                          <p className="text-white/60 text-sm">{profile.user?.email}</p>
                          <p className="text-white/40 text-xs mt-1">{profile.department?.name}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAdminProfile(profile._id);
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          🗑️
                        </button>
                      </div>

                      {profile.categories && profile.categories.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {profile.categories.slice(0, 2).map((cat, idx) => (
                              <span key={idx} className="px-2 py-1 bg-[#455185]/20 text-[#455185] border border-[#455185]/30 rounded text-xs">
                                {cat}
                              </span>
                            ))}
                            {profile.categories.length > 2 && (
                              <span className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                                +{profile.categories.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {adminStat && (
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                          <div className="text-center">
                            <div className="text-blue-400 font-bold text-lg">{adminStat.total}</div>
                            <div className="text-white/50 text-xs">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-400 font-bold text-lg">{adminStat.solved}</div>
                            <div className="text-white/50 text-xs">Solved</div>
                          </div>
                          <div className="text-center">
                            <div className="text-yellow-400 font-bold text-lg">
                              {adminStat.avgRating > 0 ? adminStat.avgRating.toFixed(1) : '-'}
                            </div>
                            <div className="text-white/50 text-xs">Rating</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Users Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">👤 User Management</h3>
                  <p className="text-white/60 text-sm mt-1">Manage all users, view details, and control access</p>
                </div>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  />
                </div>
              </div>

              {/* User Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-xl p-4 border border-blue-500/30">
                  <div className="text-blue-400 text-2xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-white">{users.length}</div>
                  <div className="text-blue-300/70 text-sm">Total Users</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-xl p-4 border border-green-500/30">
                  <div className="text-green-400 text-2xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-white">
                    {users.filter(u => u.status === 'active' || !u.status).length}
                  </div>
                  <div className="text-green-300/70 text-sm">Active Users</div>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-xl rounded-xl p-4 border border-red-500/30">
                  <div className="text-red-400 text-2xl mb-2">🚫</div>
                  <div className="text-2xl font-bold text-white">
                    {users.filter(u => u.status === 'suspended').length}
                  </div>
                  <div className="text-red-300/70 text-sm">Suspended</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-xl p-4 border border-purple-500/30">
                  <div className="text-purple-400 text-2xl mb-2">❄️</div>
                  <div className="text-2xl font-bold text-white">
                    {users.filter(u => u.status === 'frozen').length}
                  </div>
                  <div className="text-purple-300/70 text-sm">Frozen</div>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">User</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Role</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Department</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Status</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Joined</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => 
                        !searchQuery || 
                        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(userItem => (
                        <tr
                          key={userItem._id}
                          className="border-b border-white/10 hover:bg-white/5 transition-all"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold">
                                {userItem.name?.charAt(0)}
                              </div>
                              <div>
                                <div className="text-white font-semibold">{userItem.name}</div>
                                <div className="text-white/50 text-xs">{userItem.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              userItem.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400' :
                              userItem.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {userItem.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-white/70">
                            {userItem.department?.name || <span className="text-white/40">No Department</span>}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              userItem.status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                              userItem.status === 'frozen' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {userItem.status || 'active'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-white/60 text-sm">
                            {new Date(userItem.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setShowUserModal(true);
                                }}
                                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
                              >
                                👁️ View
                              </button>
                              {userItem._id !== user._id && (
                                <>
                                  {(!userItem.status || userItem.status === 'active') ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedUser(userItem);
                                          setStatusAction({ status: 'suspended', reason: '' });
                                          setShowStatusModal(true);
                                        }}
                                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                                      >
                                        🚫 Suspend
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedUser(userItem);
                                          setStatusAction({ status: 'frozen', reason: '' });
                                          setShowStatusModal(true);
                                        }}
                                        className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
                                      >
                                        ❄️ Freeze
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedUser(userItem);
                                        setStatusAction({ status: 'active', reason: '' });
                                        setShowStatusModal(true);
                                      }}
                                      className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors"
                                    >
                                      ✅ Activate
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h3 className="text-2xl font-bold text-white">🎫 All Support Tickets</h3>
                
                <div className="flex flex-wrap gap-3">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  >
                    <option value="all" className="text-gray-900">All Status</option>
                    <option value="pending" className="text-gray-900">Pending</option>
                    <option value="assigned" className="text-gray-900">Assigned</option>
                    <option value="solved" className="text-gray-900">Solved</option>
                  </select>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  >
                    <option value="all" className="text-gray-900">All Priority</option>
                    <option value="high" className="text-gray-900">High</option>
                    <option value="medium" className="text-gray-900">Medium</option>
                    <option value="low" className="text-gray-900">Low</option>
                  </select>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  >
                    <option value="all" className="text-gray-900">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Ticket</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Creator</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Department</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Status</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Priority</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Assigned To</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTokensList.slice(0, 20).map(token => (
                      <tr
                        key={token._id}
                        onClick={() => {
                          setSelectedToken(token);
                          setShowTokenDetailModal(true);
                        }}
                        className="border-b border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                      >
                        <td className="py-4 px-4">
                          <div>
                            <div className="text-white font-semibold">{token.title}</div>
                            <div className="text-white/40 text-xs font-mono">#{token.tokenNumber || token._id.slice(-8)}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white/80">{token.createdBy?.name}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-white/70">{token.department?.name || 'N/A'}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            token.status === 'solved' ? 'bg-green-500/20 text-green-400' :
                            token.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {token.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            token.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            token.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {token.priority}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {token.assignedTo ? (
                            <div className="text-white/80">{token.assignedTo.name}</div>
                          ) : (
                            <span className="text-white/40">Unassigned</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-white/60 text-sm">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredTokensList.length > 20 && (
                <div className="mt-4 text-center text-white/60">
                  Showing 20 of {filteredTokensList.length} tickets
                </div>
              )}
            </div>
          </div>
        )}

        {/* Department Modal */}
        {showDeptModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeptModal(false)}>
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#2a2f4a] rounded-2xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-white mb-6">
                {editingDept ? '✏️ Edit Department' : '➕ New Department'}
              </h3>
              
              <form onSubmit={saveDepartment} className="space-y-4">
                <div>
                  <label className="block text-white/80 mb-2">Department Name</label>
                  <input
                    type="text"
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                    placeholder="e.g., Technical Support"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Description</label>
                  <textarea
                    value={newDept.description}
                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] h-24"
                    placeholder="Brief description of the department"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Categories</label>
                  <div className="space-y-2 bg-white/5 rounded-xl p-4 max-h-48 overflow-y-auto">
                    {newDept.categories.map((cat, idx) => (
                      <div key={cat._id} className="bg-white/10 rounded-lg p-3 flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-white font-medium">{cat.name}</div>
                          {cat.subCategories?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cat.subCategories.map((sub, sidx) => (
                                <span key={sidx} className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewDept({ ...newDept, categories: newDept.categories.filter((_, i) => i !== idx) })}
                          className="text-red-400 hover:text-red-300 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addCategoryToDept}
                    className="mt-2 px-4 py-2 bg-[#455185]/30 hover:bg-[#455185]/50 text-white rounded-lg transition-colors w-full"
                  >
                    + Add Category
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeptModal(false)}
                    className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-colors"
                  >
                    {editingDept ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Profile Form Modal */}
        {showAdminProfileForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdminProfileForm(false)}>
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#2a2f4a] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-white mb-6">➕ Create Admin Profile</h3>
              
              <form onSubmit={createAdminProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newAdminProfile.name}
                      onChange={(e) => setNewAdminProfile({ ...newAdminProfile, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">Email *</label>
                    <input
                      type="email"
                      value={newAdminProfile.email}
                      onChange={(e) => setNewAdminProfile({ ...newAdminProfile, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">Password *</label>
                    <input
                      type="password"
                      value={newAdminProfile.password}
                      onChange={(e) => setNewAdminProfile({ ...newAdminProfile, password: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      required
                      minLength="6"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">Employee ID</label>
                    <input
                      type="text"
                      value={newAdminProfile.employeeId}
                      onChange={(e) => setNewAdminProfile({ ...newAdminProfile, employeeId: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={newAdminProfile.phone}
                      onChange={(e) => setNewAdminProfile({ ...newAdminProfile, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">Department *</label>
                    <select
                      value={newAdminProfile.department}
                      onChange={(e) => setNewAdminProfile({ ...newAdminProfile, department: e.target.value, categories: [] })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      required
                    >
                      <option value="" className="text-gray-900">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Areas of Expertise</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      placeholder="e.g., Network Security"
                    />
                    <button type="button" onClick={addExpertise} className="px-4 py-2 bg-[#455185] hover:bg-[#3a456f] text-white rounded-lg transition-colors">
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newAdminProfile.expertise.map((exp, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-2">
                        {exp}
                        <button type="button" onClick={() => setNewAdminProfile({ ...newAdminProfile, expertise: newAdminProfile.expertise.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-300">✕</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAdminProfileForm(false)} className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-colors">
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Token Detail Modal */}
        {showTokenDetailModal && selectedToken && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTokenDetailModal(false)}>
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#2a2f4a] rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">{selectedToken.title}</h3>
                  <span className="bg-gradient-to-r from-[#ED1B2F]/30 to-[#455185]/30 text-white px-4 py-2 rounded-lg font-mono border border-white/20">
                    #{selectedToken.tokenNumber || selectedToken._id.slice(-8)}
                  </span>
                </div>
                <button onClick={() => setShowTokenDetailModal(false)} className="text-white/60 hover:text-white text-3xl">×</button>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-2">Description</p>
                  <p className="text-white">{selectedToken.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-2">Status</p>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedToken.status === 'solved' ? 'bg-green-500/20 text-green-400' :
                      selectedToken.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedToken.status}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-2">Priority</p>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      selectedToken.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      selectedToken.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {selectedToken.priority}
                    </span>
                  </div>
                </div>

                {selectedToken.timeToSolve && (
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/30">
                    <p className="text-white/60 text-sm mb-2">⏱️ Time to Solve</p>
                    <p className="text-3xl font-bold text-purple-400">{formatTime(selectedToken.timeToSolve)}</p>
                  </div>
                )}

                {selectedToken.solution && (
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/30">
                    <p className="text-white/60 text-sm mb-2">✅ Solution</p>
                    <p className="text-white/90">{selectedToken.solution}</p>
                    {selectedToken.solvedBy && (
                      <p className="text-white/50 text-sm mt-2">
                        Solved by {selectedToken.solvedBy.name} on {new Date(selectedToken.solvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {selectedToken.feedback?.rating && (
                  <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/30">
                    <p className="text-white/60 text-sm mb-2">💬 User Feedback</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400 text-2xl">{'⭐'.repeat(selectedToken.feedback.rating)}</span>
                      <span className="text-white font-bold">({selectedToken.feedback.rating}/5)</span>
                    </div>
                    {selectedToken.feedback.comment && (
                      <p className="text-white/80">{selectedToken.feedback.comment}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUserModal(false)}>
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#2a2f4a] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-white">👤 User Profile</h3>
                <button onClick={() => setShowUserModal(false)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {selectedUser.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">{selectedUser.name}</h4>
                    <p className="text-white/70">{selectedUser.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedUser.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400' :
                        selectedUser.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {selectedUser.role}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedUser.status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                        selectedUser.status === 'frozen' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {selectedUser.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-2">Department</p>
                    <p className="text-white font-semibold">{selectedUser.department?.name || 'Not Assigned'}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-2">Employee Code</p>
                    <p className="text-white font-semibold">{selectedUser.employeeCode || 'N/A'}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-2">Company</p>
                    <p className="text-white font-semibold">{selectedUser.companyName || 'N/A'}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-2">Joined</p>
                    <p className="text-white font-semibold">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedUser.statusReason && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <p className="text-yellow-400 font-semibold mb-2">Status Reason</p>
                    <p className="text-white/80">{selectedUser.statusReason}</p>
                    {selectedUser.statusChangedAt && (
                      <p className="text-white/50 text-xs mt-2">
                        Changed on {new Date(selectedUser.statusChangedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* User's Ticket Statistics */}
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-3">Ticket Statistics</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-blue-400 font-bold text-2xl">
                        {tokens.filter(t => t.createdBy?._id === selectedUser._id).length}
                      </div>
                      <div className="text-white/50 text-xs">Created</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 font-bold text-2xl">
                        {tokens.filter(t => t.createdBy?._id === selectedUser._id && t.status === 'solved').length}
                      </div>
                      <div className="text-white/50 text-xs">Solved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-400 font-bold text-2xl">
                        {tokens.filter(t => t.createdBy?._id === selectedUser._id && t.status === 'pending').length}
                      </div>
                      <div className="text-white/50 text-xs">Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Change Modal */}
        {showStatusModal && selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowStatusModal(false)}>
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#2a2f4a] rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-white mb-4">
                {statusAction.status === 'suspended' ? '🚫 Suspend User' :
                 statusAction.status === 'frozen' ? '❄️ Freeze User' :
                 '✅ Activate User'}
              </h3>
              
              <div className="mb-6">
                <p className="text-white/80 mb-2">User: <span className="font-semibold">{selectedUser.name}</span></p>
                <p className="text-white/60 text-sm">{selectedUser.email}</p>
              </div>

              <div className="mb-6">
                <label className="block text-white/80 mb-2">
                  Reason {statusAction.status !== 'active' && <span className="text-red-400">*</span>}
                </label>
                <textarea
                  value={statusAction.reason}
                  onChange={(e) => setStatusAction({ ...statusAction, reason: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] h-24"
                  placeholder={
                    statusAction.status === 'suspended' ? 'Reason for suspension...' :
                    statusAction.status === 'frozen' ? 'Reason for freezing account...' :
                    'Reason for reactivation (optional)...'
                  }
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (statusAction.status !== 'active' && !statusAction.reason.trim()) {
                      alert('Please provide a reason');
                      return;
                    }
                    updateUserStatus(selectedUser._id, statusAction.status, statusAction.reason);
                  }}
                  className={`flex-1 px-6 py-3 rounded-xl transition-colors ${
                    statusAction.status === 'suspended' ? 'bg-red-500 hover:bg-red-600' :
                    statusAction.status === 'frozen' ? 'bg-purple-500 hover:bg-purple-600' :
                    'bg-green-500 hover:bg-green-600'
                  } text-white`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Detail Modal */}
        {showAdminDetailModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdminDetailModal(false)}>
            <div className="bg-gradient-to-br from-[#1a1f3a] to-[#2a2f4a] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-white">👨‍💼 Admin Profile</h3>
                <button onClick={() => setShowAdminDetailModal(false)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {selectedAdmin.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">{selectedAdmin.name}</h4>
                    <p className="text-white/70">{selectedAdmin.email}</p>
                    <p className="text-white/50 text-sm">{selectedAdmin.department?.name}</p>
                  </div>
                </div>

                {selectedAdmin.profile?.expertise && selectedAdmin.profile.expertise.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-2">Expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAdmin.profile.expertise.map((exp, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAdmin.profile?.categories && selectedAdmin.profile.categories.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-2">Assigned Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAdmin.profile.categories.map((cat, idx) => (
                        <span key={idx} className="px-3 py-1 bg-[#455185]/30 text-[#455185] border border-[#455185]/50 rounded-lg text-sm">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
