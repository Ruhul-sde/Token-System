import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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
          <div className="text-5xl mb-2 animate-pulse">📝</div>
          <h1 className="text-2xl font-bold text-white">My Tickets</h1>
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

const UserDashboard = () => {
  const [tokens, setTokens] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    department: '',
    category: ''
  });
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [error, setError] = useState(null);
  const [createError, setCreateError] = useState(null);
  const { API_URL, user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tokensRes, deptsRes] = await Promise.all([
        axios.get(`${API_URL}/tokens`),
        axios.get(`${API_URL}/departments`)
      ]);
      // Filter tokens to show only those created by the current user
      setTokens(tokensRes.data.filter(t => t.createdBy?._id === user._id));
      setDepartments(deptsRes.data);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please refresh the page.');
    }
  };

  const createToken = async (e) => {
    e.preventDefault();
    setCreateError(null);
    
    try {
      // Validate that department is selected
      if (!formData.department) {
        setCreateError('Please select a department');
        return;
      }
      
      // Validate title and description
      if (!formData.title || formData.title.trim().length < 3) {
        setCreateError('Title must be at least 3 characters');
        return;
      }
      
      if (!formData.description || formData.description.trim().length < 10) {
        setCreateError('Description must be at least 10 characters');
        return;
      }
      
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        department: formData.department,
        category: formData.category || undefined,
      };
      
      await axios.post(`${API_URL}/tokens`, payload);
      setFormData({ title: '', description: '', priority: 'medium', department: '', category: '' });
      setShowCreateForm(false);
      setCreateError(null);
      fetchData();
    } catch (error) {
      console.error('Error creating token:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create token. Please try again.';
      setCreateError(errorMessage);
    }
  };

  const submitFeedback = async () => {
    try {
      await axios.post(`${API_URL}/tokens/${selectedToken._id}/feedback`, feedback);
      setShowModal(false);
      setFeedback({ rating: 5, comment: '' });
      fetchData();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'solved': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const selectedDepartment = departments.find(d => d._id === formData.department);
  const availableCategories = selectedDepartment?.categories || [];
  
  useEffect(() => {
    if (error) {
      console.error('Dashboard error:', error);
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  useEffect(() => {
    if (createError) {
      const timer = setTimeout(() => setCreateError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [createError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
            {error}
          </div>
        )}
        {/* 3D Header */}
        <Header3D />

        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-[#ED1B2F] to-[#455185] bg-clip-text text-transparent">
            My Support Tickets
          </h2>
          <p className="text-white/60 mt-2">Welcome back, {user?.name}</p>
        </div>

        {/* Create Ticket Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            {showCreateForm ? '✕ Cancel' : '+ Create New Ticket'}
          </button>
        </div>

        {/* Create Ticket Form */}
        {showCreateForm && (
          <div className="mb-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Create Support Ticket</h3>
            {createError && (
              <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
                {createError}
              </div>
            )}
            <form onSubmit={createToken} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-white/80 mb-2 font-medium">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-white/80 mb-2 font-medium">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                    required
                  >
                    <option value="low" className="text-gray-900">Low</option>
                    <option value="medium" className="text-gray-900">Medium</option>
                    <option value="high" className="text-gray-900">High</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-white/80 mb-2 font-medium">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value, category: '' })}
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                    required
                  >
                    <option value="" className="text-gray-900">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                {formData.department && (
                  <div>
                    <label className="block text-white/80 mb-2 font-medium">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#455185] focus:border-transparent transition-all disabled:opacity-50"
                      disabled={!formData.department}
                    >
                      <option value="" className="text-gray-900">Select Category</option>
                      {availableCategories.map(cat => (
                        <option key={cat._id || cat.name} value={cat.name} className="text-gray-900">{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/80 mb-2 font-medium">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#455185] focus:border-transparent transition-all min-h-32"
                  placeholder="Provide detailed information about your issue..."
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#455185] to-[#3a456f] hover:from-[#3a456f] hover:to-[#2f3859] text-white rounded-xl font-semibold transition-all transform hover:scale-105"
              >
                🚀 Submit Ticket
              </button>
            </form>
          </div>
        )}

        {/* Tokens Grid */}
        <div className="grid gap-6">
          {tokens.length === 0 ? (
            <div className="text-center py-16 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold text-white/80 mb-2">No Tickets Yet</h3>
              <p className="text-white/60">Create your first support ticket to get started</p>
            </div>
          ) : (
            tokens.map((token) => (
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
                        </div>
                        <div className="mb-2">
                          <span className="bg-gradient-to-r from-[#ED1B2F]/20 to-[#455185]/20 text-white px-3 py-1 rounded-lg text-sm font-mono font-bold border border-white/20">
                            #{token.tokenNumber || token._id.slice(-8)}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm mb-2">{token.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-white/50">
                          <span>📅 {new Date(token.createdAt).toLocaleDateString()}</span>
                          {token.department?.name && (
                            <>
                              <span>•</span>
                              <span>🏢 {token.department.name}</span>
                            </>
                          )}
                          {token.category && (
                            <>
                              <span>•</span>
                              <span>📁 {token.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lg:w-48 space-y-2">
                    {token.assignedTo && (
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-white/60 text-xs mb-1">Assigned to</p>
                        <p className="text-white font-semibold text-sm">{token.assignedTo.name}</p>
                      </div>
                    )}
                    {token.status === 'solved' && !token.feedback && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening modal when clicking this button
                          setSelectedToken(token);
                          setShowModal(true); // Show the modal for feedback
                        }}
                        className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-sm font-semibold transition-all"
                      >
                        ⭐ Rate Solution
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Modal */}
        {showModal && selectedToken && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">Ticket Details</h3>
                <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Token Info */}
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
                      <span className="text-white font-semibold ml-2">{selectedToken.priority}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Department:</span>
                      <span className="text-white font-semibold ml-2">{selectedToken.department?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Category:</span>
                      <span className="text-white font-semibold ml-2">{selectedToken.category || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Created:</span>
                      <span className="text-white font-semibold ml-2">{new Date(selectedToken.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedToken.assignedTo && (
                      <div>
                        <span className="text-white/60">Assigned to:</span>
                        <span className="text-white font-semibold ml-2">{selectedToken.assignedTo.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedToken.remarks && selectedToken.remarks.length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h4 className="text-lg font-bold text-white mb-4">Admin Notes</h4>
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

                {/* Feedback Section - Only show if status is 'solved' and no feedback given yet */}
                {selectedToken.status === 'solved' && !selectedToken.feedback && (
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-500/30">
                    <h4 className="text-lg font-bold text-white mb-4">Rate This Solution</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 mb-2">Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setFeedback({ ...feedback, rating: star })}
                              className={`text-3xl transition-all ${star <= feedback.rating ? 'text-yellow-400' : 'text-white/20'}`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/80 mb-2">Comment (optional)</label>
                        <textarea
                          value={feedback.comment}
                          onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Share your experience..."
                          rows="3"
                        />
                      </div>
                      <button
                        onClick={submitFeedback}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                )}

                {/* Display Feedback if provided */}
                {selectedToken.feedback && (
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/30">
                    <h4 className="text-lg font-bold text-white mb-3">Your Feedback</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400 text-xl">{'⭐'.repeat(selectedToken.feedback.rating)}</span>
                    </div>
                    {selectedToken.feedback.comment && (
                      <p className="text-white/80 text-sm">{selectedToken.feedback.comment}</p>
                    )}
                     <p className="text-white/50 text-xs mt-2">
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

export default UserDashboard;