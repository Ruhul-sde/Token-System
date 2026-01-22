import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Modal from '../../ui/Modal';
import axios from 'axios';
import {
  FaUserShield,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaPhone,
  FaBuilding,
  FaIdCard,
  FaUserCheck,
  FaUserSlash,
  FaSync,
  FaEnvelope,
  FaCalendarAlt,
  FaExclamationCircle,
  FaKey,
  FaUsers,
  FaUserTie
} from 'react-icons/fa';

const AdminsTab = () => {
  const { API_URL } = useAuth();
  const [adminUsers, setAdminUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAdmins: 0,
    activeAdmins: 0,
    inactiveAdmins: 0,
    departmentsCovered: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeCode: '',
    departmentId: '',
    phoneNumber: '',
    position: ''
  });

  // Error state
  const [error, setError] = useState(null);

  // Safely access departments array
  const safeDepartments = Array.isArray(departments) ? departments : [];

  // Fetch admins and departments
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Fetch admins using role-specific endpoint
      const adminsResponse = await axios.get(`${API_URL}/users/role/admin`, config);
      const adminUsersData = adminsResponse.data.users || [];
      
      setAdminUsers(adminUsersData);
      
      // Update stats from API response
      if (adminsResponse.data.stats) {
        setStats({
          totalAdmins: adminsResponse.data.stats.total || 0,
          activeAdmins: adminsResponse.data.stats.active || 0,
          inactiveAdmins: (adminsResponse.data.stats.suspended || 0) + (adminsResponse.data.stats.frozen || 0),
          departmentsCovered: adminsResponse.data.stats.withDepartment || 0
        });
      }

      // Fetch departments
      try {
        const departmentsResponse = await axios.get(`${API_URL}/departments`, config);
        const departmentsData = departmentsResponse.data.departments || 
                                departmentsResponse.data || 
                                [];
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      } catch (deptError) {
        console.warn('Could not fetch departments:', deptError);
        setDepartments([]);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError(error.response?.data?.message || error.message);
      setAdminUsers([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter admins function
  const filterAdmins = () => {
    return Array.isArray(adminUsers) ? adminUsers.filter(admin => {
      const matchesSearch = searchTerm === '' || 
        admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDept = filterDept === 'all' || 
        (admin.department && admin.department._id === filterDept) ||
        (admin.departmentId === filterDept);
      
      const matchesStatus = filterStatus === 'all' || 
        admin.status === filterStatus;
      
      return matchesSearch && matchesDept && matchesStatus;
    }) : [];
  };

  const filteredAdmins = filterAdmins();

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
      departmentId: '',
      phoneNumber: '',
      position: ''
    });
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      password: '',
      confirmPassword: '',
      employeeCode: admin.employeeCode || '',
      departmentId: admin.department?._id || admin.departmentId || '',
      phoneNumber: admin.phoneNumber || '',
      position: admin.position || ''
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (admin) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  // Create admin
  const handleCreateAdmin = async () => {
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

      // Create user with admin role
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'admin', // Explicitly set role to 'admin'
        employeeCode: formData.employeeCode || undefined,
        departmentId: formData.departmentId || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        position: formData.position || undefined
      };

      const response = await axios.post(`${API_URL}/users`, userData, config);
      
      if (response.data.success) {
        setShowCreateModal(false);
        await fetchData();
        alert('Admin created successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to create admin');
      }

    } catch (error) {
      console.error('Error creating admin:', error);
      alert(`Failed to create admin: ${error.response?.data?.message || error.message}`);
    }
  };

  // Update admin
  const handleUpdateAdmin = async () => {
    try {
      if (!selectedAdmin) return;

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
        departmentId: formData.departmentId || null,
        phoneNumber: formData.phoneNumber || null,
        position: formData.position || null,
        role: 'admin' // Ensure role stays as admin
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

      const response = await axios.put(
        `${API_URL}/users/${selectedAdmin._id}`, 
        userData, 
        config
      );
      
      if (response.data.success) {
        setShowEditModal(false);
        await fetchData();
        alert('Admin updated successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to update admin');
      }

    } catch (error) {
      console.error('Error updating admin:', error);
      alert(`Failed to update admin: ${error.response?.data?.message || error.message}`);
    }
  };

  // Delete admin
  const handleDeleteAdmin = async () => {
    try {
      if (!selectedAdmin) return;

      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      const response = await axios.delete(`${API_URL}/users/${selectedAdmin._id}`, config);
      
      if (response.data.success) {
        setShowDeleteModal(false);
        await fetchData();
        alert('Admin deleted successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to delete admin');
      }

    } catch (error) {
      console.error('Error deleting admin:', error);
      alert(`Failed to delete admin: ${error.response?.data?.message || error.message}`);
    }
  };

  // Update admin status
  const updateAdminStatus = async (adminId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const reason = prompt(`Reason for ${newStatus} status:`);
      if (reason === null) return;

      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      const response = await axios.patch(
        `${API_URL}/users/${adminId}/status`, 
        { status: newStatus, statusReason: reason }, 
        config
      );
      
      if (response.data.success) {
        await fetchData();
        alert(`Admin status updated to ${newStatus}`);
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }

    } catch (error) {
      console.error('Error updating admin status:', error);
      alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
  };

  // Reset admin password
  const resetAdminPassword = async (adminId) => {
    const newPassword = prompt('Enter new password for this admin:');
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
        `${API_URL}/users/${adminId}/reset-password`, 
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

  // Get department name by ID
  const getDepartmentName = (admin) => {
    if (admin.department && admin.department.name) {
      return admin.department.name;
    }
    if (admin.departmentId) {
      const dept = safeDepartments.find(d => d._id === admin.departmentId);
      return dept ? dept.name : 'Unknown Department';
    }
    return 'No department';
  };

  if (loading && adminUsers.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ED1B2F] mb-6"></div>
          <p className="text-white text-lg mb-2">Loading admin data...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96">
          <FaExclamationCircle className="text-red-400 text-6xl mb-6" />
          <p className="text-white text-lg mb-2">Error loading admins</p>
          <p className="text-white/60 mb-4">{error}</p>
          <Button variant="primary" onClick={fetchData}>
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
            <FaUserShield className="text-[#ED1B2F]" />
            Admin Management
          </h3>
          <p className="text-sm text-white/60 mt-1">
            {filteredAdmins.length} of {stats.totalAdmins} admins • {stats.activeAdmins} active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            onClick={openCreateModal}
            className="flex items-center gap-2"
          >
            <FaPlus />
            Add Admin
          </Button>
          <Button 
            variant="secondary" 
            onClick={fetchData}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search admins by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
          </div>
        </div>
        
        <div>
          <select
            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="all">All Departments</option>
            {safeDepartments.map(dept => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <select
            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <FaUserShield className="text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.totalAdmins}</div>
              <div className="text-sm text-white/60">Total Admins</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <FaUserCheck className="text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{stats.activeAdmins}</div>
              <div className="text-sm text-white/60">Active</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <FaUserSlash className="text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{stats.inactiveAdmins}</div>
              <div className="text-sm text-white/60">Inactive</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <FaBuilding className="text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{stats.departmentsCovered}</div>
              <div className="text-sm text-white/60">Departments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="p-4">Admin Details</th>
              <th className="p-4">Department</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Activity</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {filteredAdmins.length > 0 ? filteredAdmins.map(admin => {
              const isCurrentUser = admin._id === localStorage.getItem('userId');
              const statusColor = admin.status === 'active' ? 'green' : 
                                 admin.status === 'suspended' ? 'yellow' : 'red';
              
              return (
                <tr key={admin._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center">
                        <span className="font-bold text-sm">
                          {admin.name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          {admin.name || 'Unknown Admin'}
                          <Badge color="red" size="sm">ADMIN</Badge>
                        </div>
                        <div className="text-xs text-white/60 flex items-center gap-1">
                          <FaEnvelope size={10} />
                          {admin.email || 'No email'}
                        </div>
                        {admin.employeeCode && (
                          <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                            <FaIdCard size={10} />
                            ID: {admin.employeeCode}
                          </div>
                        )}
                        {admin.phoneNumber && (
                          <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
                            <FaPhone size={10} />
                            {admin.phoneNumber}
                          </div>
                        )}
                        {admin.position && (
                          <div className="text-xs text-white/60 mt-1">
                            {admin.position}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <FaBuilding className="text-blue-400" size={14} />
                      <span className="font-medium">{getDepartmentName(admin)}</span>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge color={statusColor}>
                        {admin.status || 'active'}
                      </Badge>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => updateAdminStatus(admin._id, admin.status)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors text-left"
                          disabled={isCurrentUser}
                        >
                          {admin.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="text-sm">
                        <FaCalendarAlt className="inline mr-1" size={12} />
                        Joined: {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'Unknown'}
                      </div>
                      {admin.lastLogin && (
                        <div className="text-xs text-white/60">
                          Last login: {new Date(admin.lastLogin).toLocaleDateString()}
                        </div>
                      )}
                      {admin.statusReason && (
                        <div className="text-xs text-white/40 italic mt-1">
                          "{admin.statusReason}"
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(admin)}
                        className="flex items-center gap-2 justify-center"
                      >
                        <FaEdit />
                        Edit
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetAdminPassword(admin._id)}
                          className="flex items-center gap-1 justify-center"
                        >
                          <FaKey />
                          Reset PW
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(admin)}
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
                  <div className="text-6xl mb-4">👨‍💼</div>
                  <p className="text-xl mb-2">No admins found</p>
                  <p className="text-white/60 mb-4">
                    {searchTerm ? 'Try a different search term' : 
                     filterStatus !== 'all' ? 'Try changing the status filter' :
                     filterDept !== 'all' ? 'Try changing the department filter' :
                     'Click "Add Admin" to create new admins'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setSearchTerm('');
                        setFilterDept('all');
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
                      Add Admin
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Admin Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Admin"
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
                placeholder="admin@example.com"
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
                placeholder="ADM001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="System Administrator"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Department
              </label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleInputChange}
                className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              >
                <option value="">Select Department</option>
                {safeDepartments.map(dept => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
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
                placeholder="+1234567890"
              />
            </div>
          </div>
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
            onClick={handleCreateAdmin}
            disabled={!formData.name || !formData.email || !formData.password}
          >
            Create Admin
          </Button>
        </div>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Admin: ${selectedAdmin?.name || ''}`}
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
                Department
              </label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleInputChange}
                className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              >
                <option value="">Select Department</option>
                {safeDepartments.map(dept => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              />
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
            />
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
            onClick={handleUpdateAdmin}
            disabled={!formData.name}
          >
            Update Admin
          </Button>
        </div>
      </Modal>

      {/* Delete Admin Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Admin"
        size="md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <FaTrash className="text-red-400 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Delete {selectedAdmin?.name || 'Admin'}?
          </h3>
          <p className="text-white/70 mb-4">
            Are you sure you want to delete this admin? This action cannot be undone.
          </p>
          <p className="text-sm text-red-400 mb-6">
            Note: Admins with assigned tickets cannot be deleted.
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
            onClick={handleDeleteAdmin}
          >
            Delete Admin
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

export default AdminsTab;