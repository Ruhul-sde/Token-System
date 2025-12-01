
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
      <div className="mb-8 h-48 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-[#ED1B2F]/30 to-[#455185]/30 backdrop-blur-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-2 animate-pulse">🎫</div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        </div>
      </div>
    );
  }

  const { Canvas, OrbitControls, Sphere, Box, Float, MeshDistortMaterial } = ThreeComponents;

  return (
    <div className="mb-8 h-48 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-[#ED1B2F]/20 to-[#455185]/20 backdrop-blur-xl">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
          <Sphere args={[0.8, 32, 32]} position={[-2, 0, 0]}>
            <MeshDistortMaterial color="#ED1B2F" roughness={0.3} metalness={0.8} distort={0.4} speed={2} />
          </Sphere>
        </Float>
        <Float speed={2} rotationIntensity={1.5} floatIntensity={0.8}>
          <Box args={[1, 1, 1]} position={[2, 0, 0]}>
            <MeshDistortMaterial color="#455185" roughness={0.2} metalness={0.9} distort={0.3} speed={1.5} />
          </Box>
        </Float>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};

const AdminDashboard = () => {
  const [tokens, setTokens] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    department: 'all'
  });
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { API_URL, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
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

    setFilteredTokens(filtered);
  }, [filters, tokens]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      console.log('===== ADMIN DASHBOARD FETCH =====');
      console.log('Fetching tokens from:', `${API_URL}/tokens`);
      console.log('Auth token present:', !!token);
      console.log('User role:', user?.role);
      console.log('User department:', user?.department);
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const config = {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      };

      const [tokensRes, usersRes, deptsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/tokens`, config),
        axios.get(`${API_URL}/users`, config),
        axios.get(`${API_URL}/departments`, config),
        axios.get(`${API_URL}/dashboard/stats`, config)
      ]);

      console.log('✓ Tokens received:', tokensRes.data.length);
      console.log('Sample tokens:', tokensRes.data.slice(0, 2).map(t => ({
        id: t._id.slice(-6),
        number: t.tokenNumber,
        title: t.title,
        dept: t.department?.name
      })));
      console.log('=================================');

      setTokens(tokensRes.data);
      setFilteredTokens(tokensRes.data);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('❌ Error fetching data:', error.response?.data || error.message);
      console.error('Error details:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const assignToken = async (tokenId, assignedTo, department) => {
    try {
      await axios.patch(`${API_URL}/tokens/${tokenId}/assign`, { assignedTo, department });
      fetchData();
    } catch (error) {
      console.error('Error assigning token:', error);
    }
  };

  const updateTokenStatus = async (tokenId, status, solution = null) => {
    try {
      const updateData = { status };
      if (solution) {
        updateData.solution = solution;
      }
      await axios.patch(`${API_URL}/tokens/${tokenId}/update`, updateData);
      fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error updating token:', error);
      alert(error.response?.data?.message || 'Failed to update token status');
    }
  };

  const addRemark = async (tokenId, text) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      };
      
      await axios.post(`${API_URL}/tokens/${tokenId}/remarks`, { text }, config);
      
      // Refresh the selected token to show new remark
      const updatedTokenRes = await axios.get(`${API_URL}/tokens/${tokenId}`, config);
      setSelectedToken(updatedTokenRes.data);
      
      // Refresh all tokens
      fetchData();
    } catch (error) {
      console.error('Error adding remark:', error);
      alert(error.response?.data?.message || 'Failed to add remark. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'in-progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const departmentStats = departments.map(dept => {
    const deptTokens = tokens.filter(t => t.department?._id === dept._id);
    return {
      name: dept.name,
      total: deptTokens.length,
      solved: deptTokens.filter(t => t.status === 'resolved').length,
      pending: deptTokens.filter(t => t.status === 'pending').length
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Dashboard</h2>
            <p className="text-white/80 mb-4">{error}</p>
            <button 
              onClick={fetchData}
              className="px-6 py-2 bg-[#ED1B2F] hover:bg-[#ED1B2F]/80 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Header3D />

        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-[#ED1B2F] to-[#455185] bg-clip-text text-transparent">
            Admin Dashboard
          </h2>
          <p className="text-white/60 mt-2">Welcome back, {user?.name}</p>
          {user?.department && (
            <p className="text-white/50 mt-1 text-sm">
              Managing: <span className="text-[#ED1B2F] font-semibold">{departments.find(d => d._id === user.department)?.name || 'Your Department'}</span>
            </p>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-white/60 text-sm mb-2">Total Tokens</h3>
              <p className="text-3xl font-bold text-white">{stats.overview.totalTokens}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-white/60 text-sm mb-2">Pending</h3>
              <p className="text-3xl font-bold text-yellow-400">{stats.overview.pendingTokens}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-white/60 text-sm mb-2">Assigned</h3>
              <p className="text-3xl font-bold text-blue-400">{stats.overview.assignedTokens}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-white/60 text-sm mb-2">Resolved</h3>
              <p className="text-3xl font-bold text-green-400">{stats.overview.resolvedTokens || stats.overview.solvedTokens || 0}</p>
            </div>
          </div>
        )}

        {departmentStats.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Department Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="name" stroke="#ffffff" />
                <YAxis stroke="#ffffff" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="solved" fill="#00C49F" name="Resolved" />
                <Bar dataKey="pending" fill="#FFBB28" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Filter Tokens</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
            >
              <option value="all" className="text-gray-900">All Status</option>
              <option value="pending" className="text-gray-900">Pending</option>
              <option value="assigned" className="text-gray-900">Assigned</option>
              <option value="in-progress" className="text-gray-900">In Progress</option>
              <option value="resolved" className="text-gray-900">Resolved</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
            >
              <option value="all" className="text-gray-900">All Priority</option>
              <option value="high" className="text-gray-900">High</option>
              <option value="medium" className="text-gray-900">Medium</option>
              <option value="low" className="text-gray-900">Low</option>
            </select>

            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
            >
              <option value="all" className="text-gray-900">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6">
          {filteredTokens.length === 0 ? (
            <div className="text-center py-16 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold text-white/80 mb-2">No Tokens Found</h3>
              <p className="text-white/60">No tokens match your current filters</p>
            </div>
          ) : (
            filteredTokens.map((token) => (
              <div
                key={token._id}
                className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-[#ED1B2F]/50 hover:shadow-2xl hover:shadow-[#ED1B2F]/20 transition-all duration-300 cursor-pointer"
                onClick={() => { setSelectedToken(token); setShowModal(true); }}
              >
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-1 h-12 bg-gradient-to-b from-[#ED1B2F] to-[#455185] rounded-full"></span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white group-hover:text-[#ED1B2F] transition-colors">
                            {token.title}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(token.status)}`}>
                            {token.status.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(token.priority)}`}>
                            {token.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="mb-2">
                          <span className="bg-gradient-to-r from-[#ED1B2F]/20 to-[#455185]/20 text-white px-3 py-1 rounded-lg text-sm font-mono font-bold border border-white/20">
                            #{token.tokenNumber || token._id.slice(-8)}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm mb-2">{token.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-white/50">
                          <span>👤 {token.createdBy?.name}</span>
                          <span>•</span>
                          <span>📅 {new Date(token.createdAt).toLocaleDateString()}</span>
                          {token.department?.name && (
                            <>
                              <span>•</span>
                              <span>🏢 {token.department.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showModal && selectedToken && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">Token Details</h3>
                <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-xl font-bold text-white">{selectedToken.title}</h4>
                    <span className="bg-gradient-to-r from-[#ED1B2F]/20 to-[#455185]/20 text-white px-3 py-1 rounded-lg text-sm font-mono font-bold border border-white/20">
                      #{selectedToken.tokenNumber || selectedToken._id.slice(-8)}
                    </span>
                  </div>
                  <p className="text-white/80 mb-4">{selectedToken.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">Status:</span>
                      <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedToken.status)}`}>
                        {selectedToken.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/60">Priority:</span>
                      <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(selectedToken.priority)}`}>
                        {selectedToken.priority}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/60">Department:</span>
                      <span className="text-white font-semibold ml-2">{selectedToken.department?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Created By:</span>
                      <span className="text-white font-semibold ml-2">{selectedToken.createdBy?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Update Status</h4>
                  <div className="space-y-4">
                    <select
                      id={`statusSelect-${selectedToken._id}`}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                      defaultValue={selectedToken.status}
                    >
                      <option value="pending" className="text-gray-900">Pending</option>
                      <option value="assigned" className="text-gray-900">Assigned</option>
                      <option value="in-progress" className="text-gray-900">In Progress</option>
                      <option value="resolved" className="text-gray-900">Resolved</option>
                    </select>

                    <div id={`solutionField-${selectedToken._id}`} style={{ display: 'none' }}>
                      <label className="block text-white/80 text-sm mb-2">Solution (Required for Resolved status)</label>
                      <textarea
                        id={`solutionText-${selectedToken._id}`}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#455185] min-h-32"
                        placeholder="Describe how you solved this issue..."
                      />
                    </div>

                    <button
                      onClick={async () => {
                        const statusSelect = document.getElementById(`statusSelect-${selectedToken._id}`);
                        const solutionText = document.getElementById(`solutionText-${selectedToken._id}`);
                        const newStatus = statusSelect?.value;
                        
                        if (newStatus === 'resolved') {
                          const solution = solutionText?.value;
                          if (!solution || solution.trim().length < 10) {
                            alert('Please provide a solution (minimum 10 characters) to mark the token as resolved');
                            return;
                          }
                          await updateTokenStatus(selectedToken._id, newStatus, solution.trim());
                        } else {
                          await updateTokenStatus(selectedToken._id, newStatus);
                        }
                      }}
                      className="w-full py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01626] text-white rounded-xl font-semibold transition-all"
                    >
                      Update Status
                    </button>
                  </div>
                  <script dangerouslySetInnerHTML={{__html: `
                    const statusSelect = document.getElementById('statusSelect-${selectedToken._id}');
                    const solutionField = document.getElementById('solutionField-${selectedToken._id}');
                    if (statusSelect && solutionField) {
                      statusSelect.addEventListener('change', function() {
                        solutionField.style.display = this.value === 'resolved' ? 'block' : 'none';
                      });
                    }
                  `}} />
                </div>

                {selectedToken.remarks && selectedToken.remarks.length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h4 className="text-lg font-bold text-white mb-4">Remarks</h4>
                    <div className="space-y-3">
                      {selectedToken.remarks.map((remark, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-4 border-l-4 border-[#455185]">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-white/90 font-semibold text-sm">{remark.addedBy?.name}</span>
                            <span className="text-white/50 text-xs">{new Date(remark.addedAt).toLocaleString()}</span>
                          </div>
                          <p className="text-white/80 text-sm">{remark.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Add Remark</h4>
                  <textarea
                    id={`remarkText-${selectedToken._id}`}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#455185] min-h-24"
                    placeholder="Enter your remark..."
                  />
                  <button
                    onClick={async () => {
                      const textarea = document.getElementById(`remarkText-${selectedToken._id}`);
                      const text = textarea?.value;
                      if (text && text.trim()) {
                        await addRemark(selectedToken._id, text.trim());
                        if (textarea) {
                          textarea.value = '';
                        }
                      }
                    }}
                    className="mt-3 w-full py-3 bg-gradient-to-r from-[#455185] to-[#3a456f] hover:from-[#3a456f] hover:to-[#2f3859] text-white rounded-xl font-semibold transition-all"
                  >
                    Submit Remark
                  </button>
                </div>

                {/* Solution Display */}
                {selectedToken.solution && (
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-500/30">
                    <h4 className="text-lg font-bold text-white mb-3">Solution Provided</h4>
                    <p className="text-white/90 mb-2">{selectedToken.solution}</p>
                    {selectedToken.solvedBy && (
                      <p className="text-white/50 text-xs">
                        Solved by {selectedToken.solvedBy.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Feedback Section - Display if feedback exists */}
                {selectedToken.feedback && (
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/30">
                    <h4 className="text-lg font-bold text-white mb-3">User Feedback</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400 text-xl">{'⭐'.repeat(selectedToken.feedback.rating)}</span>
                      <span className="text-white/60 text-sm">({selectedToken.feedback.rating}/5)</span>
                    </div>
                    {selectedToken.feedback.comment && (
                      <p className="text-white/80 text-sm mb-2">{selectedToken.feedback.comment}</p>
                    )}
                    <p className="text-white/50 text-xs">
                      Submitted on {new Date(selectedToken.feedback.submittedAt).toLocaleString()}
                    </p>
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

// Add event listener for status select change
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    document.addEventListener('change', (e) => {
      if (e.target.id && e.target.id.startsWith('statusSelect-')) {
        const tokenId = e.target.id.replace('statusSelect-', '');
        const solutionField = document.getElementById(`solutionField-${tokenId}`);
        if (solutionField) {
          solutionField.style.display = e.target.value === 'resolved' ? 'block' : 'none';
        }
      }
    });
  });
}

export default AdminDashboard;
