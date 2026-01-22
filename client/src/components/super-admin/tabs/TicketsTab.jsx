import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Modal from '../../ui/Modal';
import { getStatusColor, getPriorityColor } from '../../../constants/theme';
import {
  FaTicketAlt,
  FaSearch,
  FaPlus,
  FaEye,
  FaFilter,
  FaBuilding,
  FaUser,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaPaperclip,
  FaTrash,
  FaUpload,
  FaLayerGroup,
  FaTag,
  FaDownload,
  FaExternalLinkAlt,
  FaSpinner,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaFileWord,
  FaFileExcel,
  FaFileArchive,
  FaEye as FaEyeIcon,
  FaTimes,
  FaFileContract,
  FaArchive,
  FaFolder
} from 'react-icons/fa';
import axios from 'axios';

const TicketsTab = () => {
  const { API_URL } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    company: 'all',
    department: 'all',
    status: 'all',
    priority: 'all'
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTicketDetailModal, setShowTicketDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // New ticket form state
  const [newTicketData, setNewTicketData] = useState({
    companyId: '',
    userId: '',
    departmentId: '',
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    reason: ''
  });

  // File attachments state
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [downloadingAttachments, setDownloadingAttachments] = useState({});

  // Company users state
  const [companyUsers, setCompanyUsers] = useState([]);
  
  // Department categories state
  const [departmentCategories, setDepartmentCategories] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 10;

  // Fetch tickets, companies, and departments
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Fetch tickets
      const ticketsResponse = await axios.get(`${API_URL}/tickets`, config);
      const ticketsData = ticketsResponse.data || [];
      setTickets(ticketsData);

      // Fetch companies
      const companiesResponse = await axios.get(`${API_URL}/companies?limit=100`, config);
      const companiesData = companiesResponse.data.companies || [];
      setCompanies(companiesData);

      // Fetch departments
      const departmentsResponse = await axios.get(`${API_URL}/departments`, config);
      const departmentsData = departmentsResponse.data.departments || departmentsResponse.data || [];
      setDepartments(departmentsData);

      // Calculate stats
      const totalTickets = ticketsData.length;
      const openTickets = ticketsData.filter(t => t.status === 'open' || t.status === 'pending').length;
      const inProgressTickets = ticketsData.filter(t => t.status === 'in-progress' || t.status === 'assigned').length;
      const resolvedTickets = ticketsData.filter(t => t.status === 'resolved' || t.status === 'closed').length;

      setStats({
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users by company
  const fetchCompanyUsers = async (companyId) => {
    if (!companyId) {
      setCompanyUsers([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Find company to get company name
      const selectedCompany = companies.find(c => c._id === companyId);
      if (!selectedCompany) return;

      // Fetch users by company name
      const usersResponse = await axios.get(`${API_URL}/users?companyId=${companyId}`, config);
      const usersData = usersResponse.data.users || [];
      
      // Filter only regular users (not superadmins)
      const regularUsers = usersData.filter(user => user.role === 'user');
      setCompanyUsers(regularUsers);

      // Auto-select first user if available and no user is selected
      if (regularUsers.length > 0 && !newTicketData.userId) {
        setNewTicketData(prev => ({
          ...prev,
          userId: regularUsers[0]._id
        }));
      }

    } catch (error) {
      console.error('Error fetching company users:', error);
      setCompanyUsers([]);
    }
  };

  // Fetch department categories when department is selected
  const fetchDepartmentCategories = async (departmentId) => {
    if (!departmentId) {
      setDepartmentCategories([]);
      setNewTicketData(prev => ({ ...prev, category: '' }));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Fetch department details to get categories
      const departmentResponse = await axios.get(`${API_URL}/departments/${departmentId}`, config);
      const departmentData = departmentResponse.data;
      
      // Check different possible response structures
      let categories = [];
      
      if (departmentData.department && departmentData.department.categories) {
        categories = departmentData.department.categories;
      } else if (departmentData.categories) {
        categories = departmentData.categories;
      } else if (departmentData.data && departmentData.data.categories) {
        categories = departmentData.data.categories;
      } else {
        // Default categories if none specified
        categories = ['Technical Issue', 'Feature Request', 'Billing', 'General Inquiry', 'Bug Report', 'Other'];
      }
      
      setDepartmentCategories(categories);
      
      // Auto-select first category if none selected
      if (categories.length > 0 && !newTicketData.category) {
        setNewTicketData(prev => ({
          ...prev,
          category: categories[0]
        }));
      } else if (categories.length === 0) {
        setNewTicketData(prev => ({ ...prev, category: '' }));
      }

    } catch (error) {
      console.error('Error fetching department categories:', error);
      // Set default categories
      setDepartmentCategories(['Technical Issue', 'Feature Request', 'Billing', 'General Inquiry']);
    }
  };

  // Function to download attachment
  const downloadAttachment = async (ticketId, attachmentId, filename) => {
    try {
      setDownloadingAttachments(prev => ({ ...prev, [attachmentId]: true }));
      
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      };

      const response = await axios.get(
        `${API_URL}/tickets/${ticketId}/attachment/${attachmentId}`,
        config
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download file');
    } finally {
      setDownloadingAttachments(prev => ({ ...prev, [attachmentId]: false }));
    }
  };

  // Function to view attachment in browser
  const viewAttachment = async (ticketId, attachmentId, filename) => {
    try {
      setDownloadingAttachments(prev => ({ ...prev, [attachmentId]: true }));
      
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      };

      const response = await axios.get(
        `${API_URL}/tickets/${ticketId}/view/${attachmentId}`,
        config
      );

      // Create object URL for viewing
      const url = window.URL.createObjectURL(new Blob([response.data]));
      window.open(url, '_blank');
      
    } catch (error) {
      console.error('Error viewing attachment:', error);
      alert('Failed to view file');
    } finally {
      setDownloadingAttachments(prev => ({ ...prev, [attachmentId]: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch users when company changes
  useEffect(() => {
    if (newTicketData.companyId) {
      fetchCompanyUsers(newTicketData.companyId);
    }
  }, [newTicketData.companyId]);

  // Fetch categories when department changes
  useEffect(() => {
    if (newTicketData.departmentId) {
      fetchDepartmentCategories(newTicketData.departmentId);
    }
  }, [newTicketData.departmentId]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery === '' || 
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber?.toString().includes(searchQuery) ||
      ticket.createdBy?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = filters.company === 'all' || 
      (ticket.company && ticket.company._id === filters.company) ||
      ticket.createdBy?.companyName?.toLowerCase().includes(
        companies.find(c => c._id === filters.company)?.name?.toLowerCase() || ''
      );
    
    const matchesDepartment = filters.department === 'all' || 
      (ticket.department && ticket.department._id === filters.department);
    
    const matchesStatus = filters.status === 'all' || 
      ticket.status === filters.status;
    
    const matchesPriority = filters.priority === 'all' || 
      ticket.priority === filters.priority;
    
    return matchesSearch && matchesCompany && matchesDepartment && matchesStatus && matchesPriority;
  });

  // Pagination
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  // Get unique values for filters
  const statuses = [...new Set(tickets.map(t => t.status).filter(Boolean))];
  const priorities = [...new Set(tickets.map(t => t.priority).filter(Boolean))];

  // Handle new ticket form changes
  const handleNewTicketChange = (e) => {
    const { name, value } = e.target;
    setNewTicketData(prev => ({
      ...prev,
      [name]: value
    }));

    // If company changes, reset user selection and fetch new users
    if (name === 'companyId') {
      setNewTicketData(prev => ({
        ...prev,
        companyId: value,
        userId: '' // Reset user selection
      }));
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
                         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'text/plain', 'text/csv', 'application/vnd.ms-excel', 
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         'application/zip', 'application/x-zip-compressed'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} has invalid type. Only images, documents, and archives are allowed.`);
        return false;
      }
      
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      return true;
    });

    // Add valid files to attachments
    const newAttachments = validFiles.map(file => ({
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      id: Date.now() + Math.random().toString(36).substr(2, 9)
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = ''; // Reset file input
  };

  // Remove attachment
  const removeAttachment = (id) => {
    // Revoke object URL for images to prevent memory leaks
    const attachment = attachments.find(a => a.id === id);
    if (attachment && attachment.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Get file icon based on file type
  const getFileIcon = (filename, fileType = '') => {
    const extension = filename.split('.').pop().toLowerCase();
    
    if (fileType.includes('image/')) {
      return <FaFileImage className="text-green-400" />;
    } else if (fileType.includes('pdf') || extension === 'pdf') {
      return <FaFilePdf className="text-red-400" />;
    } else if (fileType.includes('word') || ['doc', 'docx'].includes(extension)) {
      return <FaFileWord className="text-blue-400" />;
    } else if (fileType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(extension)) {
      return <FaFileExcel className="text-green-500" />;
    } else if (fileType.includes('zip') || ['zip', 'rar', '7z'].includes(extension)) {
      return <FaFileArchive className="text-yellow-400" />;
    } else {
      return <FaFileAlt className="text-gray-400" />;
    }
  };

  // Get file icon for supporting documents
  const getSupportingDocIcon = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FaFilePdf className="text-red-400" />;
      case 'doc':
      case 'docx':
        return <FaFileWord className="text-blue-400" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FaFileExcel className="text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FaFileImage className="text-green-400" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <FaFileArchive className="text-yellow-400" />;
      default:
        return <FaFileContract className="text-purple-400" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Create new ticket with attachments
  const handleCreateTicket = async () => {
    try {
      // Validate required fields
      if (!newTicketData.companyId || !newTicketData.userId || 
          !newTicketData.departmentId || !newTicketData.title || 
          !newTicketData.description || !newTicketData.category) {
        alert('Please fill in all required fields: Company, User, Department, Title, Description, and Category');
        return;
      }

      setUploading(true);
      const token = localStorage.getItem('token');
      
      // Prepare form data for file upload
      const formData = new FormData();
      
      // Add text fields with correct field names for API
      formData.append('title', newTicketData.title);
      formData.append('description', newTicketData.description);
      formData.append('priority', newTicketData.priority || 'medium');
      formData.append('category', newTicketData.category);
      formData.append('reason', newTicketData.reason || '');
      
      // Map departmentId to department for API
      formData.append('department', newTicketData.departmentId);
      
      // Add user as createdBy
      formData.append('createdBy', newTicketData.userId);

      // Add attachments
      attachments.forEach((attachment) => {
        formData.append('attachments', attachment.file);
      });

      const config = { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        } 
      };

      const response = await axios.post(`${API_URL}/tickets`, formData, config);
      
      if (response.data) {
        setShowCreateModal(false);
        // Reset form
        setNewTicketData({
          companyId: '',
          userId: '',
          departmentId: '',
          title: '',
          description: '',
          priority: 'medium',
          category: '',
          reason: ''
        });
        setAttachments([]);
        setCompanyUsers([]);
        setDepartmentCategories([]);
        
        // Refresh data
        await fetchData();
        alert('Ticket created successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to create ticket');
      }

    } catch (error) {
      console.error('Error creating ticket:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message;
      
      // Show specific error messages
      if (errorMessage.includes('Department is required')) {
        alert('ERROR: Department is required. Please select a department from the dropdown.');
      } else if (errorMessage.includes('Title is required')) {
        alert('ERROR: Title is required. Please enter a title for the ticket.');
      } else if (errorMessage.includes('Description is required')) {
        alert('ERROR: Description is required. Please enter a description for the ticket.');
      } else {
        alert(`Failed to create ticket: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  };

  // View ticket details
  const viewTicketDetails = async (ticket) => {
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Fetch full ticket details with attachments
      const response = await axios.get(`${API_URL}/tickets/${ticket._id}`, config);
      setSelectedTicket(response.data);
      setShowTicketDetailModal(true);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      alert('Failed to load ticket details');
    }
  };

  // Delete attachment
  const deleteAttachment = async (ticketId, attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      await axios.delete(`${API_URL}/tickets/${ticketId}/attachment/${attachmentId}`, config);
      
      // Refresh ticket data
      const response = await axios.get(`${API_URL}/tickets/${ticketId}`, config);
      setSelectedTicket(response.data);
      
      alert('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment');
    }
  };

  // Delete supporting document
  const deleteSupportingDocument = async (ticketId, docId) => {
    if (!window.confirm('Are you sure you want to delete this supporting document?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Note: You might need to create a separate endpoint for supporting docs
      // For now, using the same endpoint as regular attachments
      await axios.delete(`${API_URL}/tickets/${ticketId}/attachment/${docId}`, config);
      
      // Refresh ticket data
      const response = await axios.get(`${API_URL}/tickets/${ticketId}`, config);
      setSelectedTicket(response.data);
      
      alert('Supporting document deleted successfully');
    } catch (error) {
      console.error('Error deleting supporting document:', error);
      alert('Failed to delete supporting document');
    }
  };

  // Add more attachments to existing ticket
  const addMoreAttachments = async (ticketId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.zip,.rar';
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('attachments', file);
      });

      try {
        const token = localStorage.getItem('token');
        const config = { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        };

        await axios.post(`${API_URL}/tickets/${ticketId}/attachments`, formData, config);
        
        // Refresh ticket data
        const response = await axios.get(`${API_URL}/tickets/${ticketId}`, config);
        setSelectedTicket(response.data);
        
        alert('Attachments added successfully');
      } catch (error) {
        console.error('Error adding attachments:', error);
        alert('Failed to add attachments');
      }
    };
    
    input.click();
  };

  if (loading && tickets.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ED1B2F] mb-6"></div>
          <p className="text-white text-lg mb-2">Loading tickets...</p>
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
            <FaTicketAlt className="text-[#ED1B2F]" />
            Support Tickets
          </h3>
          <p className="text-sm text-white/60 mt-1">
            {filteredTickets.length} of {stats.totalTickets} tickets • {stats.openTickets} open • {stats.inProgressTickets} in progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <FaPlus />
            New Ticket
          </Button>
          <Button 
            variant="secondary" 
            onClick={fetchData}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <FaFilter className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tickets by title, ticket number, or description..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
          </div>
        </div>
        
        <div>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
            value={filters.company}
            onChange={(e) => setFilters({...filters, company: e.target.value})}
            style={{
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <option value="all" className="bg-gray-900 text-white">All Companies</option>
            {companies.map(company => (
              <option 
                key={company._id} 
                value={company._id}
                className="bg-gray-900 text-white"
              >
                {company.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
            value={filters.department}
            onChange={(e) => setFilters({...filters, department: e.target.value})}
            style={{
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <option value="all" className="bg-gray-900 text-white">All Departments</option>
            {departments.map(dept => (
              <option 
                key={dept._id} 
                value={dept._id}
                className="bg-gray-900 text-white"
              >
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <select
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            style={{
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <option value="all" className="bg-gray-900 text-white">All Status</option>
            {statuses.map(status => (
              <option 
                key={status} 
                value={status}
                className="bg-gray-900 text-white"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
            value={filters.priority}
            onChange={(e) => setFilters({...filters, priority: e.target.value})}
            style={{
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <option value="all" className="bg-gray-900 text-white">All Priorities</option>
            {priorities.map(priority => (
              <option 
                key={priority} 
                value={priority}
                className="bg-gray-900 text-white"
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-white">{stats.totalTickets}</div>
          <div className="text-sm text-white/60">Total Tickets</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-yellow-400">{stats.openTickets}</div>
          <div className="text-sm text-white/60">Open</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-blue-400">{stats.inProgressTickets}</div>
          <div className="text-sm text-white/60">In Progress</div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-emerald-400">{stats.resolvedTickets}</div>
          <div className="text-sm text-white/60">Resolved</div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="p-4">Ticket Details</th>
              <th className="p-4">Company & Department</th>
              <th className="p-4">Status & Priority</th>
              <th className="p-4">Created</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {currentTickets.length > 0 ? currentTickets.map(ticket => {
              const statusColor = getStatusColor(ticket.status);
              const priorityColor = getPriorityColor(ticket.priority);
              
              return (
                <tr key={ticket._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div 
                      className="font-bold text-lg hover:text-[#ED1B2F] transition-colors cursor-pointer"
                      onClick={() => viewTicketDetails(ticket)}
                    >
                      {ticket.title || 'Untitled Ticket'}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      #{ticket.ticketNumber || ticket._id?.slice(-6)} • 
                      Created by: {ticket.createdBy?.name || 'Unknown'}
                      {ticket.category && ` • ${ticket.category}`}
                    </div>
                    {ticket.description && (
                      <div className="text-sm text-white/70 mt-2 line-clamp-2">
                        {ticket.description.length > 100 
                          ? `${ticket.description.substring(0, 100)}...` 
                          : ticket.description}
                      </div>
                    )}
                    {ticket.attachmentCount > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
                        <FaPaperclip size={10} />
                        {ticket.attachmentCount} attachment{ticket.attachmentCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  
                  <td className="p-4">
                    <div className="space-y-2">
                      {ticket.company && (
                        <div className="flex items-center gap-2">
                          <FaBuilding className="text-blue-400" size={14} />
                          <span className="font-medium">{ticket.company.name || 'Unknown Company'}</span>
                        </div>
                      )}
                      {ticket.department && (
                        <div className="flex items-center gap-2">
                          <FaLayerGroup className="text-purple-400" size={14} />
                          <span className="text-sm text-white/70">{ticket.department.name}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="space-y-2">
                      <Badge color={statusColor}>
                        {ticket.status || 'pending'}
                      </Badge>
                      <Badge color={priorityColor}>
                        {ticket.priority || 'medium'}
                      </Badge>
                      {ticket.category && (
                        <div className="text-xs text-white/60 mt-1">
                          <FaTag className="inline mr-1" size={10} />
                          {ticket.category}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="text-sm text-white/60">
                      <FaCalendarAlt className="inline mr-1" size={12} />
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                    {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                      <div className="text-xs text-white/40 mt-1">
                        Updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewTicketDetails(ticket)}
                      className="flex items-center gap-2"
                    >
                      <FaEye />
                      View
                    </Button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-white/40">
                  <div className="text-6xl mb-4">🎫</div>
                  <p className="text-xl mb-2">No tickets found</p>
                  <p className="text-white/60 mb-4">
                    {searchQuery ? 'Try a different search term' : 
                     filters.status !== 'all' ? 'Try changing the status filter' :
                     filters.company !== 'all' ? 'Try changing the company filter' :
                     'Click "New Ticket" to create your first ticket'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setSearchQuery('');
                        setFilters({ company: 'all', department: 'all', status: 'all', priority: 'all' });
                      }}
                    >
                      Clear Filters
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => setShowCreateModal(true)}
                    >
                      <FaPlus className="mr-2" />
                      New Ticket
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10">
          <div className="text-sm text-white/60">
            Showing {indexOfFirstTicket + 1} to {Math.min(indexOfLastTicket, filteredTickets.length)} of {filteredTickets.length} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </Button>
            
            <span className="text-white/70 px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Create New Ticket Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Ticket"
        size="xl"
      >
        <div className="space-y-4">
          {/* Company and User Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Company *
              </label>
              <select
                name="companyId"
                value={newTicketData.companyId}
                onChange={handleNewTicketChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
                required
                style={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <option value="" className="bg-gray-900 text-white">Select Company</option>
                {companies.map(company => (
                  <option 
                    key={company._id} 
                    value={company._id}
                    className="bg-gray-900 text-white"
                  >
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                User *
              </label>
              <select
                name="userId"
                value={newTicketData.userId}
                onChange={handleNewTicketChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
                required
                disabled={!newTicketData.companyId || companyUsers.length === 0}
                style={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <option value="" className="bg-gray-900 text-white">
                  {!newTicketData.companyId 
                    ? 'Select company first' 
                    : companyUsers.length === 0 
                    ? 'No users found in this company'
                    : 'Select User'}
                </option>
                {companyUsers.map(user => (
                  <option 
                    key={user._id} 
                    value={user._id}
                    className="bg-gray-900 text-white"
                  >
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Department *
              </label>
              <select
                name="departmentId"
                value={newTicketData.departmentId}
                onChange={handleNewTicketChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
                required
                style={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <option value="" className="bg-gray-900 text-white">Select Department</option>
                {departments.map(dept => (
                  <option 
                    key={dept._id} 
                    value={dept._id}
                    className="bg-gray-900 text-white"
                  >
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={newTicketData.category}
                onChange={handleNewTicketChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
                required
                disabled={!newTicketData.departmentId || departmentCategories.length === 0}
                style={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <option value="" className="bg-gray-900 text-white">
                  {!newTicketData.departmentId 
                    ? 'Select department first' 
                    : 'Select Category'}
                </option>
                {departmentCategories.map((cat, index) => (
                  <option 
                    key={index} 
                    value={cat}
                    className="bg-gray-900 text-white"
                  >
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority and Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={newTicketData.priority}
                onChange={handleNewTicketChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent appearance-none"
                style={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <option value="low" className="bg-gray-900 text-white">Low</option>
                <option value="medium" className="bg-gray-900 text-white">Medium</option>
                <option value="high" className="bg-gray-900 text-white">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Reason (Optional)
              </label>
              <input
                type="text"
                name="reason"
                value={newTicketData.reason}
                onChange={handleNewTicketChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="Brief reason for the ticket"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={newTicketData.title}
              onChange={handleNewTicketChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              placeholder="Brief description of the issue"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={newTicketData.description}
              onChange={handleNewTicketChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent min-h-[120px]"
              placeholder="Detailed description of the issue, steps to reproduce, etc."
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:border-[#ED1B2F]/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.zip,.rar"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center gap-2">
                  <FaUpload className="text-3xl text-white/50" />
                  <p className="text-white/70">Click to upload files or drag and drop</p>
                  <p className="text-xs text-white/40">Images, documents, and archives up to 10MB</p>
                </div>
              </label>
            </div>

            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-white/70">Selected files ({attachments.length}):</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getFileIcon(attachment.name, attachment.type)}
                        <div>
                          <p className="text-white text-sm truncate max-w-xs">{attachment.name}</p>
                          <p className="text-xs text-white/40">{formatFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <div className="text-xs text-white/40">
            * Required fields
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTicket}
              disabled={uploading || !newTicketData.companyId || !newTicketData.userId || 
                       !newTicketData.departmentId || !newTicketData.title || 
                       !newTicketData.description || !newTicketData.category}
            >
              {uploading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Creating...
                </>
              ) : 'Create Ticket'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={showTicketDetailModal}
        onClose={() => setShowTicketDetailModal(false)}
        title={`Ticket #${selectedTicket?.ticketNumber || selectedTicket?._id?.slice(-6)}`}
        size="xl"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-bold text-white mb-2">{selectedTicket.title}</h4>
                <div className="text-sm text-white/70">
                  Created by: {selectedTicket.createdBy?.name || 'Unknown'}
                  {selectedTicket.createdBy?.companyName && ` • ${selectedTicket.createdBy.companyName}`}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge color={getStatusColor(selectedTicket.status)}>
                  {selectedTicket.status}
                </Badge>
                <Badge color={getPriorityColor(selectedTicket.priority)}>
                  {selectedTicket.priority}
                </Badge>
                {selectedTicket.category && (
                  <Badge color="blue">{selectedTicket.category}</Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h5 className="font-bold text-white mb-2">Description</h5>
              <div className="bg-white/5 p-4 rounded-lg text-white/80 whitespace-pre-wrap">
                {selectedTicket.description || 'No description provided.'}
              </div>
              {selectedTicket.reason && (
                <div className="mt-2 text-sm text-white/60">
                  <span className="font-medium">Reason:</span> {selectedTicket.reason}
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <h6 className="font-bold text-white/70 text-sm mb-2">Company</h6>
                <div className="text-white flex items-center gap-2">
                  <FaBuilding />
                  {selectedTicket.company?.name || selectedTicket.createdBy?.companyName || 'No company'}
                </div>
              </div>
              
              <div className="bg-white/5 p-4 rounded-lg">
                <h6 className="font-bold text-white/70 text-sm mb-2">Department</h6>
                <div className="text-white flex items-center gap-2">
                  <FaLayerGroup />
                  {selectedTicket.department?.name || 'No department'}
                </div>
              </div>
              
              <div className="bg-white/5 p-4 rounded-lg">
                <h6 className="font-bold text-white/70 text-sm mb-2">Created</h6>
                <div className="text-white flex items-center gap-2">
                  <FaCalendarAlt />
                  {new Date(selectedTicket.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Main Attachments Section */}
            {(selectedTicket.attachments && selectedTicket.attachments.length > 0) && (
              <div>
                <h5 className="font-bold text-white mb-2">Attachments ({selectedTicket.attachments?.length || 0})</h5>
                
                <div className="space-y-3">
                  {selectedTicket.attachments.map((attachment) => (
                    <div key={attachment._id} className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {getFileIcon(attachment.originalName || attachment.filename, attachment.mimeType || '')}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">
                              {attachment.originalName || attachment.filename}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                              <span>Uploaded: {new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                              {attachment.size && <span>• {formatFileSize(attachment.size)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewAttachment(selectedTicket._id, attachment._id, attachment.originalName || attachment.filename)}
                            disabled={downloadingAttachments[attachment._id]}
                            className="flex items-center gap-1"
                            title="View in browser"
                          >
                            {downloadingAttachments[attachment._id] ? (
                              <FaSpinner className="animate-spin" size={12} />
                            ) : (
                              <FaEyeIcon size={12} />
                            )}
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadAttachment(selectedTicket._id, attachment._id, attachment.originalName || attachment.filename)}
                            disabled={downloadingAttachments[attachment._id]}
                            className="flex items-center gap-1"
                            title="Download file"
                          >
                            {downloadingAttachments[attachment._id] ? (
                              <FaSpinner className="animate-spin" size={12} />
                            ) : (
                              <FaDownload size={12} />
                            )}
                            Download
                          </Button>
                          <button
                            onClick={() => deleteAttachment(selectedTicket._id, attachment._id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Delete attachment"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supporting Documents Section */}
            {(selectedTicket.supportingDocuments && selectedTicket.supportingDocuments.length > 0) && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-bold text-white flex items-center gap-2">
                    <FaFileContract className="text-purple-400" />
                    Supporting Documents ({selectedTicket.supportingDocuments.length})
                  </h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addMoreAttachments(selectedTicket._id)}
                    className="flex items-center gap-2"
                  >
                    <FaUpload size={12} />
                    Add More
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {selectedTicket.supportingDocuments.map((doc) => (
                    <div key={doc._id} className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {getSupportingDocIcon(doc.originalName || doc.filename)}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">
                              {doc.originalName || doc.filename}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                              <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                              {doc.size && <span>• {formatFileSize(doc.size)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewAttachment(selectedTicket._id, doc._id, doc.originalName || doc.filename)}
                            disabled={downloadingAttachments[doc._id]}
                            className="flex items-center gap-1"
                            title="View in browser"
                          >
                            {downloadingAttachments[doc._id] ? (
                              <FaSpinner className="animate-spin" size={12} />
                            ) : (
                              <FaEyeIcon size={12} />
                            )}
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadAttachment(selectedTicket._id, doc._id, doc.originalName || doc.filename)}
                            disabled={downloadingAttachments[doc._id]}
                            className="flex items-center gap-1"
                            title="Download file"
                          >
                            {downloadingAttachments[doc._id] ? (
                              <FaSpinner className="animate-spin" size={12} />
                            ) : (
                              <FaDownload size={12} />
                            )}
                            Download
                          </Button>
                          <button
                            onClick={() => deleteSupportingDocument(selectedTicket._id, doc._id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Delete document"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Combined Empty State */}
            {(!selectedTicket.attachments || selectedTicket.attachments.length === 0) && 
             (!selectedTicket.supportingDocuments || selectedTicket.supportingDocuments.length === 0) && (
              <div className="bg-white/5 p-6 rounded-lg text-center">
                <FaPaperclip className="text-3xl text-white/30 mx-auto mb-3" />
                <p className="text-white/60">No attachments or supporting documents</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addMoreAttachments(selectedTicket._id)}
                  className="mt-3"
                >
                  <FaUpload className="mr-2" />
                  Upload Files
                </Button>
              </div>
            )}

            {/* Time Tracking */}
            {selectedTicket.timeToSolve && (
              <div className="bg-white/5 p-4 rounded-lg">
                <h5 className="font-bold text-white mb-2">Time to Resolution</h5>
                <div className="text-white flex items-center gap-2">
                  <FaClock />
                  {Math.round(selectedTicket.timeToSolve / 60000)} minutes
                </div>
              </div>
            )}

            {/* Solution */}
            {selectedTicket.solution && (
              <div>
                <h5 className="font-bold text-white mb-2">Solution</h5>
                <div className="bg-white/5 p-4 rounded-lg text-white/80">
                  {selectedTicket.solution}
                </div>
              </div>
            )}

            {/* Feedback */}
            {selectedTicket.feedback && (
              <div className="bg-white/5 p-4 rounded-lg">
                <h5 className="font-bold text-white mb-2">User Feedback</h5>
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedTicket.feedback.rating >= 4 ? (
                      <FaCheckCircle className="text-emerald-400" />
                    ) : selectedTicket.feedback.rating >= 3 ? (
                      <FaExclamationTriangle className="text-yellow-400" />
                    ) : (
                      <FaTimesCircle className="text-red-400" />
                    )}
                    <span className="font-medium">Rating: {selectedTicket.feedback.rating}/5</span>
                  </div>
                  {selectedTicket.feedback.comment && (
                    <div className="text-white/70 text-sm mt-2 p-3 bg-black/20 rounded">
                      "{selectedTicket.feedback.comment}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="primary"
            onClick={() => setShowTicketDetailModal(false)}
          >
            Close
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

export default TicketsTab;