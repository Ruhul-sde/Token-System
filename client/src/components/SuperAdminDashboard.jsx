
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Torus, Float } from '@react-three/drei';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', description: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignmentData, setAssignmentData] = useState({ department: '', role: '' });
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
      const [statsRes, usersRes, deptsRes, tokensRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`),
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/departments`),
        axios.get(`${API_URL}/tokens`)
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setTokens(tokensRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/departments`, newDept);
      setNewDept({ name: '', description: '' });
      setShowDeptForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating department:', error);
      alert('Failed to create department');
    }
  };

  const updateUser = async (userId) => {
    try {
      await axios.patch(`${API_URL}/users/${userId}`, assignmentData);
      setSelectedUser(null);
      setAssignmentData({ department: '', role: '' });
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const assignToken = async (tokenId, adminId, deptId) => {
    try {
      await axios.patch(`${API_URL}/tokens/${tokenId}/assign`, {
        assignedTo: adminId,
        department: deptId
      });
      fetchData();
    } catch (error) {
      console.error('Error assigning token:', error);
      alert('Failed to assign token');
    }
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
              <div className="mt-2 text-xs text-white/50">All time</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <h3 className="text-white/60 text-sm mb-2">Solved</h3>
              <p className="text-3xl font-bold text-green-400">{stats.overview.solvedTokens}</p>
              <div className="mt-2 text-xs text-white/50">
                {stats.overview.totalTokens > 0 ? 
                  `${Math.round((stats.overview.solvedTokens / stats.overview.totalTokens) * 100)}% completion` 
                  : '0% completion'}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <h3 className="text-white/60 text-sm mb-2">Pending</h3>
              <p className="text-3xl font-bold text-yellow-400">{stats.overview.pendingTokens}</p>
              <div className="mt-2 text-xs text-white/50">Awaiting assignment</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
              <h3 className="text-white/60 text-sm mb-2">Assigned</h3>
              <p className="text-3xl font-bold text-blue-400">{stats.overview.assignedTokens}</p>
              <div className="mt-2 text-xs text-white/50">In progress</div>
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

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Admin Performance Statistics</h3>
            {stats.solverStats && stats.solverStats.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300} className="mb-6">
                  <BarChart data={stats.solverStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="solverName" stroke="#ffffff" />
                    <YAxis stroke="#ffffff" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="tokensSolved" fill="#ED1B2F" name="Tokens Solved" />
                    <Bar dataKey="avgTimeToSolve" fill="#455185" name="Avg Time (min)" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4">Admin Name</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Tokens Solved</th>
                        <th className="text-left py-3 px-4">Avg Time (min)</th>
                        <th className="text-left py-3 px-4">Total Time (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.solverStats.map((solver) => (
                        <tr key={solver._id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-semibold">{solver.solverName}</td>
                          <td className="py-3 px-4 text-white/70">{solver.solverEmail}</td>
                          <td className="py-3 px-4">
                            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                              {solver.tokensSolved}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-blue-400">{Math.round(solver.avgTimeToSolve)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-purple-400">{solver.totalTimeSpent}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-white/60 text-center py-8">No admin performance data available yet.</p>
            )}
          </div>
        </>
      )}

      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Departments ({departments.length})</h3>
          <button
            onClick={() => setShowDeptForm(!showDeptForm)}
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
            <button type="submit" className="px-4 py-2 bg-[#455185] hover:bg-[#3a456f] text-white rounded-lg transition-colors">
              Create Department
            </button>
          </form>
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => {
            const deptStats = departmentStats.find(d => d.name === dept.name);
            return (
              <div key={dept._id} className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all border border-white/10">
                <h4 className="text-white font-semibold text-lg mb-1">{dept.name}</h4>
                <p className="text-white/60 text-sm mb-3">{dept.description}</p>
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

      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
        <h3 className="text-xl font-bold text-white mb-4">User Management ({users.length} users)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Employee Code</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Department</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-semibold">{user.name}</td>
                  <td className="py-3 px-4 text-white/70">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="bg-white/10 px-2 py-1 rounded text-xs">{user.employeeCode}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      user.role === 'superadmin' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">{user.department?.name || 'Not assigned'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setSelectedUser(user._id);
                        setAssignmentData({
                          department: user.department?._id || '',
                          role: user.role
                        });
                      }}
                      className="px-3 py-1 bg-[#455185] hover:bg-[#3a456f] text-white rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedUser && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/20">
            <h4 className="text-white font-semibold mb-3">Update User: {users.find(u => u._id === selectedUser)?.name}</h4>
            <div className="flex gap-3 flex-wrap">
              <select
                value={assignmentData.department}
                onChange={(e) => setAssignmentData({ ...assignmentData, department: e.target.value })}
                className="flex-1 min-w-[200px] px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
              >
                <option value="" className="text-gray-900">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
                ))}
              </select>
              <select
                value={assignmentData.role}
                onChange={(e) => setAssignmentData({ ...assignmentData, role: e.target.value })}
                className="flex-1 min-w-[200px] px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
              >
                <option value="" className="text-gray-900">Select Role</option>
                <option value="user" className="text-gray-900">User</option>
                <option value="admin" className="text-gray-900">Admin</option>
                <option value="superadmin" className="text-gray-900">Super Admin</option>
              </select>
              <button
                onClick={() => updateUser(selectedUser)}
                className="px-6 py-2 bg-[#ED1B2F] hover:bg-[#d41829] text-white rounded-lg transition-colors"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setAssignmentData({ department: '', role: '' });
                }}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Token Assignment ({tokens.filter(t => t.status === 'pending').length} pending)</h3>
        {tokens.filter(t => t.status === 'pending').length > 0 ? (
          <div className="space-y-4">
            {tokens.filter(t => t.status === 'pending').map((token) => (
              <div key={token._id} className="bg-white/5 p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1">{token.title}</h4>
                    <p className="text-white/60 text-sm mb-2">{token.description}</p>
                    <div className="flex gap-2 flex-wrap text-xs">
                      <span className={`px-2 py-1 rounded ${
                        token.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        token.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {token.priority} priority
                      </span>
                      {token.category && (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          {token.category}
                        </span>
                      )}
                      <span className="text-white/50">
                        by {token.createdBy?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <select
                    onChange={(e) => {
                      const adminId = e.target.value;
                      const admin = users.find(u => u._id === adminId);
                      if (admin && admin.department) {
                        assignToken(token._id, adminId, admin.department._id);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  >
                    <option value="" className="text-gray-900">Assign to Admin</option>
                    {users.filter(u => u.role === 'admin' && u.department).map((admin) => (
                      <option key={admin._id} value={admin._id} className="text-gray-900">
                        {admin.name} - {admin.department.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/60 text-center py-8">No pending tokens to assign.</p>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
