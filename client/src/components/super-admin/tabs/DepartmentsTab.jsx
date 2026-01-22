// components/super-admin/tabs/DepartmentsTab.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import Badge from '../../ui/Badge';
import axios from 'axios';
import {
  FaBuilding,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSync,
  FaLayerGroup,
  FaTag,
  FaTimes,
  FaCheck,
  FaExclamationCircle
} from 'react-icons/fa';

const DepartmentsTab = () => {
  const { API_URL } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categories: [] // Simple array of category strings
  });
  
  // Category input state
  const [newCategory, setNewCategory] = useState('');

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      const response = await axios.get(`${API_URL}/departments`, config);
      
      // Transform data if needed - ensure categories is an array of strings
      const departmentsData = Array.isArray(response.data) ? response.data : 
                             response.data.departments || response.data.data || [];
      
      const transformedDepartments = departmentsData.map(dept => ({
        ...dept,
        categories: Array.isArray(dept.categories) ? 
          dept.categories.map(cat => 
            typeof cat === 'object' ? cat.name || cat.category || 'Unnamed' : cat
          ) : 
          []
      }));
      
      setDepartments(transformedDepartments);
      
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError(error.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle category addition
  const handleAddCategory = () => {
    if (newCategory.trim() === '') return;
    
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory.trim()]
    }));
    
    setNewCategory('');
  };

  // Handle category removal
  const handleRemoveCategory = (index) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      categories: []
    });
    setNewCategory('');
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name || '',
      description: department.description || '',
      categories: Array.isArray(department.categories) ? department.categories : []
    });
    setNewCategory('');
    setShowEditModal(true);
  };

  // Create department
  const handleCreateDepartment = async () => {
    try {
      if (!formData.name.trim()) {
        alert('Department name is required');
        return;
      }

      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      };

      const departmentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        categories: formData.categories.length > 0 ? formData.categories : undefined
      };

      const response = await axios.post(`${API_URL}/departments`, departmentData, config);
      
      if (response.data.success || response.data._id) {
        setShowCreateModal(false);
        await fetchDepartments();
        alert('Department created successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to create department');
      }

    } catch (error) {
      console.error('Error creating department:', error);
      alert(`Failed to create department: ${error.response?.data?.message || error.message}`);
    }
  };

  // Update department
  const handleUpdateDepartment = async () => {
    try {
      if (!selectedDepartment || !formData.name.trim()) {
        alert('Department name is required');
        return;
      }

      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      };

      const departmentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        categories: formData.categories.length > 0 ? formData.categories : undefined
      };

      const response = await axios.put(
        `${API_URL}/departments/${selectedDepartment._id}`, 
        departmentData, 
        config
      );
      
      if (response.data.success || response.data._id) {
        setShowEditModal(false);
        await fetchDepartments();
        alert('Department updated successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to update department');
      }

    } catch (error) {
      console.error('Error updating department:', error);
      alert(`Failed to update department: ${error.response?.data?.message || error.message}`);
    }
  };

  // Delete department
  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm('Are you sure you want to delete this department? This cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      await axios.delete(`${API_URL}/departments/${departmentId}`, config);
      await fetchDepartments();
      alert('Department deleted successfully!');

    } catch (error) {
      console.error('Error deleting department:', error);
      alert(`Failed to delete department: ${error.response?.data?.message || error.message}`);
    }
  };

  // Stats calculation
  const totalCategories = departments.reduce((acc, dept) => 
    acc + (dept.categories?.length || 0), 0
  );
  
  const deptsWithCategories = departments.filter(dept => 
    dept.categories?.length > 0
  ).length;

  if (loading && departments.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ED1B2F] mb-6"></div>
          <p className="text-white text-lg mb-2">Loading departments...</p>
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
            <FaBuilding className="text-[#ED1B2F]" />
            Departments Management
          </h3>
          <p className="text-sm text-white/60 mt-1">
            {departments.length} departments • {totalCategories} categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            onClick={openCreateModal}
            className="flex items-center gap-2"
          >
            <FaPlus />
            Add Department
          </Button>
          <Button 
            variant="secondary" 
            onClick={fetchDepartments}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-2">
            <FaExclamationCircle className="text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Departments Grid */}
      {departments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(dept => (
            <div 
              key={dept._id} 
              className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-[#ED1B2F] transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-bold group-hover:text-[#ED1B2F] transition-colors">
                    {dept.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color="blue">
                      {dept.categories?.length || 0} categories
                    </Badge>
                    <span className="text-xs text-white/40">
                      ID: {dept._id?.slice(-6)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(dept)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Edit department"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    onClick={() => handleDeleteDepartment(dept._id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete department"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              
              <p className="text-white/60 text-sm mb-4 min-h-[3rem]">
                {dept.description || 'No description provided.'}
              </p>
              
              {/* Categories Display */}
              {dept.categories && dept.categories.length > 0 ? (
                <div className="mb-4">
                  <div className="text-sm text-white/70 mb-2 flex items-center gap-2">
                    <FaTag />
                    Categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dept.categories.slice(0, 5).map((cat, index) => (
                      <span 
                        key={index} 
                        className="text-xs bg-[#455185]/30 px-3 py-1 rounded-full text-white/80 border border-[#455185]"
                      >
                        {cat}
                      </span>
                    ))}
                    {dept.categories.length > 5 && (
                      <span className="text-xs text-white/50 px-2 py-1">
                        +{dept.categories.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-white/5 rounded-lg text-center">
                  <p className="text-white/40 text-sm">
                    No categories defined
                  </p>
                </div>
              )}
              
              <div className="text-xs text-white/40 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <FaLayerGroup />
                  Created: {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-white/40 py-16">
          <div className="text-6xl mb-4">🏢</div>
          <p className="text-xl mb-2">No departments found</p>
          <p className="text-white/60 mb-4">
            Departments are needed for ticket categorization
          </p>
          <Button 
            variant="primary" 
            onClick={openCreateModal}
          >
            <FaPlus className="mr-2" />
            Create First Department
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      {departments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
            <div className="text-2xl font-bold text-white">{departments.length}</div>
            <div className="text-sm text-white/60">Total Departments</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
            <div className="text-2xl font-bold text-emerald-400">{totalCategories}</div>
            <div className="text-sm text-white/60">Total Categories</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
            <div className="text-2xl font-bold text-blue-400">
              {deptsWithCategories}
            </div>
            <div className="text-sm text-white/60">Depts with Categories</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
            <div className="text-2xl font-bold text-yellow-400">
              {departments.length > 0 ? Math.round(totalCategories / departments.length) : 0}
            </div>
            <div className="text-sm text-white/60">Avg Categories per Dept</div>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Department"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Department Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              placeholder="e.g., IT Support, Sales, HR"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent min-h-[80px]"
              placeholder="Brief description of the department's purpose"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Categories (Optional)
            </label>
            <div className="space-y-3">
              {/* Category Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                  placeholder="Enter category name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                >
                  <FaPlus />
                </Button>
              </div>

              {/* Categories List */}
              {formData.categories.length > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm text-white/70 mb-2">Added Categories:</div>
                  <div className="flex flex-wrap gap-2">
                    {formData.categories.map((category, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 bg-[#455185]/30 px-3 py-1 rounded-full"
                      >
                        <span className="text-white/90 text-sm">{category}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-white/40 mt-2">
              Categories will be available when creating tickets for this department
            </p>
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
            onClick={handleCreateDepartment}
            disabled={!formData.name.trim()}
          >
            Create Department
          </Button>
        </div>
      </Modal>

      {/* Edit Department Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Department: ${selectedDepartment?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Department Name *
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
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Categories
            </label>
            <div className="space-y-3">
              {/* Category Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                  placeholder="Add new category"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                >
                  <FaPlus />
                </Button>
              </div>

              {/* Categories List */}
              {formData.categories.length > 0 && (
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm text-white/70 mb-2">Categories:</div>
                  <div className="flex flex-wrap gap-2">
                    {formData.categories.map((category, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 bg-[#455185]/30 px-3 py-1 rounded-full"
                      >
                        <span className="text-white/90 text-sm">{category}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            onClick={handleUpdateDepartment}
            disabled={!formData.name.trim()}
          >
            Update Department
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

export default DepartmentsTab;