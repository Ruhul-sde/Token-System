import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Torus, Float } from '@react-three/drei';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AnimatedTorus = ({ color, position }) => (
  <Float speed={2} rotationIntensity={2} floatIntensity={1}>
    <Torus args={[0.7, 0.2, 16, 100]} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </Torus>
  </Float>
);

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [adminProfiles, setAdminProfiles] = useState([]);

  // Modal states
  const [showAdminDetailModal, setShowAdminDetailModal] = useState(false);
  const [showTokenDetailModal, setShowTokenDetailModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  // Form states
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showAdminProfileForm, setShowAdminProfileForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [newDept, setNewDept] = useState({ name: '', description: '', categories: [] });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', subCategories: [] });
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newAdminProfile, setNewAdminProfile] = useState({ 
    name: '',
    email: '',
    password: '',
    expertise: [], 
    department: '',
    categories: [], 
    phone: '', 
    employeeId: ''
  });
  const [newExpertise, setNewExpertise] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
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

  const createDepartment = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await axios.patch(`${API_URL}/departments/${editingDept._id}`, newDept);
      } else {
        await axios.post(`${API_URL}/departments`, newDept);
      }
      setNewDept({ name: '', description: '', categories: [] });
      setShowDeptForm(false);
      setEditingDept(null);
      fetchData();
    } catch (error) {
      alert('Failed to save department');
    }
  };

  const editDepartment = (dept) => {
    setEditingDept(dept);
    setNewDept({
      name: dept.name,
      description: dept.description || '',
      categories: dept.categories || []
    });
    setShowDeptForm(true);
  };

  const addCategoryToDept = () => {
    if (newCategory.name.trim()) {
      setNewDept({
        ...newDept,
        categories: [...newDept.categories, { ...newCategory, _id: Date.now().toString() }]
      });
      setNewCategory({ name: '', description: '', subCategories: [] });
      setShowCategoryForm(false);
    }
  };

  const removeCategoryFromDept = (categoryId) => {
    setNewDept({
      ...newDept,
      categories: newDept.categories.filter(c => c._id !== categoryId)
    });
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

  const removeSubCategory = (index) => {
    setNewCategory({
      ...newCategory,
      subCategories: newCategory.subCategories.filter((_, i) => i !== index)
    });
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

  const createAdminProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      
      await axios.post(`${API_URL}/admin-profiles`, newAdminProfile, config);
      setNewAdminProfile({ 
        name: '',
        email: '',
        password: '',
        expertise: [], 
        department: '',
        categories: [], 
        phone: '', 
        employeeId: ''
      });
      setShowAdminProfileForm(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create admin profile');
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

  const removeExpertise = (index) => {
    setNewAdminProfile({
      ...newAdminProfile,
      expertise: newAdminProfile.expertise.filter((_, i) => i !== index)
    });
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

  const openAdminDetail = (admin) => {
    const profile = adminProfiles.find(p => p.user?._id === admin._id);
    setSelectedAdmin({ ...admin, profile });
    setShowAdminDetailModal(true);
  };

  const openTokenDetail = (token) => {
    setSelectedToken(token);
    setShowTokenDetailModal(true);
  };

  const COLORS = ['#ED1B2F', '#455185', '#00C49F', '#FFBB28', '#8884D8', '#FF8042'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-2xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'Solved', value: stats.overview.solvedTokens },
    { name: 'Assigned', value: stats.overview.assignedTokens },
    { name: 'Pending', value: stats.overview.pendingTokens }
  ] : [];

  const departmentStats = departments.map(dept => {
    const deptTokens = tokens.filter(t => t.department?._id === dept._id);
    const deptAdmins = users.filter(u => u.role === 'admin' && u.department?._id === dept._id);
    return {
      name: dept.name,
      totalTokens: deptTokens.length,
      solved: deptTokens.filter(t => t.status === 'solved').length,
      pending: deptTokens.filter(t => t.status === 'pending').length,
      admins: deptAdmins.length
    };
  });

  // Get available categories from selected department
  const getAvailableCategoriesForDept = (deptId) => {
    const dept = departments.find(d => d._id === deptId);
    return dept?.categories || [];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 h-64 rounded-2xl overflow-hidden shadow-2xl">
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <AnimatedTorus color="#ED1B2F" position={[-2, 0, 0]} />
          <AnimatedTorus color="#455185" position={[2, 0, 0]} />
          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white">Super Admin Dashboard</h2>
        <p className="text-white/60 mt-2">Welcome, {user?.name || 'Super Admin'}</p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <h3 className="text-white/60 text-sm mb-2">Total Tokens</h3>
              <p className="text-3xl font-bold text-white">{stats.overview.totalTokens}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <h3 className="text-white/60 text-sm mb-2">Solved</h3>
              <p className="text-3xl font-bold text-green-400">{stats.overview.solvedTokens}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <h3 className="text-white/60 text-sm mb-2">Pending</h3>
              <p className="text-3xl font-bold text-yellow-400">{stats.overview.pendingTokens}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <h3 className="text-white/60 text-sm mb-2">Assigned</h3>
              <p className="text-3xl font-bold text-blue-400">{stats.overview.assignedTokens}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Token Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} 
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100} 
                    fill="#8884d8" 
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Department Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="name" stroke="#ffffff" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#ffffff" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="solved" fill="#00C49F" name="Solved" />
                  <Bar dataKey="pending" fill="#FFBB28" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Departments Management with Categories */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Departments & Categories ({departments.length})</h3>
          <button
            onClick={() => {
              setShowDeptForm(!showDeptForm);
              setEditingDept(null);
              setNewDept({ name: '', description: '', categories: [] });
            }}
            className="px-4 py-2 bg-[#ED1B2F] hover:bg-[#d41829] text-white rounded-lg transition-colors"
          >
            {showDeptForm ? 'Cancel' : '+ Add Department'}
          </button>
        </div>

        {showDeptForm && (
          <form onSubmit={createDepartment} className="mb-4 space-y-3 bg-white/5 p-4 rounded-lg">
            <input
              type="text"
              placeholder="Department Name"
              value={newDept.name}
              onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={newDept.description}
              onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
            />

            {/* Categories for Department */}
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <label className="text-white/80 text-sm">Categories</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm(!showCategoryForm)}
                  className="px-3 py-1 bg-[#455185] hover:bg-[#3a456f] text-white rounded text-sm"
                >
                  {showCategoryForm ? 'Cancel' : '+ Add Category'}
                </button>
              </div>

              {showCategoryForm && (
                <div className="mb-3 space-y-2 bg-white/5 p-3 rounded">
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Category Description"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 text-sm"
                  />
                  <div>
                    <label className="text-white/70 text-xs mb-1 block">Subcategories</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Add subcategory"
                        value={newSubCategory}
                        onChange={(e) => setNewSubCategory(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubCategory())}
                        className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded text-white placeholder-white/60 text-sm"
                      />
                      <button
                        type="button"
                        onClick={addSubCategory}
                        className="px-3 py-1 bg-[#455185] hover:bg-[#3a456f] text-white rounded text-sm"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {newCategory.subCategories.map((sub, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white/20 text-white rounded text-xs flex items-center gap-1">
                          {sub}
                          <button
                            type="button"
                            onClick={() => removeSubCategory(idx)}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addCategoryToDept}
                    className="w-full px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm"
                  >
                    Add Category to Department
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {newDept.categories.map((cat, idx) => (
                  <div key={cat._id || idx} className="bg-white/10 rounded p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="text-white font-semibold">{cat.name}</span>
                        {cat.description && <p className="text-white/60 text-xs">{cat.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCategoryFromDept(cat._id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        🗑️
                      </button>
                    </div>
                    {cat.subCategories && cat.subCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cat.subCategories.map((sub, sidx) => (
                          <span key={sidx} className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                            {sub}
                          </span>
                        ))}
                        {cat.subCategories.length > 3 && (
                          <span className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                            +{cat.subCategories.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="px-4 py-2 bg-[#455185] hover:bg-[#3a456f] text-white rounded-lg transition-colors">
              {editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </form>
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => {
            const deptStats = departmentStats.find(d => d.name === dept.name);
            return (
              <div key={dept._id} className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-white font-semibold text-lg">{dept.name}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editDepartment(dept)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteDepartment(dept._id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="text-white/60 text-sm mb-3">{dept.description}</p>

                {dept.categories && dept.categories.length > 0 && (
                  <div className="mb-3">
                    <p className="text-white/50 text-xs mb-2">Categories ({dept.categories.length}):</p>
                    <div className="space-y-1">
                      {dept.categories.map((cat, idx) => (
                        <div key={cat._id || idx} className="bg-white/5 rounded p-2">
                          <div className="text-white text-sm font-medium">{cat.name}</div>
                          {cat.subCategories && cat.subCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cat.subCategories.slice(0, 3).map((sub, sidx) => (
                                <span key={sidx} className="px-2 py-0.5 bg-white/10 text-white/60 rounded text-xs">
                                  {sub}
                                </span>
                              ))}
                              {cat.subCategories.length > 3 && (
                                <span className="px-2 py-0.5 bg-white/10 text-white/60 rounded text-xs">
                                  +{cat.subCategories.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deptStats && (
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-400">✓ {deptStats.solved} solved</span>
                    <span className="text-yellow-400">⏳ {deptStats.pending} pending</span>
                    <span className="text-blue-400">👥 {deptStats.admins} admins</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Directory - Filtered by Department */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Admin Directory ({adminProfiles.length})</h3>
          <div className="flex gap-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#455185]"
            >
              <option value="all" className="text-gray-900">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id} className="text-gray-900">
                  {dept.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAdminProfileForm(!showAdminProfileForm)}
              className="px-4 py-2 bg-[#ED1B2F] hover:bg-[#d41829] text-white rounded-lg transition-colors"
            >
              {showAdminProfileForm ? 'Cancel' : '+ Add Admin Profile'}
            </button>
          </div>
        </div>

        {showAdminProfileForm && (
          <form onSubmit={createAdminProfile} className="mb-4 space-y-4 bg-white/5 p-6 rounded-xl border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm mb-2">Name *</label>
                <input
                  type="text"
                  placeholder="Admin Name"
                  value={newAdminProfile.name}
                  onChange={(e) => setNewAdminProfile({ ...newAdminProfile, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Email *</label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminProfile.email}
                  onChange={(e) => setNewAdminProfile({ ...newAdminProfile, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Password *</label>
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={newAdminProfile.password}
                  onChange={(e) => setNewAdminProfile({ ...newAdminProfile, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  required
                  minLength="6"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Employee ID</label>
                <input
                  type="text"
                  placeholder="EMP-001"
                  value={newAdminProfile.employeeId}
                  onChange={(e) => setNewAdminProfile({ ...newAdminProfile, employeeId: e.target.value })}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Department *</label>
                <select
                  value={newAdminProfile.department}
                  onChange={(e) => setNewAdminProfile({ ...newAdminProfile, department: e.target.value, categories: [] })}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  required
                >
                  <option value="" className="text-gray-900">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id} className="text-gray-900">
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={newAdminProfile.phone}
                  onChange={(e) => setNewAdminProfile({ ...newAdminProfile, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  required
                />
              </div>
            </div>

            {newAdminProfile.department && (
              <div>
                <label className="text-white/80 text-sm mb-2 block">Assigned Categories</label>
                <div className="space-y-2 max-h-40 overflow-y-auto bg-white/5 rounded-lg p-2">
                  {getAvailableCategoriesForDept(newAdminProfile.department).map((cat) => (
                    <label key={cat._id} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={newAdminProfile.categories.includes(cat.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewAdminProfile({
                              ...newAdminProfile,
                              categories: [...newAdminProfile.categories, cat.name]
                            });
                          } else {
                            setNewAdminProfile({
                              ...newAdminProfile,
                              categories: newAdminProfile.categories.filter(c => c !== cat.name)
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-white text-sm">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="text-white/80 text-sm mb-2 block">Areas of Expertise</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add expertise area"
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                  className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#455185]"
                />
                <button
                  type="button"
                  onClick={addExpertise}
                  className="px-4 py-2 bg-[#455185] hover:bg-[#3a456f] text-white rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newAdminProfile.expertise.map((exp, idx) => (
                  <span key={idx} className="px-3 py-1 bg-white/20 text-white rounded-full text-sm flex items-center gap-2">
                    {exp}
                    <button
                      type="button"
                      onClick={() => removeExpertise(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            <button type="submit" className="px-4 py-2 bg-[#455185] hover:bg-[#3a456f] text-white rounded-lg transition-colors">
              Create Admin Profile
            </button>
          </form>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminProfiles
            .filter(profile => {
              if (departmentFilter === 'all') return true;
              return profile.department?._id === departmentFilter;
            })
            .map((profile) => (
            <div 
              key={profile._id} 
              className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all border border-white/10 cursor-pointer"
              onClick={() => openAdminDetail(profile.user)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  {profile.profileImage && (
                    <img src={profile.profileImage} alt={profile.user?.name} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div>
                    <h4 className="text-white font-semibold hover:text-[#ED1B2F] transition-colors">{profile.user?.name}</h4>
                    <p className="text-white/60 text-xs">{profile.user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAdminProfile(profile._id);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  🗑️
                </button>
              </div>
              <p className="text-white/70 text-sm mb-2 line-clamp-2">{profile.bio}</p>
              <div className="text-xs text-white/50 mb-2">
                📞 {profile.phone || 'N/A'}
              </div>
              <div className="text-xs text-white/50 mb-2">
                🏢 {profile.department?.name || profile.user?.department?.name || 'No Department'}
              </div>
              {profile.categories && profile.categories.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-white/50 mb-1">Categories:</div>
                  <div className="flex flex-wrap gap-1">
                    {profile.categories.slice(0, 2).map((cat, idx) => (
                      <span key={idx} className="px-2 py-1 bg-[#ED1B2F]/20 text-[#ED1B2F] rounded text-xs">
                        {cat}
                      </span>
                    ))}
                    {profile.categories.length > 2 && (
                      <span className="px-2 py-1 bg-[#ED1B2F]/20 text-[#ED1B2F] rounded text-xs">
                        +{profile.categories.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {profile.expertise && profile.expertise.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {profile.expertise.slice(0, 2).map((exp, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {exp}
                    </span>
                  ))}
                  {profile.expertise.length > 2 && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      +{profile.expertise.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Token List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
        <h3 className="text-xl font-bold text-white mb-4">All Tokens ({tokens.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4">Token #</th>
                <th className="text-left py-3 px-4">Title</th>
                <th className="text-left py-3 px-4">Creator</th>
                <th className="text-left py-3 px-4">Department</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Priority</th>
                <th className="text-left py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {tokens.slice(0, 10).map((token) => (
                <tr 
                  key={token._id} 
                  className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => openTokenDetail(token)}
                >
                  <td className="py-3 px-4">
                    <span className="bg-gradient-to-r from-[#ED1B2F]/20 to-[#455185]/20 text-white px-2 py-1 rounded text-xs font-mono font-bold border border-white/20">
                      {token.tokenNumber || token._id.slice(-8)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold">{token.title}</td>
                  <td className="py-3 px-4">
                    <div className="text-white/90">{token.createdBy?.name}</div>
                    <div className="text-white/50 text-xs">{token.createdBy?.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-white/70 text-sm">
                      {token.department?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      token.status === 'solved' ? 'bg-green-500/20 text-green-400' :
                      token.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {token.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      token.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      token.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {token.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/60 text-sm">
                    {new Date(token.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Detail Modal */}
      {showTokenDetailModal && selectedToken && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowTokenDetailModal(false)}>
          <div className="bg-gradient-to-br from-[#455185] to-[#2a3357] rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedToken.title}</h3>
                <span className="bg-gradient-to-r from-[#ED1B2F]/20 to-[#455185]/20 text-white px-3 py-1 rounded text-sm font-mono font-bold border border-white/20">
                  #{selectedToken.tokenNumber || selectedToken._id.slice(-8)}
                </span>
              </div>
              <button onClick={() => setShowTokenDetailModal(false)} className="text-white/60 hover:text-white text-2xl">×</button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-2">Description</p>
                <p className="text-white">{selectedToken.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    selectedToken.status === 'solved' ? 'bg-green-500/20 text-green-400' :
                    selectedToken.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {selectedToken.status}
                  </span>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-1">Priority</p>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    selectedToken.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    selectedToken.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {selectedToken.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Detail Modal */}
      {showAdminDetailModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAdminDetailModal(false)}>
          <div className="bg-gradient-to-br from-[#455185] to-[#2a3357] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-white">Admin Details</h3>
              <button onClick={() => setShowAdminDetailModal(false)} className="text-white/60 hover:text-white text-2xl">×</button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {selectedAdmin.profile?.profileImage && (
                  <img src={selectedAdmin.profile.profileImage} alt={selectedAdmin.name} className="w-20 h-20 rounded-full object-cover border-4 border-white/20" />
                )}
                <div>
                  <h4 className="text-2xl font-bold text-white">{selectedAdmin.name}</h4>
                  <p className="text-white/70">{selectedAdmin.email}</p>
                </div>
              </div>

              {selectedAdmin.profile?.bio && (
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-2">Bio</p>
                  <p className="text-white">{selectedAdmin.profile.bio}</p>
                </div>
              )}

              {selectedAdmin.profile?.categories && selectedAdmin.profile.categories.length > 0 && (
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/60 text-sm mb-2">Assigned Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAdmin.profile.categories.map((cat, idx) => (
                      <span key={idx} className="px-3 py-1 bg-[#ED1B2F]/20 text-[#ED1B2F] rounded-full text-sm">
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
  );
};

export default SuperAdminDashboard;