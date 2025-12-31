import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart } from 'recharts';

const AnimatedSphere = ({ color, position }) => (
  <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
    <Sphere args={[0.5, 64, 64]} position={position}>
      <MeshDistortMaterial color={color} roughness={0.2} metalness={0.9} distort={0.4} speed={2} />
    </Sphere>
  </Float>
);

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tickets, settickets] = useState([]);
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Enhanced UI States
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Modal states
  const [showAdminDetailModal, setShowAdminDetailModal] = useState(false);
  const [showTokenDetailModal, setShowTokenDetailModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedTicket, setselectedTicket] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [statusAction, setStatusAction] = useState({ status: '', reason: '' });

  // Form states
  const [showAdminProfileForm, setShowAdminProfileForm] = useState(false);
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', description: '', categories: [] });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', subCategories: [] });
  const [newSubCategory, setNewSubCategory] = useState('');
  const [newAdminProfile, setNewAdminProfile] = useState({ 
    name: '', email: '', password: '', expertise: [], 
    department: '', categories: [], phone: '', employeeId: ''
  });
  const [newExpertise, setNewExpertise] = useState('');
  const [newToken, setNewToken] = useState({
    title: '',
    description: '',
    priority: 'medium',
    department: '',
    category: '',
    subCategory: '',
    reason: '',
    supportingDocuments: [],
    userDetails: {
      name: '',
      email: '',
      employeeCode: '',
      companyName: ''
    }
  });

  const handleSuperAdminFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isValidSize = file.size <= 5 * 1024 * 1024;

      if (!isValidSize) {
        alert(`File ${file.name} exceeds 5MB limit`);
        return false;
      }

      if (!isImage && !isPDF) {
        alert(`File ${file.name} must be an image or PDF`);
        return false;
      }

      return true;
    });

    const filePromises = validFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            filename: file.name,
            fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
            base64Data: e.target.result,
            uploadedAt: new Date()
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const uploadedFiles = await Promise.all(filePromises);
    setNewToken(prev => ({
      ...prev,
      supportingDocuments: [...prev.supportingDocuments, ...uploadedFiles]
    }));
  };

  const removeSuperAdminFile = (index) => {
    setNewToken(prev => ({
      ...prev,
      supportingDocuments: prev.supportingDocuments.filter((_, i) => i !== index)
    }));
  };

  // Filters
  const [filters, setFilters] = useState({
    department: 'all',
    status: 'all',
    priority: 'all',
    adminPerformance: 'all'
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { API_URL, user } = useAuth();

  const [editingAdmin, setEditingAdmin] = useState(false);

  // Solution Directory States
  const [solutionSortBy, setSolutionSortBy] = useState('date');
  const [solutionSortOrder, setSolutionSortOrder] = useState('desc');
  const [solutionCategoryFilter, setSolutionCategoryFilter] = useState('all');
  const [solutionPriorityFilter, setSolutionPriorityFilter] = useState('all');
  const [solutionViewMode, setSolutionViewMode] = useState('detailed');
  const [expandedSolutions, setExpandedSolutions] = useState({});
  const [copiedSolutionId, setCopiedSolutionId] = useState(null);

  const toggleSolutionExpand = (tokenId) => {
    setExpandedSolutions(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  const copySolution = async (tokenId, solution) => {
    try {
      await navigator.clipboard.writeText(solution);
      setCopiedSolutionId(tokenId);
      setTimeout(() => setCopiedSolutionId(null), 2000);
    } catch (err) {
      console.error('Failed to copy solution:', err);
    }
  };

  const getFilteredAndSortedSolutions = () => {
    let solutions = tickets.filter(t => t.status === 'resolved' && t.solution);

    if (searchQuery) {
      solutions = solutions.filter(t => 
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.solution?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.department !== 'all') {
      solutions = solutions.filter(t => t.department?._id === filters.department);
    }

    if (solutionCategoryFilter !== 'all') {
      solutions = solutions.filter(t => t.category === solutionCategoryFilter);
    }

    if (solutionPriorityFilter !== 'all') {
      solutions = solutions.filter(t => t.priority === solutionPriorityFilter);
    }

    solutions.sort((a, b) => {
      let comparison = 0;
      switch (solutionSortBy) {
        case 'date':
          comparison = new Date(b.solvedAt || b.updatedAt) - new Date(a.solvedAt || a.updatedAt);
          break;
        case 'rating':
          comparison = (b.feedback?.rating || 0) - (a.feedback?.rating || 0);
          break;
        case 'time':
          comparison = (a.timeToSolve || Infinity) - (b.timeToSolve || Infinity);
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        default:
          comparison = 0;
      }
      return solutionSortOrder === 'desc' ? comparison : -comparison;
    });

    return solutions;
  };

  const getResolutionTime = (token) => {
    if (token.timeToSolve) return token.timeToSolve;
    if (token.solvedAt && token.createdAt) {
      return new Date(token.solvedAt) - new Date(token.createdAt);
    }
    return null;
  };

  const solutionStats = useMemo(() => {
    const solutions = tickets.filter(t => t.status === 'resolved' && t.solution);

    const solutionsWithRating = solutions.filter(t => t.feedback?.rating);
    const reviewsCount = solutionsWithRating.length;
    const avgRating = reviewsCount > 0 
      ? solutionsWithRating.reduce((sum, t) => sum + t.feedback.rating, 0) / reviewsCount 
      : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    solutionsWithRating.forEach(t => {
      const rating = Math.round(t.feedback.rating);
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    const pendingReviews = solutions.filter(t => !t.feedback?.rating).length;

    const recentReviews = solutionsWithRating
      .filter(t => t.feedback?.submittedAt)
      .sort((a, b) => new Date(b.feedback.submittedAt) - new Date(a.feedback.submittedAt))
      .slice(0, 5)
      .map(t => ({
        ticketNumber: t.ticketNumber,
        title: t.title,
        rating: t.feedback.rating,
        comment: t.feedback.comment,
        submittedAt: t.feedback.submittedAt,
        solvedBy: t.solvedBy?.name || 'Unknown'
      }));

    const solutionsWithTime = solutions.map(t => ({
      ...t,
      calculatedTime: getResolutionTime(t)
    })).filter(t => t.calculatedTime !== null && t.calculatedTime > 0);

    const avgTime = solutionsWithTime.length > 0
      ? solutionsWithTime.reduce((sum, t) => sum + t.calculatedTime, 0) / solutionsWithTime.length
      : 0;

    const fastestTime = solutionsWithTime.length > 0
      ? Math.min(...solutionsWithTime.map(t => t.calculatedTime))
      : 0;

    const slowestTime = solutionsWithTime.length > 0
      ? Math.max(...solutionsWithTime.map(t => t.calculatedTime))
      : 0;

    const categories = [...new Set(solutions.map(t => t.category).filter(Boolean))];

    const topSolver = solutions.reduce((acc, t) => {
      const solver = t.solvedBy?.name || 'Unknown';
      acc[solver] = (acc[solver] || 0) + 1;
      return acc;
    }, {});
    const topSolverName = Object.entries(topSolver).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { 
      total: solutions.length, 
      avgRating, 
      avgTime, 
      categories, 
      topSolverName,
      reviewsCount,
      pendingReviews,
      ratingDistribution,
      recentReviews,
      fastestTime,
      slowestTime,
      solutionsWithTimeCount: solutionsWithTime.length
    };
  }, [tickets]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'in-progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'solved': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'suspended': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'frozen': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };

      const [statsRes, usersRes, deptsRes, ticketsRes, profilesRes, companiesRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats`, config),
        axios.get(`${API_URL}/users`, config),
        axios.get(`${API_URL}/departments`, config),
        axios.get(`${API_URL}/tickets`, config),
        axios.get(`${API_URL}/admin-profiles`, config),
        axios.get(`${API_URL}/companies`, config)
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      settickets(ticketsRes.data);
      setAdminProfiles(profilesRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      setError(`Failed to load dashboard data: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Department CRUD
  const saveDepartment = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await axios.patch(`${API_URL}/departments/${editingDept._id}`, newDept);
      } else {
        await axios.post(`${API_URL}/departments`, newDept);
      }
      setNewDept({ name: '', description: '', categories: [] });
      setShowDeptModal(false);
      setEditingDept(null);
      fetchData();
    } catch (error) {
      alert('Failed to save department');
    }
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

  const refreshCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      await axios.post(`${API_URL}/companies/refresh`, {}, config);
      fetchData();
      alert('Companies refreshed successfully');
    } catch (error) {
      alert('Failed to refresh companies');
    }
  };

  const viewCompanyDetails = async (companyId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/companies/${companyId}`, config);
      setSelectedCompany(response.data);
      setShowCompanyModal(true);
    } catch (error) {
      alert('Failed to load company details');
    }
  };

  // Admin Profile CRUD
  const createAdminProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingAdmin 
        ? `${API_URL}/admin-profiles/${editingAdmin._id}` 
        : `${API_URL}/admin-profiles`;

      const method = editingAdmin ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAdminProfile)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save admin profile');
      }

      setShowAdminProfileForm(false);
      setEditingAdmin(null);
      setNewAdminProfile({ name: '', email: '', password: '', expertise: [], department: '', categories: [], phone: '', employeeId: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving admin profile:', error);
      alert(error.message);
    }
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

  // User status management
  const updateUserStatus = async (userId, status, reason) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      await axios.patch(`${API_URL}/users/${userId}/status`, { status, reason }, config);
      setShowStatusModal(false);
      setStatusAction({ status: '', reason: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update user status');
    }
  };

  // Category helpers
  const addCategoryToDept = () => {
    if (newCategory.name.trim()) {
      setNewDept({
        ...newDept,
        categories: [...newDept.categories, { ...newCategory, _id: Date.now().toString() }]
      });
      setNewCategory({ name: '', description: '', subCategories: [] });
    }
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

  const addExpertise = () => {
    if (newExpertise.trim()) {
      setNewAdminProfile({
        ...newAdminProfile,
        expertise: [...newAdminProfile.expertise, newExpertise.trim()]
      });
      setNewExpertise('');
    }
  };

  const createTokenOnBehalf = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      };

      await axios.post(`${API_URL}/tickets/on-behalf`, newToken, config);

      setShowCreateTokenModal(false);
      setNewToken({
        title: '',
        description: '',
        priority: 'medium',
        department: '',
        category: '',
        subCategory: '',
        reason: '',
        supportingDocuments: [],
        userDetails: {
          name: '',
          email: '',
          employeeCode: '',
          companyName: ''
        }
      });

      fetchData();
      alert('Token created successfully on behalf of user');
    } catch (error) {
      console.error('Error creating token:', error);
      alert(error.response?.data?.message || 'Failed to create token');
    }
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!tickets.length) return null;

    const now = new Date();
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };

    const cutoff = now - timeRanges[selectedTimeRange];
    const filteredtickets = tickets.filter(t => new Date(t.createdAt) >= cutoff);

    // Time-based statistics
    const ticketsByDay = {};
    filteredtickets.forEach(token => {
      const day = new Date(token.createdAt).toLocaleDateString();
      if (!ticketsByDay[day]) {
        ticketsByDay[day] = { created: 0, solved: 0, pending: 0 };
      }
      ticketsByDay[day].created++;
      if (token.status === 'solved') ticketsByDay[day].solved++;
      if (token.status === 'pending') ticketsByDay[day].pending++;
    });

    const timeSeriesData = Object.entries(ticketsByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Department performance
    const deptPerformance = departments.map(dept => {
      const depttickets = filteredtickets.filter(t => t.department?._id === dept._id);
      const resolved = depttickets.filter(t => t.status === 'resolved').length;
      // Only include resolved tickets with valid timeToSolve data
      const resolvedWithTime = depttickets.filter(t => t.status === 'resolved' && t.timeToSolve && t.timeToSolve > 0);
      const avgTime = resolvedWithTime.length > 0 
        ? resolvedWithTime.reduce((sum, t) => sum + t.timeToSolve, 0) / resolvedWithTime.length 
        : 0;

      return {
        name: dept.name,
        total: depttickets.length,
        solved: resolved,
        pending: depttickets.filter(t => t.status === 'pending').length,
        avgTime: avgTime,
        efficiency: depttickets.length ? (resolved / depttickets.length * 100).toFixed(1) : 0
      };
    });

    // Admin performance metrics
    const adminStats = users
      .filter(u => u.role === 'admin')
      .map(admin => {
        const admintickets = filteredtickets.filter(t => t.assignedTo?._id === admin._id);
        const resolved = admintickets.filter(t => t.status === 'resolved');
        // Only include resolved tickets with valid timeToSolve data
        const resolvedWithTime = resolved.filter(t => t.timeToSolve && t.timeToSolve > 0);
        const totalTime = resolvedWithTime.reduce((sum, t) => sum + t.timeToSolve, 0);
        const avgTime = resolvedWithTime.length > 0 ? totalTime / resolvedWithTime.length : 0;
        const feedbacktickets = resolved.filter(t => t.feedback?.rating);
        const avgRating = feedbacktickets.length 
          ? feedbacktickets.reduce((sum, t) => sum + t.feedback.rating, 0) / feedbacktickets.length 
          : 0;

        return {
          admin,
          total: admintickets.length,
          solved: resolved.length,
          working: admintickets.filter(t => ['assigned', 'in-progress'].includes(t.status)).length,
          totalTime,
          avgTime: avgTime,
          avgRating,
          feedbackCount: feedbacktickets.length,
          efficiency: admintickets.length ? (resolved.length / admintickets.length * 100) : 0
        };
      })
      .sort((a, b) => b.solved - a.solved);

    // Priority distribution
    const priorityDist = {
      high: filteredtickets.filter(t => t.priority === 'high').length,
      medium: filteredtickets.filter(t => t.priority === 'medium').length,
      low: filteredtickets.filter(t => t.priority === 'low').length
    };

    // Status distribution
    const statusDist = {
      resolved: filteredtickets.filter(t => t.status === 'resolved').length,
      pending: filteredtickets.filter(t => t.status === 'pending').length,
      assigned: filteredtickets.filter(t => ['assigned', 'in-progress'].includes(t.status)).length
    };

    // Feedback analysis
    const feedbackAnalysis = filteredtickets
      .filter(t => t.feedback?.rating)
      .reduce((acc, token) => {
        const rating = token.feedback.rating;
        acc.total++;
        acc.sum += rating;
        acc.ratings[rating] = (acc.ratings[rating] || 0) + 1;
        return acc;
      }, { total: 0, sum: 0, ratings: {} });

    return {
      timeSeriesData,
      deptPerformance,
      adminStats,
      priorityDist,
      statusDist,
      feedbackAnalysis,
      avgRating: feedbackAnalysis.total ? (feedbackAnalysis.sum / feedbackAnalysis.total).toFixed(2) : 0,
      avgSolveTime: (() => {
        // Only include resolved tickets with valid timeToSolve data
        const ticketsWithValidTime = filteredtickets.filter(t => t.status === 'resolved' && t.timeToSolve && t.timeToSolve > 0);
        return ticketsWithValidTime.length > 0 
          ? ticketsWithValidTime.reduce((sum, t) => sum + t.timeToSolve, 0) / ticketsWithValidTime.length
          : 0;
      })()
    };
  }, [tickets, departments, users, selectedTimeRange]);

  // Sorting function
  const sortedData = (data, key) => {
    if (!sortConfig.key || sortConfig.key !== key) return data;

    return [...data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Search and filter
  const filteredAdmins = useMemo(() => {
    let filtered = adminProfiles;

    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(p => p.department?._id === filters.department);
    }

    return filtered;
  }, [adminProfiles, searchQuery, filters.department]);

  const filteredticketsList = useMemo(() => {
    let filtered = tickets;

    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(t => t.department?._id === filters.department);
    }

    return filtered;
  }, [tickets, filters]);

  // Helper to format time in days, hours, minutes from milliseconds
  const formatTime = (milliseconds) => {
    if (!milliseconds || milliseconds === 0) return '0m';

    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const COLORS = ['#ED1B2F', '#455185', '#00C49F', '#FFBB28', '#8884D8', '#FF8042'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-[#ED1B2F] mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl">🚀</div>
            </div>
          </div>
          <div className="text-white text-2xl font-bold mt-4 animate-pulse">Loading Command Center...</div>
          <div className="text-white/60 text-sm mt-2">Gathering analytics data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
        <div className="bg-red-500/10 border-2 border-red-500/50 rounded-3xl p-10 max-w-md backdrop-blur-xl">
          <div className="text-6xl mb-4 text-center">⚠️</div>
          <div className="text-red-400 text-2xl mb-4 font-bold text-center">Error Loading Dashboard</div>
          <div className="text-white/80 mb-6 text-center">{error}</div>
          <button onClick={fetchData} className="w-full px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-all shadow-lg hover:shadow-2xl transform hover:scale-105 font-semibold">
            🔄 Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced 3D Header with Gradient Overlay */}
        <div className="mb-8 h-80 rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group">
          <Canvas camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ED1B2F" />
            <AnimatedSphere color="#ED1B2F" position={[-2, 0, 0]} />
            <AnimatedSphere color="#455185" position={[2, 0, 0]} />
            <AnimatedSphere color="#00C49F" position={[0, 2, 0]} />
            <AnimatedSphere color="#FFBB28" position={[0, -2, 0]} />
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
          </Canvas>
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1f3a] via-transparent to-transparent flex items-end">
            <div className="p-8 w-full">
              <h1 className="text-6xl font-black bg-gradient-to-r from-[#ED1B2F] via-purple-500 to-[#455185] bg-clip-text text-transparent mb-3 drop-shadow-2xl">
                Supreme Command Center
              </h1>
              <p className="text-white/80 text-xl font-medium">Real-time Analytics & Strategic Control</p>
            </div>
          </div>
        </div>

        {/* Modern Header with Quick Actions */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <p className="text-white/60 text-sm">Welcome back,</p>
                <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateTokenModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-all shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center gap-2 font-semibold group"
            >
              <span className="text-xl group-hover:rotate-90 transition-transform">➕</span>
              Create Token for User
            </button>

            {/* Time Range Selector with Icons */}
            <div className="flex gap-2 bg-white/5 backdrop-blur-xl rounded-xl p-1 border border-white/10">
              {[
                { value: '24h', label: '24h', icon: '⏰' },
                { value: '7d', label: '7d', icon: '📅' },
                { value: '30d', label: '30d', icon: '📊' },
                { value: 'all', label: 'All', icon: '🌐' }
              ].map(range => (
                <button
                  key={range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={`px-4 py-2 rounded-lg transition-all font-semibold flex items-center gap-2 ${
                    selectedTimeRange === range.value
                      ? 'bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white shadow-lg transform scale-105'
                      : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{range.icon}</span>
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics Cards with Animations */}
        {stats && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/40 hover:border-blue-400/60 transition-all group hover:scale-105 transform shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-5xl">🎫</div>
                  <div className="text-blue-300/50 text-sm font-semibold uppercase tracking-wider">Total</div>
                </div>
                <div className="text-5xl font-black text-white mb-2">{stats.overview.totaltickets}</div>
                <div className="text-blue-200/80 text-sm font-medium">Support Tickets</div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-blue-900/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 w-full"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-green-600/30 to-green-800/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/40 hover:border-green-400/60 transition-all group hover:scale-105 transform shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-5xl">✅</div>
                  <div className="text-green-300/50 text-sm font-semibold uppercase tracking-wider">Resolved</div>
                </div>
                <div className="text-5xl font-black text-white mb-2">{stats.overview.resolvedtickets}</div>
                <div className="text-green-200/80 text-sm font-medium">
                  {((stats.overview.resolvedtickets / stats.overview.totaltickets) * 100 || 0).toFixed(1)}% Success Rate
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-green-900/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                      style={{ width: `${((stats.overview.resolvedtickets / stats.overview.totaltickets) * 100 || 0)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/40 hover:border-purple-400/60 transition-all group hover:scale-105 transform shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-5xl">⚡</div>
                  <div className="text-purple-300/50 text-sm font-semibold uppercase tracking-wider">Avg Time</div>
                </div>
                <div className="text-5xl font-black text-white mb-2">{formatTime(analytics.avgSolveTime)}</div>
                <div className="text-purple-200/80 text-sm font-medium">Resolution Time</div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-purple-900/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 w-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-yellow-600/30 to-yellow-800/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/40 hover:border-yellow-400/60 transition-all group hover:scale-105 transform shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-5xl">⭐</div>
                  <div className="text-yellow-300/50 text-sm font-semibold uppercase tracking-wider">Rating</div>
                </div>
                <div className="text-5xl font-black text-white mb-2">{analytics.avgRating}</div>
                <div className="text-yellow-200/80 text-sm font-medium">{analytics.feedbackAnalysis.total} Reviews</div>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div 
                      key={star} 
                      className={`text-2xl ${star <= Math.round(analytics.avgRating) ? 'text-yellow-400' : 'text-yellow-900/30'}`}
                    >
                      ⭐
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Navigation Tabs */}
        <div className="mb-8 bg-white/5 backdrop-blur-xl rounded-2xl p-2 border border-white/10 shadow-xl">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'overview', icon: '📊', label: 'Overview', gradient: 'from-blue-500 to-cyan-500' },
              { id: 'analytics', icon: '📈', label: 'Analytics', gradient: 'from-purple-500 to-pink-500' },
              { id: 'companies', icon: '🏪', label: 'Companies', gradient: 'from-amber-500 to-orange-500' },
              { id: 'solutions', icon: '💡', label: 'Solutions', gradient: 'from-green-500 to-emerald-500' },
              { id: 'departments', icon: '🏢', label: 'Departments', gradient: 'from-orange-500 to-red-500' },
              { id: 'admins', icon: '👥', label: 'Admins', gradient: 'from-indigo-500 to-purple-500' },
              { id: 'users', icon: '👤', label: 'Users', gradient: 'from-pink-500 to-rose-500' },
              { id: 'tickets', icon: '🎫', label: 'Tickets', gradient: 'from-teal-500 to-cyan-500' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl transition-all whitespace-nowrap font-semibold ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-2xl transform scale-105`
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="mr-2 text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* Real-time Activity Pulse */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <h3 className="text-2xl font-bold text-white">Live System Pulse</h3>
                </div>
                <div className="text-white/60 text-sm">Updated in real-time</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
                  <div className="text-blue-400 text-3xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-white">{users.length}</div>
                  <div className="text-blue-300/70 text-sm">Total Users</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/30">
                  <div className="text-green-400 text-3xl mb-2">👨‍💼</div>
                  <div className="text-2xl font-bold text-white">{users.filter(u => u.role === 'admin').length}</div>
                  <div className="text-green-300/70 text-sm">Active Admins</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/30">
                  <div className="text-purple-400 text-3xl mb-2">🏢</div>
                  <div className="text-2xl font-bold text-white">{departments.length}</div>
                  <div className="text-purple-300/70 text-sm">Departments</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/30">
                  <div className="text-orange-400 text-3xl mb-2">⏳</div>
                  <div className="text-2xl font-bold text-white">{tickets.filter(t => t.status === 'pending').length}</div>
                  <div className="text-orange-300/70 text-sm">Pending Tickets</div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Time Series Chart */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  Ticket Trends Over Time
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.timeSeriesData}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" stroke="#ffffff60" />
                    <YAxis stroke="#ffffff60" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="created" stroke="#8884d8" fillOpacity={1} fill="url(#colorCreated)" name="Created" />
                    <Area type="monotone" dataKey="solved" stroke="#00C49F" fillOpacity={1} fill="url(#colorSolved)" name="Solved" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Status Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Resolved', value: analytics.statusDist.resolved },
                        { name: 'Assigned', value: analytics.statusDist.assigned },
                        { name: 'Pending', value: analytics.statusDist.pending }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Performance Cards */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-3xl">🏢</span>
                Department Performance Matrix
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.deptPerformance.map((dept, idx) => (
                  <div key={dept.name} className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 hover:border-[#ED1B2F]/50 transition-all transform hover:scale-105 shadow-lg group">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-bold text-lg">{dept.name}</h4>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold shadow-lg">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm flex items-center gap-2">
                          <span>🎫</span> Total Tickets
                        </span>
                        <span className="text-white font-semibold text-lg">{dept.total}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm flex items-center gap-2">
                          <span>✅</span> Solved
                        </span>
                        <span className="text-green-400 font-semibold text-lg">{dept.solved}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm flex items-center gap-2">
                          <span>📊</span> Efficiency
                        </span>
                        <span className="text-purple-400 font-semibold text-lg">{dept.efficiency}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm flex items-center gap-2">
                          <span>⏱️</span> Avg Time
                        </span>
                        <span className="text-blue-400 font-semibold text-lg">{formatTime(dept.avgTime)}</span>
                      </div>
                    </div>
                    {/* Enhanced Progress Bar */}
                    <div className="mt-4 bg-white/10 rounded-full h-3 overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-[#ED1B2F] via-purple-500 to-[#455185] transition-all duration-1000 rounded-full shadow-lg"
                        style={{ width: `${dept.efficiency}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-center text-white/40 text-xs font-medium">Performance Score</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Solution Directory Tab - Enhanced */}
        {activeTab === 'solutions' && (
          <div className="space-y-6">
            {/* Solution Stats Cards */}
            {(() => {
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-gradient-to-br from-green-600/30 to-green-800/20 backdrop-blur-xl rounded-2xl p-5 border border-green-500/40 hover:border-green-400/60 transition-all transform hover:scale-105 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-green-400 text-4xl">📚</div>
                      <div>
                        <div className="text-3xl font-bold text-white">{solutionStats.total}</div>
                        <div className="text-green-300/70 text-sm font-medium">Total Solutions</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-600/30 to-yellow-800/20 backdrop-blur-xl rounded-2xl p-5 border border-yellow-500/40 hover:border-yellow-400/60 transition-all transform hover:scale-105 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-yellow-400 text-4xl">⭐</div>
                      <div>
                        <div className="text-3xl font-bold text-white">{solutionStats.avgRating.toFixed(1)}</div>
                        <div className="text-yellow-300/70 text-sm font-medium">Avg Rating</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-600/30 to-orange-800/20 backdrop-blur-xl rounded-2xl p-5 border border-orange-500/40 hover:border-orange-400/60 transition-all transform hover:scale-105 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-orange-400 text-4xl">📝</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-3xl font-bold text-white">{solutionStats.reviewsCount}</div>
                          {solutionStats.pendingReviews > 0 && (
                            <span className="px-2 py-0.5 bg-red-500/30 text-red-300 text-xs rounded-full">{solutionStats.pendingReviews} pending</span>
                          )}
                        </div>
                        <div className="text-orange-300/70 text-sm font-medium">Reviews</div>
                        <div className="flex gap-0.5 mt-1">
                          {[5,4,3,2,1].map(star => (
                            <div key={star} className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden" title={`${star} star: ${solutionStats.ratingDistribution[star]}`}>
                              <div 
                                className="h-full bg-yellow-400 rounded-full" 
                                style={{ width: solutionStats.reviewsCount > 0 ? `${(solutionStats.ratingDistribution[star] / solutionStats.reviewsCount) * 100}%` : '0%' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/40 hover:border-purple-400/60 transition-all transform hover:scale-105 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-purple-400 text-4xl">⚡</div>
                      <div>
                        <div className="text-3xl font-bold text-white">{formatTime(solutionStats.avgTime)}</div>
                        <div className="text-purple-300/70 text-sm font-medium">Avg Resolution</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/20 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/40 hover:border-blue-400/60 transition-all transform hover:scale-105 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-blue-400 text-4xl">🏷️</div>
                      <div>
                        <div className="text-3xl font-bold text-white">{solutionStats.categories.length}</div>
                        <div className="text-blue-300/70 text-sm font-medium">Categories</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-600/30 to-pink-800/20 backdrop-blur-xl rounded-2xl p-5 border border-pink-500/40 hover:border-pink-400/60 transition-all transform hover:scale-105 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="text-pink-400 text-4xl">🏆</div>
                      <div>
                        <div className="text-lg font-bold text-white truncate">{solutionStats.topSolverName}</div>
                        <div className="text-pink-300/70 text-sm font-medium">Top Solver</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-bold text-white flex items-center gap-2">
                      <span className="text-4xl">💡</span>
                      Solution Knowledge Base
                    </h3>
                    <p className="text-white/60 text-sm mt-2">Browse resolved tickets with detailed solutions & insights</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSolutionViewMode('detailed')}
                      className={`px-4 py-2 rounded-lg transition-all font-semibold ${solutionViewMode === 'detailed' ? 'bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white shadow-lg' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                      title="Detailed View"
                    >
                      <span className="text-xl">📋</span>
                    </button>
                    <button
                      onClick={() => setSolutionViewMode('compact')}
                      className={`px-4 py-2 rounded-lg transition-all font-semibold ${solutionViewMode === 'compact' ? 'bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white shadow-lg' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                      title="Compact View"
                    >
                      <span className="text-xl">📝</span>
                    </button>
                  </div>
                </div>

                {/* Enhanced Filters Row */}
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    placeholder="🔍 Search solutions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] flex-1 min-w-[200px] font-medium"
                  />
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] font-medium"
                  >
                    <option value="all" className="text-gray-900">🏢 All Departments</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
                    ))}
                  </select>
                  <select
                    value={solutionCategoryFilter}
                    onChange={(e) => setSolutionCategoryFilter(e.target.value)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] font-medium"
                  >
                    <option value="all" className="text-gray-900">📁 All Categories</option>
                    {solutionStats.categories.map(cat => (
                      <option key={cat} value={cat} className="text-gray-900">{cat}</option>
                    ))}
                  </select>
                  <select
                    value={solutionPriorityFilter}
                    onChange={(e) => setSolutionPriorityFilter(e.target.value)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] font-medium"
                  >
                    <option value="all" className="text-gray-900">🎯 All Priorities</option>
                    <option value="high" className="text-gray-900">🔴 High Priority</option>
                    <option value="medium" className="text-gray-900">🟡 Medium Priority</option>
                    <option value="low" className="text-gray-900">🟢 Low Priority</option>
                  </select>
                </div>

                {/* Sort Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-white/60 text-sm font-semibold">Sort by:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'date', label: 'Date', icon: '📅' },
                      { id: 'rating', label: 'Rating', icon: '⭐' },
                      { id: 'time', label: 'Resolution Time', icon: '⏱️' },
                      { id: 'title', label: 'Title', icon: '🔤' }
                    ].map(sort => (
                      <button
                        key={sort.id}
                        onClick={() => {
                          if (solutionSortBy === sort.id) {
                            setSolutionSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSolutionSortBy(sort.id);
                            setSolutionSortOrder('desc');
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 font-semibold ${
                          solutionSortBy === sort.id
                            ? 'bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white shadow-lg'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        <span>{sort.icon}</span>
                        <span>{sort.label}</span>
                        {solutionSortBy === sort.id && (
                          <span className="ml-1">{solutionSortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Solution Cards */}
              <div className="space-y-4">
                {getFilteredAndSortedSolutions().map(token => (
                  <div key={token._id} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-green-500/50 transition-all shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="text-xl font-bold text-white">{token.title}</h4>
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold border border-green-500/50">
                            ✓ RESOLVED
                          </span>
                          {token.feedback?.rating && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold border border-yellow-500/50 flex items-center gap-1">
                              ⭐ {token.feedback.rating}/5
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(token.priority)}`}>
                            {token.priority?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-white/60 mb-3">
                          <span className="bg-white/10 px-2 py-1 rounded">#{token.ticketNumber || token._id.slice(-8)}</span>
                          {token.department && (
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">{token.department.name}</span>
                          )}
                          {token.category && (
                            <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded">{token.category}</span>
                          )}
                          {token.subCategory && (
                            <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">{token.subCategory}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copySolution(token._id, token.solution)}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-lg transition-all text-sm"
                          title="Copy Solution"
                        >
                          {copiedSolutionId === token._id ? '✓ Copied!' : '📋 Copy'}
                        </button>
                        {solutionViewMode === 'compact' && (
                          <button
                            onClick={() => toggleSolutionExpand(token._id)}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-lg transition-all text-sm"
                          >
                            {expandedSolutions[token._id] ? '▲ Collapse' : '▼ Expand'}
                          </button>
                        )}
                      </div>
                    </div>

                    {(solutionViewMode === 'detailed' || expandedSolutions[token._id]) && (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Problem Section */}
                          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-2xl">❗</span>
                              <h5 className="text-lg font-bold text-red-400">Problem</h5>
                            </div>
                            <p className="text-white/90 leading-relaxed mb-3">{token.description}</p>
                            <div className="flex items-center gap-2 text-sm text-white/60">
                              <span>Reported by:</span>
                              <span className="text-white font-semibold">{token.createdBy?.name}</span>
                            </div>
                          </div>

                          {/* Solution Section */}
                          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-2xl">✅</span>
                              <h5 className="text-lg font-bold text-green-400">Solution</h5>
                            </div>
                            <p className="text-white/90 leading-relaxed mb-3">{token.solution}</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-white/60">Solved by:</span>
                                <span className="text-green-400 font-semibold">{token.solvedBy?.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-white/60">Resolution Time:</span>
                                <span className="text-purple-400 font-semibold">
                                  {(() => {
                                    let timeInMs = token.timeToSolve;
                                    if (!timeInMs && token.solvedAt && token.createdAt) {
                                      timeInMs = new Date(token.solvedAt) - new Date(token.createdAt);
                                    }
                                    return timeInMs ? formatTime(timeInMs) : 'N/A';
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-white/60">Resolved:</span>
                                <span className="text-white/80 font-semibold">
                                  {token.solvedAt ? new Date(token.solvedAt).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Feedback if available */}
                        {token.feedback?.rating && (
                          <div className="mt-4 bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">⭐</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-yellow-400 font-bold">{token.feedback.rating}/5</span>
                                  <span className="text-white/60 text-sm">User Rating</span>
                                </div>
                                {token.feedback.comment && (
                                  <p className="text-white/80 text-sm italic">"{token.feedback.comment}"</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {solutionViewMode === 'compact' && !expandedSolutions[token._id] && (
                      <div className="text-white/70 text-sm">
                        <span className="text-white/50">Solution: </span>
                        {token.solution?.slice(0, 150)}{token.solution?.length > 150 ? '...' : ''}
                      </div>
                    )}
                  </div>
                ))}

                {getFilteredAndSortedSolutions().length === 0 && (
                  <div className="text-center py-16 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-2xl font-bold text-white/80 mb-2">No Solutions Found</h3>
                    <p className="text-white/60">Try adjusting your filters or search query</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab - Enhanced */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Admin Performance Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-3xl">👨‍💼</span>
                  Admin Performance Analytics
                </h3>
                <select
                  value={filters.adminPerformance}
                  onChange={(e) => setFilters({ ...filters, adminPerformance: e.target.value })}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                >
                  <option value="all" className="text-gray-900">All Admins</option>
                  <option value="top" className="text-gray-900">Top Performers</option>
                  <option value="active" className="text-gray-900">Active Only</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                        Admin {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('total')}>
                        Total {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('solved')}>
                        Solved {sortConfig.key === 'solved' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('efficiency')}>
                        Efficiency {sortConfig.key === 'efficiency' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('avgTime')}>
                        Avg Time {sortConfig.key === 'avgTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('avgRating')}>
                        Rating {sortConfig.key === 'avgRating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.adminStats.map((stat, idx) => (
                      <tr 
                        key={stat.admin._id}
                        className="border-b border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedAdmin({ ...stat.admin, profile: adminProfiles.find(p => p.user?._id === stat.admin._id) });
                          setShowAdminDetailModal(true);
                        }}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold">
                              {stat.admin.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="text-white font-semibold">{stat.admin.name}</div>
                              <div className="text-white/50 text-xs">{stat.admin.department?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                            {stat.total}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                            {stat.solved}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-white/10 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${stat.efficiency}%` }}
                              ></div>
                            </div>
                            <span className="text-white/80 text-sm font-semibold">{stat.efficiency.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-purple-400 font-semibold">
                            {formatTime(stat.avgTime)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {stat.avgRating > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-yellow-400 font-bold">{stat.avgRating.toFixed(1)}</span>
                              <span className="text-yellow-400">⭐</span>
                            </div>
                          ) : (
                            <span className="text-white/30">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Distribution */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Priority Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'High', value: analytics.priorityDist.high, fill: '#EF4444' },
                    { name: 'Medium', value: analytics.priorityDist.medium, fill: '#FBBF24' },
                    { name: 'Low', value: analytics.priorityDist.low, fill: '#10B981' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#ffffff60" />
                    <YAxis stroke="#ffffff60" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {[0, 1, 2].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#EF4444', '#FBBF24', '#10B981'][index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Efficiency Radar */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📡</span>
                  Department Efficiency Radar
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={analytics.deptPerformance}>
                    <PolarGrid stroke="#ffffff20" />
                    <PolarAngleAxis dataKey="name" stroke="#ffffff60" />
                    <PolarRadiusAxis stroke="#ffffff60" />
                    <Radar name="Efficiency" dataKey="efficiency" stroke="#ED1B2F" fill="#ED1B2F" fillOpacity={0.6} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="text-3xl">🏪</span>
                    Company Directory
                  </h3>
                  <p className="text-white/60 text-sm mt-2">Analytics for all companies using the support system</p>
                </div>
                <button
                  onClick={refreshCompanies}
                  className="px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                >
                  <span className="mr-2">🔄</span>
                  Refresh Analytics
                </button>
              </div>

              {/* Company Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-xl p-4 border border-blue-500/30">
                  <div className="text-blue-400 text-2xl mb-2">🏪</div>
                  <div className="text-2xl font-bold text-white">{companies.length}</div>
                  <div className="text-blue-300/70 text-sm">Total Companies</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-xl p-4 border border-green-500/30">
                  <div className="text-green-400 text-2xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-white">
                    {companies.reduce((sum, c) => sum + c.employeeCount, 0)}
                  </div>
                  <div className="text-green-300/70 text-sm">Total Employees</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-xl p-4 border border-purple-500/30">
                  <div className="text-purple-400 text-2xl mb-2">🎫</div>
                  <div className="text-2xl font-bold text-white">
                    {companies.reduce((sum, c) => sum + c.totalTickets, 0)}
                  </div>
                  <div className="text-purple-300/70 text-sm">Total Tickets</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-xl rounded-xl p-4 border border-yellow-500/30">
                  <div className="text-yellow-400 text-2xl mb-2">⭐</div>
                  <div className="text-2xl font-bold text-white">
                    {companies.length > 0 
                      ? (companies.reduce((sum, c) => sum + c.averageRating, 0) / companies.length).toFixed(1)
                      : '0.0'}
                  </div>
                  <div className="text-yellow-300/70 text-sm">Avg Rating</div>
                </div>
              </div>

              {/* Companies Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Company</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Employees</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Total Tickets</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Resolved</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Avg Support Time</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Avg Rating</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr
                        key={company._id}
                        className="border-b border-white/10 hover:bg-white/5 transition-all"
                      >
                        <td className="py-4 px-4">
                          <div>
                            <div className="text-white font-semibold text-lg">{company.name}</div>
                            <div className="text-white/50 text-xs">{company.domain}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                            {company.employeeCount}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold">
                            {company.totalTickets}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                              {company.resolvedTickets}
                            </span>
                            <span className="text-white/40 text-xs">
                              {company.totalTickets > 0 
                                ? `${((company.resolvedTickets / company.totalTickets) * 100).toFixed(0)}%`
                                : '0%'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-orange-400 font-semibold">
                            {formatTime(company.averageSupportTime)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {company.averageRating > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-yellow-400 font-bold">{company.averageRating.toFixed(1)}</span>
                              <span className="text-yellow-400">⭐</span>
                            </div>
                          ) : (
                            <span className="text-white/30">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => viewCompanyDetails(company._id)}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
                            >
                              👁️ View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {companies.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🏪</div>
                  <h3 className="text-2xl font-bold text-white/80 mb-2">No Companies Found</h3>
                  <p className="text-white/60 mb-4">Click "Refresh Analytics" to analyze companies from user emails</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-3xl">🏢</span>
                  Department Management
                </h3>
                <button
                  onClick={() => {
                    setShowDeptModal(true);
                    setEditingDept(null);
                    setNewDept({ name: '', description: '', categories: [] });
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                >
                  <span className="mr-2">➕</span>
                  New Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => {
                  const depttickets = tickets.filter(t => t.department?._id === dept._id);
                  const solved = depttickets.filter(t => t.status === 'solved').length;

                  return (
                    <div key={dept._id} className="bg-gradient-to-br from-white/5 to-white/10 rounded-xl p-6 border border-white/20 hover:border-[#ED1B2F]/50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-xl mb-2">{dept.name}</h4>
                          <p className="text-white/60 text-sm line-clamp-2">{dept.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingDept(dept);
                              setNewDept({ name: dept.name, description: dept.description || '', categories: dept.categories || [] });
                              setShowDeptModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteDepartment(dept._id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {dept.categories && dept.categories.length > 0 && (
                        <div className="mb-4">
                          <div className="text-white/50 text-xs mb-2">Categories ({dept.categories.length})</div>
                          <div className="flex flex-wrap gap-2">
                            {dept.categories.slice(0, 3).map((cat, idx) => (
                              <span key={idx} className="px-2 py-1 bg-[#455185]/30 text-[#455185] border border-[#455185]/50 rounded-lg text-xs">
                                {cat.name}
                              </span>
                            ))}
                            {dept.categories.length > 3 && (
                              <span className="px-2 py-1 bg-white/10 text-white/60 rounded-lg text-xs">
                                +{dept.categories.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="text-white/50 text-xs">Total</div>
                          <div className="text-white font-bold text-lg">{depttickets.length}</div>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-2">
                          <div className="text-green-400/70 text-xs">Solved</div>
                          <div className="text-green-400 font-bold text-lg">{solved}</div>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all"
                          style={{ width: `${depttickets.length ? (solved / depttickets.length * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="text-3xl">👥</span>
                    Admin Team Management
                  </h3>
                  <p className="text-white/60 text-sm mt-1">Manage admin profiles and monitor performance</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Search admins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  />
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  >
                    <option value="all" className="text-gray-900">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setShowAdminProfileForm(true);
                      setEditingAdmin(false);
                      setNewAdminProfile({ name: '', email: '', password: '', expertise: [], department: '', categories: [], phone: '', employeeId: '' });
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-lg transition-all shadow-lg whitespace-nowrap"
                  >
                    ➕ New Admin
                  </button>
                </div>
              </div>

              {/* Admin Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-xl p-4 border border-blue-500/30">
                  <div className="text-blue-400 text-2xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-white">
                    {adminProfiles.length}
                  </div>
                  <div className="text-blue-300/70 text-sm">Total Admins</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-xl p-4 border border-green-500/30">
                  <div className="text-green-400 text-2xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-white">
                    {analytics?.adminStats.filter(s => s.solved > 0).length || 0}
                  </div>
                  <div className="text-green-300/70 text-sm">Active Admins</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-xl p-4 border border-purple-500/30">
                  <div className="text-purple-400 text-2xl mb-2">⚡</div>
                  <div className="text-2xl font-bold text-white">
                    {analytics?.adminStats.reduce((sum, s) => sum + s.solved, 0) || 0}
                  </div>
                  <div className="text-purple-300/70 text-sm">Total Solved</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 backdrop-blur-xl rounded-xl p-4 border border-yellow-500/30">
                  <div className="text-yellow-400 text-2xl mb-2">⭐</div>
                  <div className="text-2xl font-bold text-white">
                    {(() => {
                      const ticketsWithFeedback = tickets.filter(t => t.feedback?.rating);
                      if (ticketsWithFeedback.length === 0) return '0.0';
                      const totalRating = ticketsWithFeedback.reduce((sum, t) => sum + t.feedback.rating, 0);
                      return (totalRating / ticketsWithFeedback.length).toFixed(1);
                    })()}
                  </div>
                  <div className="text-yellow-300/70 text-sm">Avg Rating</div>
                </div>
              </div>

              {/* Admin Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Admin Name</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Department</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Total tickets</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Solved</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Avg Time</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Rating</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => u.role === 'admin')
                      .filter(u => 
                        (!searchQuery || 
                        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
                        (filters.department === 'all' || u.department?._id === filters.department)
                      )
                      .map(admin => {
                        const admintickets = tickets.filter(t => t.assignedTo?._id === admin._id || t.solvedBy?._id === admin._id);
                        const solvedtickets = admintickets.filter(t => t.status === 'resolved');
                        // Only calculate average for resolved tickets with valid timeToSolve
                        const ticketsWithTime = solvedtickets.filter(t => t.timeToSolve && t.timeToSolve > 0);
                        const ticketsWithRating = admintickets.filter(t => t.feedback?.rating);

                        const avgTime = ticketsWithTime.length > 0 
                          ? ticketsWithTime.reduce((sum, t) => sum + t.timeToSolve, 0) / ticketsWithTime.length 
                          : 0;

                        const avgRating = ticketsWithRating.length > 0
                          ? ticketsWithRating.reduce((sum, t) => sum + t.feedback.rating, 0) / ticketsWithRating.length
                          : 0;

                        const adminProfile = adminProfiles.find(p => p.user?._id === admin._id);

                        return (
                          <tr
                            key={admin._id}
                            className="border-b border-white/10 hover:bg-white/5 transition-all"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold">
                                  {admin.name?.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-white font-semibold">{admin.name}</div>
                                  <div className="text-white/50 text-xs">{admin.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-white/70">{admin.department?.name || 'N/A'}</span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold">
                                {admintickets.length}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                                {solvedtickets.length}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-purple-400 font-semibold text-sm">
                                {avgTime > 0 ? formatTime(avgTime) : '0m'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {avgRating > 0 ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-yellow-400 font-bold">{avgRating.toFixed(1)}</span>
                                  <span className="text-yellow-400">⭐</span>
                                </div>
                              ) : (
                                <span className="text-white/30">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedAdmin({ ...admin, profile: adminProfile });
                                    setShowAdminDetailModal(true);
                                  }}
                                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
                                >
                                  👁️ View
                                </button>
                                <button
                                  onClick={() => {
                                    if (adminProfile) {
                                      setEditingAdmin(adminProfile);
                                      setNewAdminProfile({
                                        name: admin.name,
                                        email: admin.email,
                                        password: '',
                                        expertise: adminProfile.expertise || [],
                                        department: adminProfile.department?._id || '',
                                        categories: adminProfile.categories || [],
                                        phone: adminProfile.phone || '',
                                        employeeId: adminProfile.employeeId || ''
                                      });
                                      setShowAdminProfileForm(true);
                                    }
                                  }}
                                  className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (adminProfile) {
                                      deleteAdminProfile(adminProfile._id);
                                    }
                                  }}
                                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="text-3xl">👤</span>
                    User Management
                  </h3>
                  <p className="text-white/60 text-sm mt-1">Manage regular users, view details, and control access</p>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  />
                </div>
              </div>

              {/* User Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-xl p-4 border border-blue-500/30">
                  <div className="text-blue-400 text-2xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-white">{users.filter(u => u.role === 'user').length}</div>
                  <div className="text-blue-300/70 text-sm">Total Users</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-xl p-4 border border-green-500/30">
                  <div className="text-green-400 text-2xl mb-2">✅</div>
                  <div className="text-2xl font-bold text-white">
                    {users.filter(u => u.role === 'user' && (u.status === 'active' || !u.status)).length}
                  </div>
                  <div className="text-green-300/70 text-sm">Active Users</div>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-xl rounded-xl p-4 border border-red-500/30">
                  <div className="text-red-400 text-2xl mb-2">🚫</div>
                  <div className="text-2xl font-bold text-white">
                    {users.filter(u => u.role === 'user' && u.status === 'suspended').length}
                  </div>
                  <div className="text-red-300/70 text-sm">Suspended</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-xl p-4 border border-purple-500/30">
                  <div className="text-purple-400 text-2xl mb-2">❄️</div>
                  <div className="text-2xl font-bold text-white">
                    {users.filter(u => u.role === 'user' && u.status === 'frozen').length}
                  </div>
                  <div className="text-purple-300/70 text-sm">Frozen</div>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">User</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Department</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Status</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Joined</th>
                      <th className="text-center py-4 px-4 text-white/80 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => u.role === 'user')
                      .filter(u => 
                        !searchQuery || 
                        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(userItem => (
                        <tr
                          key={userItem._id}
                          className="border-b border-white/10 hover:bg-white/5 transition-all"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold">
                                {userItem.name?.charAt(0)}
                              </div>
                              <div>
                                <div className="text-white font-semibold">{userItem.name}</div>
                                <div className="text-white/50 text-xs">{userItem.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-white/70">
                            {userItem.department?.name || <span className="text-white/40">No Department</span>}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              userItem.status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                              userItem.status === 'frozen' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {userItem.status || 'active'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-white/60 text-sm">
                            {new Date(userItem.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setShowUserModal(true);
                                }}
                                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
                              >
                                👁️ View
                              </button>
                              {userItem._id !== user._id && (
                                <>
                                  {(!userItem.status || userItem.status === 'active') ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedUser(userItem);
                                          setStatusAction({ status: 'suspended', reason: '' });
                                          setShowStatusModal(true);
                                        }}
                                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                                      >
                                        🚫 Suspend
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedUser(userItem);
                                          setStatusAction({ status: 'frozen', reason: '' });
                                          setShowStatusModal(true);
                                        }}
                                        className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors"
                                      >
                                        ❄️ Freeze
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedUser(userItem);
                                        setStatusAction({ status: 'active', reason: '' });
                                        setShowStatusModal(true);
                                      }}
                                      className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors"
                                    >
                                      ✅ Activate
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-3xl">🎫</span>
                  All Support Tickets
                </h3>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
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
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  >
                    <option value="all" className="text-gray-900">All Priority</option>
                    <option value="high" className="text-gray-900">High</option>
                    <option value="medium" className="text-gray-900">Medium</option>
                    <option value="low" className="text-gray-900">Low</option>
                  </select>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F]"
                  >
                    <option value="all" className="text-gray-900">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id} className="text-gray-900">{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Ticket</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Creator</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Department</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Status</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Priority</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Assigned To</th>
                      <th className="text-left py-4 px-4 text-white/80 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredticketsList.slice(0, 20).map(token => (
                      <tr
                        key={token._id}
                        onClick={() => {
                          setselectedTicket(token);
                          setShowTokenDetailModal(true);
                        }}
                        className="border-b border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                      >
                        <td className="py-4 px-4">
                          <div>
                            <div className="text-white font-semibold">{token.title}</div>
                            <div className="text-white/40 text-xs font-mono">#{token.ticketNumber || token._id.slice(-8)}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white/80">{token.createdBy?.name}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-white/70">{token.department?.name || 'N/A'}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(token.status)}`}>
                            {token.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            token.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            token.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {token.priority}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {token.assignedTo ? (
                            <div className="text-white/80">{token.assignedTo.name}</div>
                          ) : (
                            <span className="text-white/40">Unassigned</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-white/60 text-sm">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredticketsList.length > 20 && (
                <div className="mt-4 text-center text-white/60">
                  Showing 20 of {filteredticketsList.length} tickets
                </div>
              )}
            </div>
          </div>
        )}

        {/* Department Modal */}
        {showDeptModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeptModal(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">{editingDept ? 'Edit Department' : 'Create Department'}</h3>
                <button onClick={() => setShowDeptModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>
              <form onSubmit={saveDepartment} className="p-6 space-y-4">
                <div>
                  <label className="block text-white/80 mb-2">Name *</label>
                  <input
                    type="text"
                    value={newDept.name}
                    onChange={(e) => setNewDept({...newDept, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#ED1B2F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/80 mb-2">Description</label>
                  <textarea
                    value={newDept.description}
                    onChange={(e) => setNewDept({...newDept, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#ED1B2F]"
                    rows="3"
                  />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white rounded-lg">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Admin Profile Form Modal */}
        {showAdminProfileForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdminProfileForm(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">{editingAdmin ? 'Edit Admin' : 'Create Admin'}</h3>
                <button onClick={() => setShowAdminProfileForm(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>
              <form onSubmit={createAdminProfile} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 mb-2">Name *</label>
                    <input
                      type="text"
                      value={newAdminProfile.name}
                      onChange={(e) => setNewAdminProfile({...newAdminProfile, name: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">Email *</label>
                    <input
                      type="email"
                      value={newAdminProfile.email}
                      onChange={(e) => setNewAdminProfile({...newAdminProfile, email: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      required
                    />
                  </div>
                  {!editingAdmin && (
                    <div>
                      <label className="block text-white/80 mb-2">Password *</label>
                      <input
                        type="password"
                        value={newAdminProfile.password}
                        onChange={(e) => setNewAdminProfile({...newAdminProfile, password: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        required={!editingAdmin}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-white/80 mb-2">Department</label>
                    <select
                      value={newAdminProfile.department}
                      onChange={(e) => setNewAdminProfile({...newAdminProfile, department: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowAdminProfileForm(false)} className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white rounded-lg">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Token Detail Modal */}
        {showTokenDetailModal && selectedTicket && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTokenDetailModal(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">Token Details</h3>
                <button onClick={() => setShowTokenDetailModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-xl font-bold text-white mb-2">{selectedTicket.title}</h4>
                  <p className="text-white/70 mb-4">{selectedTicket.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-white/60">Status:</span> <span className={`ml-2 px-2 py-1 rounded ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span></div>
                    <div><span className="text-white/60">Priority:</span> <span className="text-white ml-2">{selectedTicket.priority}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUserModal(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">User Details</h3>
                <button onClick={() => setShowUserModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-xl font-bold text-white mb-4">{selectedUser.name}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-white/60">Email:</span> <span className="text-white ml-2">{selectedUser.email}</span></div>
                    <div><span className="text-white/60">Status:</span> <span className="text-white ml-2">{selectedUser.status || 'active'}</span></div>
                    <div><span className="text-white/60">Department:</span> <span className="text-white ml-2">{selectedUser.department?.name || 'N/A'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Change Modal */}
        {showStatusModal && selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowStatusModal(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-md w-full border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">Change User Status</h3>
                <button onClick={() => setShowStatusModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-white/80 mb-2">Reason</label>
                  <textarea
                    value={statusAction.reason}
                    onChange={(e) => setStatusAction({...statusAction, reason: e.target.value})}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    rows="3"
                    placeholder="Provide a reason for this action..."
                  />
                </div>
                <button
                  onClick={() => updateUserStatus(selectedUser._id, statusAction.status, statusAction.reason)}
                  className="w-full py-2 bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white rounded-lg"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Company Details Modal */}
        {showCompanyModal && selectedCompany && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCompanyModal(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedCompany.company.name}</h3>
                  <p className="text-white/80 text-sm">{selectedCompany.company.domain}</p>
                </div>
                <button onClick={() => setShowCompanyModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>

              <div className="p-6 space-y-6">
                {/* Company Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Employees</div>
                    <div className="text-2xl font-bold text-white">{selectedCompany.company.employeeCount}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Total Tickets</div>
                    <div className="text-2xl font-bold text-white">{selectedCompany.company.totalTickets}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Resolved</div>
                    <div className="text-2xl font-bold text-green-400">{selectedCompany.company.resolvedTickets}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Pending</div>
                    <div className="text-2xl font-bold text-yellow-400">{selectedCompany.company.pendingTickets}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Avg Support Time</div>
                    <div className="text-lg font-bold text-purple-400">{formatTime(selectedCompany.company.averageSupportTime)}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Total Support Time</div>
                    <div className="text-lg font-bold text-orange-400">{formatTime(selectedCompany.company.totalSupportTime)}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Avg Rating</div>
                    <div className="text-lg font-bold text-yellow-400 flex items-center gap-1">
                      {selectedCompany.company.averageRating.toFixed(1)} ⭐
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Total Feedbacks</div>
                    <div className="text-2xl font-bold text-white">{selectedCompany.company.totalFeedbacks}</div>
                  </div>
                </div>

                {/* Employees List */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Employees ({selectedCompany.employees.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {selectedCompany.employees.map(emp => (
                      <div key={emp._id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold">
                            {emp.name?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-semibold text-sm">{emp.name}</div>
                            <div className="text-white/50 text-xs">{emp.email}</div>
                            <div className="text-white/40 text-xs">{emp.role}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Tickets */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-bold text-white mb-4">Recent Tickets ({selectedCompany.tickets.length})</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedCompany.tickets.slice(0, 10).map(ticket => (
                      <div key={ticket._id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="text-white font-semibold">{ticket.title}</h5>
                            <p className="text-white/60 text-xs">#{ticket.ticketNumber}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/50">
                          <span>👤 {ticket.createdBy?.name}</span>
                          <span>📅 {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          {ticket.department && <span>🏢 {ticket.department.name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Detail Modal */}
        {showAdminDetailModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdminDetailModal(false)}>
            <div className="bg-gradient-to-br from-gray-900 to-[#1a1f3a] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] p-6 flex justify-between items-center z-10">
                <h3 className="text-2xl font-bold text-white">Admin Performance Details</h3>
                <button onClick={() => setShowAdminDetailModal(false)} className="text-white hover:text-gray-200 text-2xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-xl font-bold text-white mb-4">{selectedAdmin.name}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-white/60">Email:</span> <span className="text-white ml-2">{selectedAdmin.email}</span></div>
                    <div><span className="text-white/60">Department:</span> <span className="text-white ml-2">{selectedAdmin.department?.name || 'N/A'}</span></div>
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

export default SuperAdminDashboard;