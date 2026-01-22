// components/super-admin/tabs/UsersTab.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Modal from '../../ui/Modal';
import axios from 'axios';
import { getStatusColor } from '../../../constants/theme';
import {
  FaUsers,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaIdCard,
  FaKey,
  FaCalendarAlt,
  FaSync,
  FaExclamationCircle
} from 'react-icons/fa';

const UsersTab = () => {
  const { API_URL } = useAuth();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    frozenUsers: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeCode: '',
    companyId: '',
    phoneNumber: '',
    role: 'user' // Explicitly set role to 'user'
  });

  // Error state
  const [error, setError] = useState(null);

  // Fetch users data (only regular users, no superadmins)
  const fetchUsersData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Fetch users with filters - only regular users
      const params = {
        search: searchTerm || undefined,
        companyId: filterCompany !== 'all' ? filterCompany : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        role: 'user' // Only fetch regular users, not superadmins
      };

      const response = await axios.get(`${API_URL}/users`, {
        ...config,
        params
      });

      if (response.data.success) {
        const { users: usersData = [], stats: statsData = {}, companies: companiesData = [] } = response.data;
        
        // Double filter: by API param and client-side
        const regularUsers = usersData.filter(user => user.role === 'user');
        
        console.log('Fetched regular users:', regularUsers.length, regularUsers.map(u => ({ 
          name: u.name, 
          role: u.role,
          email: u.email 
        })));
        
        setUsers(regularUsers);
        setStats(statsData);
        setCompanies(companiesData);
      } else {
        throw new Error(response.data.message || 'Failed to fetch users');
      }

    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchUsersData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsersData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterCompany, filterStatus]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      employeeCode: '',
      companyId: '',
      phoneNumber: '',
      role: 'user' // Explicitly set for new users
    });
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      employeeCode: user.employeeCode || '',
      companyId: user.company?._id || '',
      phoneNumber: user.phoneNumber || '',
      role: 'user' // Ensure role remains 'user'
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Create user (always as regular user)
  const handleCreateUser = async () => {
    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.password) {
        alert('Name, email, and password are required');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }

      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      };

      // Log data for debugging
      console.log('Creating user with data:', {
        ...formData,
        role: 'user'
      });

      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'user', // Explicitly set role to 'user'
        employeeCode: formData.employeeCode || undefined,
        companyId: formData.companyId || undefined,
        phoneNumber: formData.phoneNumber || undefined
      };

      const response = await axios.post(`${API_URL}/users`, userData, config);
      
      console.log('Create user response:', response.data);
      
      if (response.data.success) {
        // Verify the created user has correct role
        if (response.data.user && response.data.user.role !== 'user') {
          console.warn('Warning: Created user has role', response.data.user.role, 'but expected: user');
        }
        
        setShowCreateModal(false);
        await fetchUsersData();
        alert('User created successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to create user');
      }

    } catch (error) {
      console.error('Error creating user:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to create user: ${error.response?.data?.message || error.message}`);
    }
  };

  // Update user (can't change role to superadmin)
  const handleUpdateUser = async () => {
    try {
      if (!selectedUser) return;

      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      };

      const userData = {
        name: formData.name,
        employeeCode: formData.employeeCode || null,
        companyId: formData.companyId || null,
        phoneNumber: formData.phoneNumber || null,
        role: 'user' // Ensure role remains 'user' during updates
      };

      // Only include password if provided
      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match');
          return;
        }
        if (formData.password.length < 6) {
          alert('Password must be at least 6 characters');
          return;
        }
        userData.password = formData.password;
      }

      console.log('Updating user with data:', userData);

      const response = await axios.put(`${API_URL}/users/${selectedUser._id}`, userData, config);
      
      console.log('Update user response:', response.data);
      
      if (response.data.success) {
        setShowEditModal(false);
        await fetchUsersData();
        alert('User updated successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to update user');
      }

    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.response?.data?.message || error.message}`);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    try {
      if (!selectedUser) return;

      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      const response = await axios.delete(`${API_URL}/users/${selectedUser._id}`, config);
      
      if (response.data.success) {
        setShowDeleteModal(false);
        await fetchUsersData();
        alert('User deleted successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to delete user');
      }

    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.response?.data?.message || error.message}`);
    }
  };

  // Update user status
  const updateUserStatus = async (userId, status, reason = '') => {
    try {
      if (!reason || reason.trim() === '') {
        reason = prompt(`Reason for ${status} status:`);
        if (reason === null) return;
      }

      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      const response = await axios.patch(
        `${API_URL}/users/${userId}/status`, 
        { status, statusReason: reason }, 
        config
      );
      
      if (response.data.success) {
        await fetchUsersData();
        alert(`User status updated to ${status}`);
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }

    } catch (error) {
      console.error('Error updating user status:', error);
      alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
  };

  // Reset user password
  const resetUserPassword = async (userId) => {
    const newPassword = prompt('Enter new password for this user:');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      const response = await axios.post(
        `${API_URL}/users/${userId}/reset-password`, 
        { newPassword }, 
        config
      );
      
      if (response.data.success) {
        alert('Password reset successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to reset password');
      }

    } catch (error) {
      console.error('Error resetting password:', error);
      alert(`Failed to reset password: ${error.response?.data?.message || error.message}`);
    }
  };

  // Filter users based on criteria
  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCompany = filterCompany === 'all' || 
      (user.company && user.company._id === filterCompany);
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesCompany && matchesStatus;
  }) : [];

  if (loading && users.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ED1B2F] mb-6"></div>
          <p className="text-white text-lg mb-2">Loading users data...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96">
          <FaExclamationCircle className="text-red-400 text-6xl mb-6" />
          <p className="text-white text-lg mb-2">Error loading users</p>
          <p className="text-white/60 mb-4">{error}</p>
          <Button variant="primary" onClick={fetchUsersData}>
            <FaSync className="mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaUsers className="text-[#ED1B2F]" />
            User Management
          </h3>
          <p className="text-sm text-white/60 mt-1">
            {filteredUsers.length} of {stats.totalUsers || 0} users • {stats.activeUsers || 0} active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            onClick={openCreateModal}
            className="flex items-center gap-2"
          >
            <FaPlus />
            Add User
          </Button>
          <Button 
            variant="secondary" 
            onClick={fetchUsersData}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users by name, email, or employee code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
          >
            <option value="all">All Companies</option>
            {Array.isArray(companies) && companies.map(company => (
              <option key={company.id || company._id} value={company.id || company._id}>
                {company.name}
              </option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="frozen">Frozen</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-white">{stats.totalUsers || 0}</div>
          <div className="text-sm text-white/60">Total Users</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-emerald-400">{stats.activeUsers || 0}</div>
          <div className="text-sm text-white/60">Active</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-yellow-400">{stats.suspendedUsers || 0}</div>
          <div className="text-sm text-white/60">Suspended</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-red-400">{stats.frozenUsers || 0}</div>
          <div className="text-sm text-white/60">Frozen</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="p-4">User Details</th>
              <th className="p-4">Company</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Activity</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {filteredUsers.length > 0 ? filteredUsers.map(user => {
              const statusColor = getStatusColor(user.status);
              const isCurrentUser = user._id === localStorage.getItem('userId');
              
              return (
                <tr key={user._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center">
                        <span className="font-bold text-sm">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-lg">{user.name || 'Unknown User'}</div>
                        <div className="text-xs text-white/60 flex items-center gap-1">
                          <FaEnvelope size={10} />
                          {user.email || 'No email'}
                        </div>
                        {user.employeeCode && (
                          <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                            <FaIdCard size={10} />
                            ID: {user.employeeCode}
                          </div>
                        )}
                        {user.phoneNumber && (
                          <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
                            <FaPhone size={10} />
                            {user.phoneNumber}
                          </div>
                        )}
                        <div className="text-xs text-purple-400 mt-1">
                          Role: {user.role || 'user'}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    {user.company ? (
                      <div className="flex items-center gap-2">
                        <FaBuilding className="text-blue-400" size={14} />
                        <span className="font-medium">{user.company.name || 'Unknown Company'}</span>
                      </div>
                    ) : (
                      <span className="text-white/40 text-sm">No company assigned</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge color={statusColor}>
                        {user.status || 'active'}
                      </Badge>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
                            updateUserStatus(user._id, newStatus);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors text-left"
                          disabled={isCurrentUser}
                        >
                          {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => {
                            const newStatus = user.status === 'frozen' ? 'active' : 'frozen';
                            updateUserStatus(user._id, newStatus);
                          }}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors text-left"
                          disabled={isCurrentUser}
                        >
                          {user.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                        </button>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="text-sm">
                        <FaCalendarAlt className="inline mr-1" size={12} />
                        Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                      </div>
                      {user.lastLogin && (
                        <div className="text-xs text-white/60">
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </div>
                      )}
                      {user.statusReason && (
                        <div className="text-xs text-white/40 italic mt-1">
                          "{user.statusReason}"
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(user)}
                        className="flex items-center gap-2 justify-center"
                      >
                        <FaEdit />
                        Edit
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetUserPassword(user._id)}
                          className="flex items-center gap-1 justify-center"
                        >
                          <FaKey />
                          Reset PW
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(user)}
                          className="flex items-center gap-1 justify-center"
                          disabled={isCurrentUser}
                        >
                          <FaTrash />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-white/40">
                  <div className="text-6xl mb-4">👤</div>
                  <p className="text-xl mb-2">No users found</p>
                  <p className="text-white/60 mb-4">
                    {searchTerm ? 'Try a different search term' : 
                     filterStatus !== 'all' ? 'Try changing the status filter' :
                     filterCompany !== 'all' ? 'Try changing the company filter' :
                     'Click "Add User" to create new users'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setSearchTerm('');
                        setFilterCompany('all');
                        setFilterStatus('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={openCreateModal}
                    >
                      <FaPlus className="mr-2" />
                      Add User
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Employee Code
              </label>
              <input
                type="text"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="EMP001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Company
              </label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              >
                <option value="">Select Company</option>
                {Array.isArray(companies) && companies.map(company => (
                  <option key={company.id || company._id} value={company.id || company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              placeholder="+1234567890"
            />
          </div>

          {/* Hidden role field */}
          <input type="hidden" name="role" value="user" />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateUser}
            disabled={!formData.name || !formData.email || !formData.password}
          >
            Create User
          </Button>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit User: ${selectedUser?.name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Employee Code
              </label>
              <input
                type="text"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Company
              </label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              >
                <option value="">Select Company</option>
                {Array.isArray(companies) && companies.map(company => (
                  <option key={company.id || company._id} value={company.id || company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h4 className="font-bold text-white mb-3">Change Password (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                  placeholder="Leave blank to keep current"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateUser}
            disabled={!formData.name}
          >
            Update User
          </Button>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete User"
        size="md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <FaTrash className="text-red-400 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Delete {selectedUser?.name || 'User'}?
          </h3>
          <p className="text-white/70 mb-4">
            Are you sure you want to delete this user? This action cannot be undone.
          </p>
          <p className="text-sm text-red-400 mb-6">
            Note: Users with existing tickets cannot be deleted.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteUser}
          >
            Delete User
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

export default UsersTab;