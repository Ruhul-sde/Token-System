// components/super-admin/tabs/AdminsTab.jsx
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
  FaExclamationCircle
} from 'react-icons/fa';

const AdminsTab = () => {
  const { API_URL } = useAuth();
  const [adminProfiles, setAdminProfiles] = useState([]);
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
    employeeId: '',
    departmentId: '',
    phone: '',
    expertise: [],
    categories: [],
    role: 'admin' // Explicitly set role to 'admin'
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

      // Fetch admins (users with admin role)
      const usersResponse = await axios.get(`${API_URL}/users?role=admin`, config);
      const adminUsers = usersResponse.data.users || [];
      
      console.log('Fetched admin users:', adminUsers.length, adminUsers.map(u => ({
        name: u.name,
        role: u.role,
        email: u.email
      })));
      
      // Transform users to admin profiles format
      const adminProfilesData = adminUsers.map(user => ({
        _id: user._id,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email
        },
        employeeId: user.employeeCode || '',
        department: user.department,
        phone: user.phoneNumber || '',
        isActive: user.status === 'active',
        role: user.role || 'admin', // Ensure role is included
        expertise: [], // Would come from admin profile if separate model exists
        categories: [] // Would come from admin profile if separate model exists
      }));

      setAdminProfiles(adminProfilesData);

      // Fetch departments
      const departmentsResponse = await axios.get(`${API_URL}/departments`, config);
      const departmentsData = departmentsResponse.data.departments || 
                              departmentsResponse.data || 
                              [];
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);

      // Calculate stats
      const totalAdmins = adminProfilesData.length;
      const activeAdmins = adminProfilesData.filter(a => a.isActive).length;
      const inactiveAdmins = adminProfilesData.filter(a => !a.isActive).length;
      const uniqueDepartments = [...new Set(
        adminProfilesData
          .map(a => a.department?._id)
          .filter(Boolean)
      )].length;

      setStats({
        totalAdmins,
        activeAdmins,
        inactiveAdmins,
        departmentsCovered: uniqueDepartments
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.message || error.message);
      setAdminProfiles([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter admins
  const filteredAdmins = Array.isArray(adminProfiles) ? adminProfiles.filter(admin => {
    const matchesSearch = searchTerm === '' || 
      admin.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = filterDept === 'all' || 
      (admin.department && admin.department._id === filterDept);
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && admin.isActive) ||
      (filterStatus === 'inactive' && !admin.isActive);
    
    return matchesSearch && matchesDept && matchesStatus;
  }) : [];

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
      employeeId: '',
      departmentId: '',
      phone: '',
      expertise: [],
      categories: [],
      role: 'admin' // Explicitly set for new admins
    });
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.user?.name || '',
      email: admin.user?.email || '',
      password: '',
      confirmPassword: '',
      employeeId: admin.employeeId || '',
      departmentId: admin.department?._id || '',
      phone: admin.phone || '',
      expertise: admin.expertise || [],
      categories: admin.categories || [],
      role: 'admin' // Ensure role remains 'admin'
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

      // Log data for debugging
      console.log('Creating admin with data:', {
        ...formData,
        role: 'admin'
      });

      // Create user with admin role
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'admin', // Explicitly set role to 'admin'
        employeeCode: formData.employeeId || undefined,
        departmentId: formData.departmentId || undefined,
        phoneNumber: formData.phone || undefined,
        status: 'active'
      };

      const response = await axios.post(`${API_URL}/users`, userData, config);
      
      console.log('Create admin response:', response.data);
      
      if (response.data.success) {
        // Verify the created admin has correct role
        if (response.data.user && response.data.user.role !== 'admin') {
          console.warn('Warning: Created admin has role', response.data.user.role, 'but expected: admin');
        }
        
        setShowCreateModal(false);
        await fetchData();
        alert('Admin created successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to create admin');
      }

    } catch (error) {
      console.error('Error creating admin:', error);
      console.error('Error details:', error.response?.data);
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
        employeeCode: formData.employeeId || null,
        departmentId: formData.departmentId || null,
        phoneNumber: formData.phone || null,
        role: 'admin' // Ensure role remains 'admin'
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

      console.log('Updating admin with data:', userData);

      const response = await axios.put(
        `${API_URL}/users/${selectedAdmin._id}`, 
        userData, 
        config
      );
      
      console.log('Update admin response:', response.data);
      
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

  // Toggle admin status
  const toggleAdminStatus = async (adminId, currentStatus) => {
    try {
      const newStatus = currentStatus ? 'suspended' : 'active';
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
      console.error('Error toggling admin status:', error);
      alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading && adminProfiles.length === 0) {
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
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
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
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-white">{stats.totalAdmins}</div>
          <div className="text-sm text-white/60">Total Admins</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-emerald-400">{stats.activeAdmins}</div>
          <div className="text-sm text-white/60">Active</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-red-400">{stats.inactiveAdmins}</div>
          <div className="text-sm text-white/60">Inactive</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-yellow-400">{stats.departmentsCovered}</div>
          <div className="text-sm text-white/60">Departments Covered</div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="p-4">Admin Details</th>
              <th className="p-4">Contact Info</th>
              <th className="p-4">Department</th>
              <th className="p-4">Employee ID</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {filteredAdmins.length > 0 ? filteredAdmins.map(admin => {
              const isCurrentUser = admin._id === localStorage.getItem('userId');
              
              return (
                <tr key={admin._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center">
                        <span className="font-bold text-sm">
                          {admin.user?.name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-lg">{admin.user?.name || 'Unknown Admin'}</div>
                        <div className="text-xs text-white/60">
                          {admin.expertise?.length > 0 
                            ? `Expertise: ${admin.expertise.slice(0, 2).join(', ')}`
                            : 'No expertise defined'
                          }
                        </div>
                        <div className="text-xs text-purple-400 mt-1">
                          Role: {admin.role || 'admin'}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="text-sm text-white/90">{admin.user?.email || 'No email'}</div>
                      {admin.phone && (
                        <div className="text-xs text-white/60 flex items-center gap-1">
                          <FaPhone size={10} />
                          {admin.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    {admin.department ? (
                      <div className="flex items-center gap-2">
                        <FaBuilding className="text-blue-400" size={14} />
                        <span className="font-medium">{admin.department.name || 'Unknown Department'}</span>
                      </div>
                    ) : (
                      <span className="text-white/40 text-sm">No department assigned</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                    {admin.employeeId ? (
                      <div className="flex items-center gap-2">
                        <FaIdCard className="text-purple-400" size={14} />
                        <span className="font-medium">{admin.employeeId}</span>
                      </div>
                    ) : (
                      <span className="text-white/40 text-sm">Not set</span>
                    )}
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge color={admin.isActive ? 'green' : 'red'}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <button
                        onClick={() => toggleAdminStatus(admin._id, admin.isActive)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        disabled={isCurrentUser}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </button>
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
                          onClick={() => toggleAdminStatus(admin._id, admin.isActive)}
                          className="flex items-center gap-1 justify-center"
                          disabled={isCurrentUser}
                        >
                          {admin.isActive ? (
                            <><FaUserSlash /> Deactivate</>
                          ) : (
                            <><FaUserCheck /> Activate</>
                          )}
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
                <td colSpan="6" className="p-8 text-center text-white/40">
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
                Employee ID
              </label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="ADM001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Department
              </label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              >
                <option value="">Select Department</option>
                {safeDepartments.map(dept => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
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
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              placeholder="+1234567890"
            />
          </div>

          {/* Hidden role field */}
          <input type="hidden" name="role" value="admin" />
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
        title={`Edit Admin: ${selectedAdmin?.user?.name || ''}`}
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
                Employee ID
              </label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
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
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
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
                name="phone"
                value={formData.phone}
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
            Delete {selectedAdmin?.user?.name || 'Admin'}?
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