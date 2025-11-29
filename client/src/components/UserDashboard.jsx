
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Float, MeshDistortMaterial } from '@react-three/drei';

const AnimatedSphere = ({ color, position }) => (
  <Float speed={2} rotationIntensity={1} floatIntensity={2}>
    <Sphere args={[0.8, 64, 64]} position={position}>
      <MeshDistortMaterial color={color} roughness={0.2} metalness={0.8} distort={0.4} speed={2} />
    </Sphere>
  </Float>
);

const UserDashboard = () => {
  const [tokens, setTokens] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    subCategory: '',
    reason: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [feedbackData, setFeedbackData] = useState({ rating: 0, comment: '' });
  const [categories] = useState([
    'Technical Support',
    'Account Issues',
    'Billing',
    'Feature Request',
    'Bug Report',
    'General Inquiry',
    'Other'
  ]);
  const [subCategories] = useState({
    'Technical Support': ['Hardware', 'Software', 'Network', 'Security'],
    'Account Issues': ['Login Problems', 'Password Reset', 'Profile Update', 'Permissions'],
    'Billing': ['Invoice', 'Payment', 'Refund', 'Subscription'],
    'Feature Request': ['New Feature', 'Enhancement', 'Integration'],
    'Bug Report': ['Critical', 'Major', 'Minor', 'Cosmetic'],
    'General Inquiry': ['Information', 'Documentation', 'Training']
  });
  const { API_URL } = useAuth();

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await axios.get(`${API_URL}/tokens`);
      setTokens(response.data);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tokenData = {
        ...formData,
        attachments: selectedFiles.map(file => ({
          filename: file.name,
          url: `uploads/${file.name}`
        }))
      };
      
      if (editingToken) {
        await axios.patch(`${API_URL}/tokens/${editingToken._id}`, tokenData);
        setEditingToken(null);
      } else {
        await axios.post(`${API_URL}/tokens`, tokenData);
      }
      
      setFormData({ 
        title: '', 
        description: '', 
        priority: 'medium',
        category: '',
        subCategory: '',
        reason: ''
      });
      setSelectedFiles([]);
      setShowForm(false);
      fetchTokens();
    } catch (error) {
      console.error('Error saving token:', error);
    }
  };

  const handleEdit = (token) => {
    setEditingToken(token);
    setFormData({
      title: token.title,
      description: token.description,
      priority: token.priority,
      category: token.category,
      subCategory: token.subCategory || '',
      reason: token.reason || ''
    });
    setShowForm(true);
  };

  const handleViewDetails = (token) => {
    setSelectedToken(token);
    setShowDetailModal(true);
  };

  const handleFeedback = (token) => {
    setSelectedToken(token);
    setFeedbackData({ 
      rating: token.feedback?.rating || 0, 
      comment: token.feedback?.comment || '' 
    });
    setShowFeedbackModal(true);
  };

  const submitFeedback = async () => {
    try {
      await axios.post(`${API_URL}/tokens/${selectedToken._id}/feedback`, feedbackData);
      setShowFeedbackModal(false);
      setFeedbackData({ rating: 0, comment: '' });
      fetchTokens();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityBg = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 border-red-500/50';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 border-green-500/50';
      default: return 'bg-gray-500/20 border-gray-500/50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'solved': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'resolved': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'closed': return 'bg-gradient-to-r from-gray-500 to-slate-600';
      case 'assigned': return 'bg-gradient-to-r from-blue-500 to-cyan-600';
      case 'in-progress': return 'bg-gradient-to-r from-purple-500 to-indigo-600';
      case 'pending': return 'bg-gradient-to-r from-yellow-500 to-orange-600';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 3D Header */}
        <div className="mb-8 h-72 rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-[#ED1B2F]/20 to-[#455185]/20 backdrop-blur-xl">
          <Canvas camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <spotLight position={[-10, -10, -10]} angle={0.3} penumbra={1} intensity={1} />
            <AnimatedSphere color="#ED1B2F" position={[-2, 0, 0]} />
            <AnimatedSphere color="#455185" position={[0, 0.5, 0]} />
            <AnimatedSphere color="#ffffff" position={[2, -0.5, 0]} />
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        </div>

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-[#ED1B2F] to-[#455185] bg-clip-text text-transparent">
              My Tokens
            </h2>
            <p className="text-white/60 mt-2">Create, edit, and track your support requests</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingToken(null);
              setFormData({ title: '', description: '', priority: 'medium', category: '', subCategory: '', reason: '' });
            }}
            className="px-8 py-4 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-[#ED1B2F]/50"
          >
            {showForm ? '✕ Cancel' : '+ Create New Token'}
          </button>
        </div>

        {/* Token Creation/Edit Form */}
        {showForm && (
          <div className="mb-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl animate-fadeIn">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-2 h-8 bg-gradient-to-b from-[#ED1B2F] to-[#455185] rounded-full"></span>
              {editingToken ? 'Edit Token' : 'Create New Token'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-white/80 mb-2 font-medium">Title *</label>
                  <input
                    type="text"
                    placeholder="Enter a descriptive title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-white/80 mb-2 font-medium">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subCategory: '' })}
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                    required
                  >
                    <option value="" className="text-gray-900">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="text-gray-900">{cat}</option>
                    ))}
                  </select>
                </div>

                {/* SubCategory */}
                <div>
                  <label className="block text-white/80 mb-2 font-medium">SubCategory</label>
                  <select
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#455185] focus:border-transparent transition-all disabled:opacity-50"
                    disabled={!formData.category || !subCategories[formData.category]}
                  >
                    <option value="" className="text-gray-900">Select SubCategory</option>
                    {formData.category && subCategories[formData.category]?.map(sub => (
                      <option key={sub} value={sub} className="text-gray-900">{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-white/80 mb-2 font-medium">Priority Level *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['low', 'medium', 'high'].map(priority => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority })}
                        className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                          formData.priority === priority
                            ? priority === 'low' ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                            : priority === 'medium' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/50'
                            : 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-white/80 mb-2 font-medium">Attachments</label>
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex items-center justify-center w-full px-5 py-3 bg-white/10 border border-white/20 border-dashed rounded-xl text-white/60 hover:bg-white/20 cursor-pointer transition-all"
                    >
                      <span>📎 {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Choose files'}</span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-white/80 mb-2 font-medium">Description *</label>
                  <textarea
                    placeholder="Provide detailed information about your request"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent min-h-32 transition-all"
                    required
                  />
                </div>

                {/* Reason/Comments */}
                <div className="md:col-span-2">
                  <label className="block text-white/80 mb-2 font-medium">Reason / Comments</label>
                  <textarea
                    placeholder="Additional comments or reasons (optional)"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#455185] focus:border-transparent min-h-24 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-[#455185] to-[#3a456f] hover:from-[#3a456f] hover:to-[#2f3859] text-white rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-[#455185]/50"
              >
                {editingToken ? 'Update Token' : 'Submit Token Request'}
              </button>
            </form>
          </div>
        )}

        {/* Tokens Grid */}
        <div className="grid gap-6">
          {tokens.length === 0 ? (
            <div className="text-center py-16 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-white/80 mb-2">No Tokens Yet</h3>
              <p className="text-white/60">Create your first token to get started</p>
            </div>
          ) : (
            tokens.map((token) => (
              <div 
                key={token._id} 
                className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-white/40 hover:shadow-2xl hover:shadow-[#ED1B2F]/20 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-1 h-12 bg-gradient-to-b from-[#ED1B2F] to-[#455185] rounded-full"></span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-white group-hover:text-[#ED1B2F] transition-colors">
                            {token.title}
                          </h3>
                          <span className="text-xs text-white/40 font-mono">#{token._id.slice(-8)}</span>
                        </div>
                        {token.category && (
                          <p className="text-white/60 text-sm">
                            📁 {token.category} {token.subCategory && `• ${token.subCategory}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold text-white ${getStatusColor(token.status)} shadow-lg`}>
                      {token.status.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getPriorityBg(token.priority)} ${getPriorityColor(token.priority)}`}>
                      {token.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                </div>
                
                <p className="text-white/80 mb-4 leading-relaxed line-clamp-2">{token.description}</p>
                
                {token.assignedTo && (
                  <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border-l-4 border-blue-500">
                    <p className="text-blue-400 text-sm font-semibold">
                      👤 Assigned to: {token.assignedTo.name}
                    </p>
                  </div>
                )}
                
                <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-white/10">
                  <span className="text-white/60 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#ED1B2F] rounded-full animate-pulse"></span>
                    Created {new Date(token.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric'
                    })}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(token)}
                      className="px-4 py-2 bg-[#455185] hover:bg-[#3a456f] text-white rounded-lg text-sm font-semibold transition-all"
                    >
                      📄 View Details
                    </button>
                    {token.status === 'pending' && (
                      <button
                        onClick={() => handleEdit(token)}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold transition-all"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    {(token.status === 'resolved' || token.status === 'closed') && (
                      <button
                        onClick={() => handleFeedback(token)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all"
                      >
                        ⭐ Feedback
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedToken && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">Token Details</h3>
                <button onClick={() => setShowDetailModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Token ID */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-white/60 text-sm mb-1">Token ID</p>
                  <p className="text-white font-mono text-lg">#{selectedToken._id}</p>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Title</p>
                    <p className="text-white font-semibold">{selectedToken.title}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(selectedToken.status)}`}>
                      {selectedToken.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Priority</p>
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${getPriorityBg(selectedToken.priority)} ${getPriorityColor(selectedToken.priority)}`}>
                      {selectedToken.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Category</p>
                    <p className="text-white">{selectedToken.category}</p>
                    {selectedToken.subCategory && (
                      <p className="text-white/60 text-sm mt-1">• {selectedToken.subCategory}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-white/60 text-sm mb-2">Description</p>
                  <p className="text-white leading-relaxed">{selectedToken.description}</p>
                </div>

                {/* Reason */}
                {selectedToken.reason && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-2">Reason / Comments</p>
                    <p className="text-white leading-relaxed">{selectedToken.reason}</p>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Created Date</p>
                    <p className="text-white">{new Date(selectedToken.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedToken.actualResolutionDate && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-white/60 text-sm mb-1">Resolution Date</p>
                      <p className="text-white">{new Date(selectedToken.actualResolutionDate).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Assigned Admin */}
                {selectedToken.assignedTo && (
                  <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                    <p className="text-blue-400 text-sm mb-2">Assigned Admin</p>
                    <p className="text-white font-semibold">👤 {selectedToken.assignedTo.name}</p>
                    <p className="text-white/60 text-sm">{selectedToken.assignedTo.email}</p>
                  </div>
                )}

                {/* Remarks from Admin */}
                {selectedToken.remarks && selectedToken.remarks.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-3">Admin Remarks</p>
                    <div className="space-y-3">
                      {selectedToken.remarks.map((remark, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3 border-l-4 border-[#455185]">
                          <p className="text-white text-sm mb-1">{remark.text}</p>
                          <p className="text-white/40 text-xs">
                            {remark.addedBy?.name} • {new Date(remark.addedAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Details */}
                {(selectedToken.status === 'resolved' || selectedToken.status === 'closed') && (
                  <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                    <p className="text-green-400 text-sm mb-3">Resolution Details</p>
                    <div className="space-y-2">
                      {selectedToken.solvedBy && (
                        <p className="text-white">✅ Resolved by: <span className="font-semibold">{selectedToken.solvedBy.name}</span></p>
                      )}
                      {selectedToken.solvedAt && (
                        <p className="text-white">📅 Resolved on: {new Date(selectedToken.solvedAt).toLocaleString()}</p>
                      )}
                      {selectedToken.timeToSolve && (
                        <p className="text-white">⏱️ Time to resolve: {selectedToken.timeToSolve} minutes</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedToken.attachments && selectedToken.attachments.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-3">Attachments</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedToken.attachments.map((file, idx) => (
                        <span key={idx} className="px-3 py-2 bg-white/10 rounded-lg text-xs text-white border border-white/20">
                          📎 {file.filename}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback Display */}
                {selectedToken.feedback && (
                  <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                    <p className="text-purple-400 text-sm mb-3">Your Feedback</p>
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-2xl ${star <= selectedToken.feedback.rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                          ⭐
                        </span>
                      ))}
                    </div>
                    {selectedToken.feedback.comment && (
                      <p className="text-white mt-2">{selectedToken.feedback.comment}</p>
                    )}
                    <p className="text-white/40 text-xs mt-2">
                      Submitted on {new Date(selectedToken.feedback.submittedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && selectedToken && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-md w-full border border-white/20 shadow-2xl">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex justify-between items-center rounded-t-3xl">
                <h3 className="text-2xl font-bold text-white">Provide Feedback</h3>
                <button onClick={() => setShowFeedbackModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-white mb-3 font-medium">Rate your experience</p>
                  <div className="flex gap-3 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                        className={`text-4xl transition-all transform hover:scale-110 ${
                          star <= feedbackData.rating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-200'
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 mb-2 font-medium">Comments (Optional)</label>
                  <textarea
                    value={feedbackData.comment}
                    onChange={(e) => setFeedbackData({ ...feedbackData, comment: e.target.value })}
                    placeholder="Share your experience..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-32"
                  />
                </div>

                <button
                  onClick={submitFeedback}
                  disabled={feedbackData.rating === 0}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
