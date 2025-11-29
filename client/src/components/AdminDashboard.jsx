
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, Float, MeshDistortMaterial } from '@react-three/drei';

const AnimatedScene = () => (
  <>
    <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
      <Box args={[1, 1, 1]} position={[-2, 0, 0]}>
        <MeshDistortMaterial color="#ED1B2F" roughness={0.3} metalness={0.8} distort={0.3} speed={2} />
      </Box>
    </Float>
    <Float speed={2} rotationIntensity={1.5} floatIntensity={0.8}>
      <Sphere args={[0.6, 32, 32]} position={[2, 0, 0]}>
        <MeshDistortMaterial color="#455185" roughness={0.2} metalness={0.9} distort={0.4} speed={1.5} />
      </Sphere>
    </Float>
    <Float speed={1.8} rotationIntensity={0.8} floatIntensity={0.6}>
      <Box args={[0.8, 0.8, 0.8]} position={[0, 1, 0]}>
        <MeshDistortMaterial color="#ffffff" roughness={0.1} metalness={0.7} distort={0.2} speed={2.5} />
      </Box>
    </Float>
  </>
);

const AdminDashboard = () => {
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: ''
  });
  const [updateData, setUpdateData] = useState({
    status: '',
    priority: '',
    assignedTo: '',
    expectedResolutionDate: '',
    actualResolutionDate: ''
  });
  const [newRemark, setNewRemark] = useState('');
  const [newAttachment, setNewAttachment] = useState({ filename: '', url: '' });
  const { API_URL, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, tokens]);

  const fetchData = async () => {
    try {
      const [tokensRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/tokens`),
        axios.get(`${API_URL}/users`)
      ]);
      setTokens(tokensRes.data);
      setUsers(usersRes.data.filter(u => u.role === 'admin' && u.department));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...tokens];

    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    if (filters.search) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredTokens(filtered);
  };

  const openTokenModal = (token) => {
    setSelectedToken(token);
    setUpdateData({
      status: token.status,
      priority: token.priority,
      assignedTo: token.assignedTo?._id || '',
      expectedResolutionDate: token.expectedResolutionDate ? new Date(token.expectedResolutionDate).toISOString().split('T')[0] : '',
      actualResolutionDate: token.actualResolutionDate ? new Date(token.actualResolutionDate).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleUpdate = async () => {
    try {
      await axios.patch(`${API_URL}/tokens/${selectedToken._id}/update`, updateData);
      fetchData();
      setShowModal(false);
    } catch (error) {
      console.error('Error updating token:', error);
      alert('Failed to update token');
    }
  };

  const handleAssignToSelf = async (tokenId) => {
    try {
      await axios.patch(`${API_URL}/tokens/${tokenId}/assign`, {
        assignedTo: user._id,
        department: user.department._id
      });
      fetchData();
    } catch (error) {
      console.error('Error assigning token:', error);
    }
  };

  const addRemark = async () => {
    if (!newRemark.trim()) return;
    try {
      await axios.post(`${API_URL}/tokens/${selectedToken._id}/remarks`, { text: newRemark });
      setNewRemark('');
      fetchData();
      const updated = await axios.get(`${API_URL}/tokens`);
      const updatedToken = updated.data.find(t => t._id === selectedToken._id);
      setSelectedToken(updatedToken);
    } catch (error) {
      console.error('Error adding remark:', error);
    }
  };

  const addAttachment = async () => {
    if (!newAttachment.filename || !newAttachment.url) return;
    try {
      await axios.post(`${API_URL}/tokens/${selectedToken._id}/attachments`, newAttachment);
      setNewAttachment({ filename: '', url: '' });
      fetchData();
      const updated = await axios.get(`${API_URL}/tokens`);
      const updatedToken = updated.data.find(t => t._id === selectedToken._id);
      setSelectedToken(updatedToken);
    } catch (error) {
      console.error('Error adding attachment:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'closed': return 'bg-gradient-to-r from-gray-500 to-gray-700';
      case 'resolved': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'in-progress': return 'bg-gradient-to-r from-blue-500 to-cyan-600';
      case 'assigned': return 'bg-gradient-to-r from-purple-500 to-indigo-600';
      case 'pending': return 'bg-gradient-to-r from-yellow-500 to-orange-600';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-600';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-500/50 bg-red-500/20';
      case 'medium': return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/20';
      case 'low': return 'text-green-400 border-green-500/50 bg-green-500/20';
      default: return 'text-gray-400 border-gray-500/50 bg-gray-500/20';
    }
  };

  const getSLAStatus = (token) => {
    if (!token.expectedResolutionDate) return { status: 'No SLA', color: 'text-gray-400' };
    
    const now = new Date();
    const expected = new Date(token.expectedResolutionDate);
    const diff = expected - now;
    const hoursLeft = diff / (1000 * 60 * 60);

    if (token.status === 'closed' || token.status === 'resolved') {
      if (token.actualResolutionDate && new Date(token.actualResolutionDate) <= expected) {
        return { status: 'Met SLA', color: 'text-green-400' };
      }
      return { status: 'SLA Breached', color: 'text-red-400' };
    }

    if (hoursLeft < 0) return { status: 'Overdue', color: 'text-red-400' };
    if (hoursLeft < 24) return { status: 'Critical', color: 'text-orange-400' };
    if (hoursLeft < 48) return { status: 'Warning', color: 'text-yellow-400' };
    return { status: 'On Track', color: 'text-green-400' };
  };

  const stats = {
    total: tokens.length,
    pending: tokens.filter(t => t.status === 'pending').length,
    inProgress: tokens.filter(t => t.status === 'in-progress').length,
    resolved: tokens.filter(t => t.status === 'resolved').length,
    closed: tokens.filter(t => t.status === 'closed').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 3D Header */}
        <div className="mb-8 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-[#ED1B2F]/20 to-[#455185]/20 backdrop-blur-xl">
          <Canvas camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <spotLight position={[-10, -10, -10]} angle={0.3} penumbra={1} intensity={1} />
            <AnimatedScene />
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
          </Canvas>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-[#ED1B2F] to-[#455185] bg-clip-text text-transparent">
            Admin Control Center
          </h2>
          <p className="text-white/60 mt-2">Welcome, {user?.name} • {user?.department?.name} Department</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:scale-105 transition-transform">
            <div className="text-white/60 text-sm mb-2">Total Tokens</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30 hover:scale-105 transition-transform">
            <div className="text-yellow-300 text-sm mb-2">Pending</div>
            <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 hover:scale-105 transition-transform">
            <div className="text-blue-300 text-sm mb-2">In Progress</div>
            <div className="text-3xl font-bold text-blue-400">{stats.inProgress}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 hover:scale-105 transition-transform">
            <div className="text-green-300 text-sm mb-2">Resolved</div>
            <div className="text-3xl font-bold text-green-400">{stats.resolved}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-500/20 to-slate-500/10 backdrop-blur-xl rounded-2xl p-6 border border-gray-500/30 hover:scale-105 transition-transform">
            <div className="text-gray-300 text-sm mb-2">Closed</div>
            <div className="text-3xl font-bold text-gray-400">{stats.closed}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="🔍 Search tokens..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
            >
              <option value="all" className="text-gray-900">All Status</option>
              <option value="pending" className="text-gray-900">Pending</option>
              <option value="assigned" className="text-gray-900">Assigned</option>
              <option value="in-progress" className="text-gray-900">In Progress</option>
              <option value="resolved" className="text-gray-900">Resolved</option>
              <option value="closed" className="text-gray-900">Closed</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#455185]"
            >
              <option value="all" className="text-gray-900">All Priority</option>
              <option value="low" className="text-gray-900">Low</option>
              <option value="medium" className="text-gray-900">Medium</option>
              <option value="high" className="text-gray-900">High</option>
            </select>
            <div className="text-white/60 flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
              <span className="text-sm font-semibold">{filteredTokens.length} tokens found</span>
            </div>
          </div>
        </div>

        {/* Tokens Grid */}
        <div className="grid gap-6">
          {filteredTokens.length === 0 ? (
            <div className="text-center py-16 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-white/80 mb-2">No Tokens Found</h3>
              <p className="text-white/60">Try adjusting your filters</p>
            </div>
          ) : (
            filteredTokens.map((token) => {
              const sla = getSLAStatus(token);
              return (
                <div 
                  key={token._id} 
                  className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-[#ED1B2F]/50 hover:shadow-2xl hover:shadow-[#ED1B2F]/20 transition-all duration-300 cursor-pointer"
                  onClick={() => openTokenModal(token)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Side - Main Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="w-1 h-16 bg-gradient-to-b from-[#ED1B2F] to-[#455185] rounded-full"></span>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-start gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-white group-hover:text-[#ED1B2F] transition-colors">
                              {token.title}
                            </h3>
                            <span className={`px-4 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(token.status)} shadow-lg`}>
                              {token.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-white/60 mb-3">
                            <span>👤 {token.createdBy?.name}</span>
                            <span>•</span>
                            <span>📅 {new Date(token.createdAt).toLocaleDateString()}</span>
                            {token.category && (
                              <>
                                <span>•</span>
                                <span>📁 {token.category}</span>
                              </>
                            )}
                          </div>
                          <p className="text-white/80 leading-relaxed mb-4">{token.description}</p>
                          
                          {/* User Details */}
                          <div className="bg-white/5 rounded-lg p-3 mb-3 border border-white/10">
                            <div className="text-xs text-white/50 mb-1">USER DETAILS</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-white/60">Email:</span>
                                <span className="text-white ml-2">{token.createdBy?.email}</span>
                              </div>
                              <div>
                                <span className="text-white/60">Emp Code:</span>
                                <span className="text-white ml-2">{token.createdBy?.employeeCode || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Status & Actions */}
                    <div className="lg:w-80 space-y-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white/60 text-sm">Priority</span>
                          <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(token.priority)}`}>
                            {token.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white/60 text-sm">SLA Status</span>
                          <span className={`text-sm font-semibold ${sla.color}`}>
                            {sla.status}
                          </span>
                        </div>

                        {token.assignedTo && (
                          <div className="mb-3 pb-3 border-b border-white/10">
                            <span className="text-white/60 text-sm">Assigned to</span>
                            <div className="text-white font-semibold mt-1">{token.assignedTo.name}</div>
                          </div>
                        )}

                        {token.expectedResolutionDate && (
                          <div className="mb-3">
                            <span className="text-white/60 text-sm">Expected by</span>
                            <div className="text-white text-sm mt-1">
                              {new Date(token.expectedResolutionDate).toLocaleDateString()}
                            </div>
                          </div>
                        )}

                        {token.remarks && token.remarks.length > 0 && (
                          <div className="mb-3">
                            <span className="text-white/60 text-sm">Remarks</span>
                            <div className="bg-white/5 rounded-lg p-2 mt-1">
                              <span className="text-white text-xs">{token.remarks.length} notes</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {token.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignToSelf(token._id);
                          }}
                          className="w-full py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
                        >
                          🎯 Assign to Me
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Token Detail Modal */}
        {showModal && selectedToken && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">Token Details & Management</h3>
                <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Token Info */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-xl font-bold text-white mb-4">{selectedToken.title}</h4>
                  <p className="text-white/80 mb-4">{selectedToken.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">Created by:</span>
                      <div className="text-white font-semibold">{selectedToken.createdBy?.name}</div>
                    </div>
                    <div>
                      <span className="text-white/60">Department:</span>
                      <div className="text-white font-semibold">{selectedToken.department?.name || 'Unassigned'}</div>
                    </div>
                    <div>
                      <span className="text-white/60">Category:</span>
                      <div className="text-white font-semibold">{selectedToken.category}</div>
                    </div>
                    <div>
                      <span className="text-white/60">Created:</span>
                      <div className="text-white font-semibold">{new Date(selectedToken.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                {/* Update Form */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Update Token</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 mb-2 text-sm">Status</label>
                      <select
                        value={updateData.status}
                        onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      >
                        <option value="pending" className="text-gray-900">Pending</option>
                        <option value="assigned" className="text-gray-900">Assigned</option>
                        <option value="in-progress" className="text-gray-900">In Progress</option>
                        <option value="resolved" className="text-gray-900">Resolved</option>
                        <option value="closed" className="text-gray-900">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2 text-sm">Priority Override</label>
                      <select
                        value={updateData.priority}
                        onChange={(e) => setUpdateData({ ...updateData, priority: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      >
                        <option value="low" className="text-gray-900">Low</option>
                        <option value="medium" className="text-gray-900">Medium</option>
                        <option value="high" className="text-gray-900">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2 text-sm">Assign To</label>
                      <select
                        value={updateData.assignedTo}
                        onChange={(e) => setUpdateData({ ...updateData, assignedTo: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#455185]"
                      >
                        <option value="" className="text-gray-900">Select Admin</option>
                        {users.map(u => (
                          <option key={u._id} value={u._id} className="text-gray-900">
                            {u.name} - {u.department?.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2 text-sm">Expected Resolution Date</label>
                      <input
                        type="date"
                        value={updateData.expectedResolutionDate}
                        onChange={(e) => setUpdateData({ ...updateData, expectedResolutionDate: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#455185]"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2 text-sm">Actual Resolution Date</label>
                      <input
                        type="date"
                        value={updateData.actualResolutionDate}
                        onChange={(e) => setUpdateData({ ...updateData, actualResolutionDate: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#455185]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleUpdate}
                    className="mt-4 w-full py-3 bg-gradient-to-r from-[#455185] to-[#3a456f] hover:from-[#3a456f] hover:to-[#2f3859] text-white rounded-xl font-semibold transition-all"
                  >
                    💾 Update Token
                  </button>
                </div>

                {/* Remarks Section */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Internal Notes / Remarks</h4>
                  
                  {selectedToken.remarks && selectedToken.remarks.length > 0 && (
                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                      {selectedToken.remarks.map((remark, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-4 border-l-4 border-[#ED1B2F]">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-white/90 font-semibold text-sm">{remark.addedBy?.name || 'Admin'}</span>
                            <span className="text-white/50 text-xs">{new Date(remark.addedAt).toLocaleString()}</span>
                          </div>
                          <p className="text-white/80 text-sm">{remark.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Add internal note..."
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                      onKeyPress={(e) => e.key === 'Enter' && addRemark()}
                    />
                    <button
                      onClick={addRemark}
                      className="px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl font-semibold transition-all"
                    >
                      Add Note
                    </button>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Attachments</h4>
                  
                  {selectedToken.adminAttachments && selectedToken.adminAttachments.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {selectedToken.adminAttachments.map((file, idx) => (
                        <div key={idx} className="px-3 py-2 bg-white/10 rounded-lg text-sm text-white/70 border border-white/20">
                          📎 {file.filename}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Filename"
                      value={newAttachment.filename}
                      onChange={(e) => setNewAttachment({ ...newAttachment, filename: e.target.value })}
                      className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#455185]"
                    />
                    <input
                      type="text"
                      placeholder="File URL"
                      value={newAttachment.url}
                      onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
                      className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#455185]"
                    />
                  </div>
                  <button
                    onClick={addAttachment}
                    className="mt-3 w-full py-3 bg-gradient-to-r from-[#455185] to-[#3a456f] hover:from-[#3a456f] hover:to-[#2f3859] text-white rounded-xl font-semibold transition-all"
                  >
                    📎 Add Attachment
                  </button>
                </div>

                {/* Token History */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Token History</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span className="text-white/60">Created on {new Date(selectedToken.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedToken.assignedTo && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        <span className="text-white/60">Assigned to {selectedToken.assignedTo.name}</span>
                      </div>
                    )}
                    {selectedToken.solvedAt && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                        <span className="text-white/60">
                          Solved on {new Date(selectedToken.solvedAt).toLocaleString()} by {selectedToken.solvedBy?.name}
                        </span>
                      </div>
                    )}
                    {selectedToken.timeToSolve && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                        <span className="text-white/60">Resolution time: {selectedToken.timeToSolve} minutes</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
