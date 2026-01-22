// components/super-admin/tabs/CompaniesTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Modal from '../../ui/Modal';
import axios from 'axios';
import { formatTime } from '../../../constants/theme';
import { 
  FaBuilding, 
  FaUsers, 
  FaTicketAlt, 
  FaClock, 
  FaStar, 
  FaSearch,
  FaSync,
  FaEdit,
  FaTrash,
  FaPlus,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaDatabase,
  FaServer,
  FaCertificate,
  FaCalendarAlt,
  FaExclamationTriangle
} from 'react-icons/fa';

const CompaniesTab = () => {
  const { API_URL } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalTickets: 0,
    activeTickets: 0
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedERP, setSelectedERP] = useState('all');
  const [showDetails, setShowDetails] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [erpStats, setERPStats] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    erpDetails: {
      erpName: '',
      sapB1VersionType: '',
      sapB1VersionAndFP: '',
      sapLicenseAMC: '',
      sapSupportAMC: {
        status: '',
        fromDate: '',
        toDate: ''
      },
      sapSupportAMCType: '',
      erpIncidentTypes: []
    }
  });

  // ERP Name options
  const erpOptions = ['SAP B1', 'CREST', 'SFA'];
  
  // SAP B1 Version Type options
  const sapVersionOptions = ['HANA', 'SQL'];
  
  // SAP License AMC options
  const licenseAMCOptions = ['Active', 'Terminated'];
  
  // SAP Support AMC options
  const supportAMCOptions = ['Active', 'Suspended'];
  
  // SAP Support AMC Type options
  const supportAMCTypeOptions = ['Limited', 'Unlimited'];
  
  // ERP Incident Types options
  const incidentTypeOptions = [
    'Functional / Transactional',
    'Technical / Connection',
    'Add-Ons'
  ];

  // Fetch companies from backend with pagination
  const fetchCompaniesData = useCallback(async (manualRefresh = false) => {
    try {
      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      console.log('🔃 Fetching companies data...');

      let companiesResponse;
      let statsResponse;
      
      if (manualRefresh) {
        // Use the refresh endpoint to get updated data
        companiesResponse = await axios.post(
          `${API_URL}/companies/refresh`, 
          {}, 
          config
        );
        console.log('✅ Companies refreshed via backend');
      }

      // Get paginated companies with filters
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        erpName: selectedERP !== 'all' ? selectedERP : undefined,
        search: searchTerm || undefined
      };

      companiesResponse = await axios.get(`${API_URL}/companies`, {
        ...config,
        params
      });

      // Get company statistics
      statsResponse = await axios.get(`${API_URL}/companies/stats/overview`, config);

      const { companies: companiesData, pagination: paginationData } = companiesResponse.data;
      const statsData = statsResponse.data;

      console.log('Companies data received:', companiesData);

      // Transform data for display
      const transformedCompanies = await Promise.all(
        companiesData.map(async (company) => {
          try {
            // Get company details with employees and tickets
            const detailsResponse = await axios.get(
              `${API_URL}/companies/${company._id}`,
              config
            );
            
            const { employees = [], tickets = [], stats: companyStats } = detailsResponse.data;
            
            return {
              id: company._id,
              name: company.name,
              domain: company.domain || '',
              contactPerson: company.contactPerson || '',
              contactEmail: company.contactEmail || '',
              contactPhone: company.contactPhone || '',
              erpDetails: company.erpDetails || {},
              totalUsers: company.employeeCount || employees.length,
              totalTickets: company.totalTickets || tickets.length,
              resolvedTickets: company.resolvedTickets || 
                tickets.filter(t => t.status === 'resolved').length,
              activeTickets: company.pendingTickets || 
                tickets.filter(t => 
                  t.status === 'pending' || 
                  t.status === 'assigned' || 
                  t.status === 'in-progress'
                ).length,
              avgSupportTime: company.averageSupportTime || 0,
              avgRating: company.averageRating || 0,
              status: company.status || 'active',
              employees: employees,
              tickets: tickets,
              isNewCompany: company.createdAt && 
                new Date(company.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              createdAt: company.createdAt,
              lastRefreshed: company.updatedAt,
              createdBy: company.createdBy,
              updatedBy: company.updatedBy
            };
          } catch (error) {
            console.error(`Error fetching details for company ${company.name}:`, error);
            return {
              id: company._id,
              name: company.name,
              domain: company.domain || '',
              contactPerson: company.contactPerson || '',
              contactEmail: company.contactEmail || '',
              contactPhone: company.contactPhone || '',
              erpDetails: company.erpDetails || {},
              totalUsers: company.employeeCount || 0,
              totalTickets: company.totalTickets || 0,
              resolvedTickets: company.resolvedTickets || 0,
              activeTickets: company.pendingTickets || 0,
              avgSupportTime: company.averageSupportTime || 0,
              avgRating: company.averageRating || 0,
              status: company.status || 'active',
              employees: [],
              tickets: [],
              isNewCompany: false,
              createdAt: company.createdAt,
              createdBy: company.createdBy,
              updatedBy: company.updatedBy
            };
          }
        })
      );

      // Sort by total users (descending)
      transformedCompanies.sort((a, b) => b.totalUsers - a.totalUsers);

      setCompanies(transformedCompanies);
      setPagination(paginationData);
      setERPStats(statsData.erpDistribution || {});
      
      // Calculate overall stats
      const totalCompanies = transformedCompanies.length;
      const totalUsers = transformedCompanies.reduce((sum, c) => sum + c.totalUsers, 0);
      const totalTickets = transformedCompanies.reduce((sum, c) => sum + c.totalTickets, 0);
      const activeTickets = transformedCompanies.reduce((sum, c) => sum + c.activeTickets, 0);
      
      setStats({
        totalCompanies: statsData.totalCompanies || totalCompanies,
        totalUsers,
        totalTickets,
        activeTickets
      });

      setLastUpdated(new Date());
      console.log(`✅ Loaded ${totalCompanies} companies with ${totalUsers} users`);

    } catch (err) {
      console.error('❌ Failed to fetch companies data:', err);
      alert(`Failed to load companies: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL, pagination.page, pagination.limit, selectedStatus, selectedERP, searchTerm]);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchCompaniesData();
    
    // Set up auto-refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing companies data...');
      fetchCompaniesData();
    }, 120000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchCompaniesData]);

  // Handle company status update
  const updateCompanyStatus = async (companyId, status, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      await axios.patch(
        `${API_URL}/companies/${companyId}`, 
        { status, statusReason: reason }, 
        config
      );
      
      // Refresh data
      await fetchCompaniesData();
      console.log(`✅ Company ${companyId} status updated to ${status}`);
      alert(`Company status updated to ${status}`);
    } catch (err) {
      console.error('❌ Failed to update company status:', err);
      alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
    }
  };

  // Handle manual refresh
  const handleManualRefresh = async () => {
    console.log('🔃 Manual refresh triggered');
    await fetchCompaniesData(true);
    alert('Companies data refreshed successfully!');
  };

  // Toggle company details
  const toggleCompanyDetails = (companyId) => {
    setShowDetails(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      name: '',
      domain: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      erpDetails: {
        erpName: '',
        sapB1VersionType: '',
        sapB1VersionAndFP: '',
        sapLicenseAMC: '',
        sapSupportAMC: {
          status: '',
          fromDate: '',
          toDate: ''
        },
        sapSupportAMCType: '',
        erpIncidentTypes: []
      }
    });
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      domain: company.domain,
      contactPerson: company.contactPerson || '',
      contactEmail: company.contactEmail || '',
      contactPhone: company.contactPhone || '',
      erpDetails: company.erpDetails || {
        erpName: '',
        sapB1VersionType: '',
        sapB1VersionAndFP: '',
        sapLicenseAMC: '',
        sapSupportAMC: {
          status: '',
          fromDate: '',
          toDate: ''
        },
        sapSupportAMCType: '',
        erpIncidentTypes: []
      }
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (company) => {
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('erpDetails.')) {
      const field = name.split('.')[1];
      if (field === 'sapSupportAMCStatus') {
        setFormData(prev => ({
          ...prev,
          erpDetails: {
            ...prev.erpDetails,
            sapSupportAMC: {
              ...prev.erpDetails.sapSupportAMC,
              status: value
            }
          }
        }));
      } else if (field === 'sapSupportAMCFromDate' || field === 'sapSupportAMCToDate') {
        const dateField = field === 'sapSupportAMCFromDate' ? 'fromDate' : 'toDate';
        setFormData(prev => ({
          ...prev,
          erpDetails: {
            ...prev.erpDetails,
            sapSupportAMC: {
              ...prev.erpDetails.sapSupportAMC,
              [dateField]: value
            }
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          erpDetails: {
            ...prev.erpDetails,
            [field]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle ERP incident types checkbox changes
  const handleIncidentTypeChange = (type) => {
    setFormData(prev => {
      const currentTypes = [...prev.erpDetails.erpIncidentTypes];
      if (currentTypes.includes(type)) {
        return {
          ...prev,
          erpDetails: {
            ...prev.erpDetails,
            erpIncidentTypes: currentTypes.filter(t => t !== type)
          }
        };
      } else {
        return {
          ...prev,
          erpDetails: {
            ...prev.erpDetails,
            erpIncidentTypes: [...currentTypes, type]
          }
        };
      }
    });
  };

  // Create new company
  const handleCreateCompany = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Prepare erpDetails object
      const erpDetails = {
        ...formData.erpDetails,
        sapSupportAMC: formData.erpDetails.sapSupportAMC.status ? {
          status: formData.erpDetails.sapSupportAMC.status,
          fromDate: formData.erpDetails.sapSupportAMC.fromDate || undefined,
          toDate: formData.erpDetails.sapSupportAMC.toDate || undefined
        } : undefined
      };

      // Remove undefined fields
      Object.keys(erpDetails).forEach(key => {
        if (erpDetails[key] === '' || erpDetails[key] === undefined) {
          delete erpDetails[key];
        }
      });

      const companyData = {
        ...formData,
        erpDetails
      };

      await axios.post(`${API_URL}/companies`, companyData, config);
      
      setShowCreateModal(false);
      await fetchCompaniesData();
      alert('Company created successfully!');
    } catch (err) {
      console.error('❌ Failed to create company:', err);
      alert(`Failed to create company: ${err.response?.data?.message || err.message}`);
    }
  };

  // Update company
  const handleUpdateCompany = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Prepare erpDetails object
      const erpDetails = {
        ...formData.erpDetails,
        sapSupportAMC: formData.erpDetails.sapSupportAMC.status ? {
          status: formData.erpDetails.sapSupportAMC.status,
          fromDate: formData.erpDetails.sapSupportAMC.fromDate || undefined,
          toDate: formData.erpDetails.sapSupportAMC.toDate || undefined
        } : undefined
      };

      // Remove undefined fields
      Object.keys(erpDetails).forEach(key => {
        if (erpDetails[key] === '' || erpDetails[key] === undefined) {
          delete erpDetails[key];
        }
      });

      const companyData = {
        ...formData,
        erpDetails
      };

      await axios.put(`${API_URL}/companies/${selectedCompany.id}`, companyData, config);
      
      setShowEditModal(false);
      await fetchCompaniesData();
      alert('Company updated successfully!');
    } catch (err) {
      console.error('❌ Failed to update company:', err);
      alert(`Failed to update company: ${err.response?.data?.message || err.message}`);
    }
  };

  // Delete company
  const handleDeleteCompany = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      await axios.delete(`${API_URL}/companies/${selectedCompany.id}`, config);
      
      setShowDeleteModal(false);
      await fetchCompaniesData();
      alert('Company deleted successfully!');
    } catch (err) {
      console.error('❌ Failed to delete company:', err);
      alert(`Failed to delete company: ${err.response?.data?.message || err.message}`);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'suspended': return 'yellow';
      case 'frozen': return 'red';
      default: return 'gray';
    }
  };

  // Get ERP badge color
  const getERPBadgeColor = (erpName) => {
    switch (erpName) {
      case 'SAP B1': return 'purple';
      case 'CREST': return 'blue';
      case 'SFA': return 'indigo';
      default: return 'gray';
    }
  };

  // Get resolution rate
  const getResolutionRate = (company) => {
    if (company.totalTickets === 0) return 0;
    return Math.round((company.resolvedTickets / company.totalTickets) * 100);
  };

  // Filter companies based on search and status
  const filteredCompanies = companies.filter(company => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.domain && company.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.contactPerson && company.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = selectedStatus === 'all' || 
      company.status === selectedStatus;
    
    // ERP filter
    const matchesERP = selectedERP === 'all' || 
      company.erpDetails?.erpName === selectedERP;
    
    return matchesSearch && matchesStatus && matchesERP;
  });

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Check if SAP Support AMC is expired
  const isSupportAMCExpired = (company) => {
    if (!company.erpDetails?.sapSupportAMC?.toDate) return false;
    const toDate = new Date(company.erpDetails.sapSupportAMC.toDate);
    return toDate < new Date();
  };

  if (loading && companies.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ED1B2F] mb-6"></div>
          <p className="text-white text-lg mb-2">Loading companies data...</p>
          <p className="text-white/60">Fetching company information from server</p>
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
            Company Management
          </h3>
          <p className="text-sm text-white/60 mt-1">
            {filteredCompanies.length} of {companies.length} companies • {stats.totalUsers} users • {stats.totalTickets} tickets
            {lastUpdated && (
              <span className="ml-2">
                (Updated: {lastUpdated.toLocaleTimeString()})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            onClick={openCreateModal}
            className="flex items-center gap-2"
          >
            <FaPlus />
            Add Company
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleManualRefresh}
            className="flex items-center gap-2"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <FaSync className="animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <FaSync />
                Refresh Analytics
              </>
            )}
          </Button>
          <span className="text-xs text-white/40 hidden md:block">
            Auto-refreshes every 2 min
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search companies by name, domain, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
          </div>
        </div>
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="frozen">Frozen</option>
          </select>
        </div>
        <div>
          <select
            value={selectedERP}
            onChange={(e) => setSelectedERP(e.target.value)}
            className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
          >
            <option value="all">All ERP Systems</option>
            {erpOptions.map(erp => (
              <option key={erp} value={erp}>{erp}</option>
            ))}
            <option value="none">No ERP</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ED1B2F]/20 to-[#455185]/20 flex items-center justify-center">
              <FaBuilding className="text-[#ED1B2F]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.totalCompanies}</div>
              <div className="text-sm text-white/60">Total Companies</div>
            </div>
          </div>
          <div className="text-xs text-blue-400 mt-1">
            {companies.filter(c => c.isNewCompany).length} new this week
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
              <FaUsers className="text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{stats.totalUsers}</div>
              <div className="text-sm text-white/60">Total Employees</div>
            </div>
          </div>
          <div className="text-xs text-emerald-400 mt-1">
            Avg: {(stats.totalUsers / stats.totalCompanies || 0).toFixed(1)} per company
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <FaTicketAlt className="text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{stats.totalTickets}</div>
              <div className="text-sm text-white/60">Total Tickets</div>
            </div>
          </div>
          <div className="text-xs text-blue-400 mt-1">
            Avg: {(stats.totalTickets / stats.totalCompanies || 0).toFixed(1)} per company
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ED1B2F]/20 to-red-600/20 flex items-center justify-center">
              <FaExclamationTriangle className="text-[#ED1B2F]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#ED1B2F]">{stats.activeTickets}</div>
              <div className="text-sm text-white/60">Active Tickets</div>
            </div>
          </div>
          <div className="text-xs text-[#ED1B2F] mt-1">
            {((stats.activeTickets / stats.totalTickets) * 100 || 0).toFixed(1)}% of total
          </div>
        </div>
        
        <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
              <FaServer className="text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {Object.keys(erpStats).filter(key => key !== 'Unknown').length}
              </div>
              <div className="text-sm text-white/60">ERP Systems</div>
            </div>
          </div>
          <div className="text-xs text-purple-400 mt-1">
            {erpStats['SAP B1'] || 0} SAP B1 • {erpStats['CREST'] || 0} CREST • {erpStats['SFA'] || 0} SFA
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="p-4">Company Details</th>
              <th className="p-4">ERP System</th>
              <th className="p-4">Employees</th>
              <th className="p-4">Tickets</th>
              <th className="p-4">Resolution</th>
              <th className="p-4">Avg Time</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {filteredCompanies.map((company) => {
              const resolutionRate = getResolutionRate(company);
              const statusColor = getStatusColor(company.status);
              const erpColor = getERPBadgeColor(company.erpDetails?.erpName);
              const isExpired = isSupportAMCExpired(company);
              
              return (
                <React.Fragment key={company.id}>
                  <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                    company.isNewCompany ? 'bg-blue-500/5' : ''
                  }`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ED1B2F]/20 to-[#455185]/20 flex items-center justify-center">
                          <span className="text-lg font-bold">
                            {company.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-lg flex items-center gap-2">
                            {company.name}
                            {company.isNewCompany && (
                              <Badge color="blue" className="text-xs px-2 py-1">
                                🆕 NEW
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-white/60 mt-1 flex flex-col gap-1">
                            <span>{company.domain || 'No domain specified'}</span>
                            {company.contactPerson && (
                              <span>Contact: {company.contactPerson}</span>
                            )}
                            {company.createdAt && (
                              <span>Joined: {new Date(company.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      {company.erpDetails?.erpName ? (
                        <div className="space-y-2">
                          <Badge color={erpColor}>
                            {company.erpDetails.erpName}
                          </Badge>
                          {isExpired && company.erpDetails.sapSupportAMC?.status === 'Active' && (
                            <Badge color="red" className="text-xs px-2 py-1">
                              <FaExclamationTriangle className="inline mr-1" />
                              AMC Expired
                            </Badge>
                          )}
                          <button
                            onClick={() => toggleCompanyDetails(company.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                          >
                            {showDetails[company.id] ? (
                              <>
                                <FaChevronUp /> Hide ERP Details
                              </>
                            ) : (
                              <>
                                <FaChevronDown /> View ERP Details
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-white/40 text-sm">No ERP</span>
                      )}
                    </td>
                    
                    <td className="p-4">
                      <div className="font-bold text-lg">{company.totalUsers}</div>
                      <div className="text-xs text-white/60">
                        {company.employees.length > 0 ? (
                          <button
                            onClick={() => toggleCompanyDetails(company.id)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {showDetails[company.id] ? 'Hide' : 'View'} employees
                          </button>
                        ) : 'No employees'}
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="font-bold text-lg">{company.totalTickets}</div>
                      <div className="text-xs space-y-1 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-emerald-400">{company.resolvedTickets} resolved</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#ED1B2F]"></span>
                          <span className="text-[#ED1B2F]">{company.activeTickets} active</span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className={`text-lg font-bold ${
                        resolutionRate >= 80 
                          ? 'text-emerald-400' 
                          : resolutionRate >= 50 
                          ? 'text-yellow-400' 
                          : 'text-[#ED1B2F]'
                      }`}>
                        {resolutionRate}%
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                        <div 
                          className={`h-full rounded-full ${
                            resolutionRate >= 80 
                              ? 'bg-emerald-500' 
                              : resolutionRate >= 50 
                              ? 'bg-yellow-500' 
                              : 'bg-[#ED1B2F]'
                          }`}
                          style={{ width: `${Math.min(resolutionRate, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="text-lg font-bold text-white">
                        {formatTime(company.avgSupportTime)}
                      </div>
                      <div className="text-xs text-white/60">Average response</div>
                      {company.avgRating > 0 && (
                        <div className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                          <FaStar /> {company.avgRating.toFixed(1)} rating
                        </div>
                      )}
                    </td>
                    
                    <td className="p-4">
                      <Badge color={statusColor}>
                        {company.status}
                      </Badge>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditModal(company)}
                          className="w-full justify-center flex items-center gap-2"
                        >
                          <FaEdit />
                          Edit
                        </Button>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const newStatus = company.status === 'suspended' ? 'active' : 'suspended';
                              const reason = prompt(`Reason for ${newStatus} ${company.name}:`);
                              if (reason !== null) {
                                updateCompanyStatus(company.id, newStatus, reason);
                              }
                            }}
                            className="flex-1 justify-center"
                          >
                            {company.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => openDeleteModal(company)}
                            className="flex-1 justify-center flex items-center gap-1"
                          >
                            <FaTrash />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Details */}
                  {showDetails[company.id] && (
                    <tr className="bg-black/20">
                      <td colSpan="8" className="p-4">
                        <div className="pl-14">
                          {/* ERP Details Section */}
                          {company.erpDetails?.erpName && (
                            <div className="mb-6">
                              <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                <FaDatabase className="text-purple-400" />
                                ERP System Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-white/5 p-4 rounded-lg">
                                  <div className="text-sm text-white/60 mb-1">ERP Name</div>
                                  <div className="font-medium text-white">{company.erpDetails.erpName}</div>
                                </div>
                                
                                {company.erpDetails.erpName === 'SAP B1' && company.erpDetails.sapB1VersionType && (
                                  <div className="bg-white/5 p-4 rounded-lg">
                                    <div className="text-sm text-white/60 mb-1">SAP B1 Version Type</div>
                                    <div className="font-medium text-white">{company.erpDetails.sapB1VersionType}</div>
                                  </div>
                                )}
                                
                                {company.erpDetails.sapB1VersionAndFP && (
                                  <div className="bg-white/5 p-4 rounded-lg">
                                    <div className="text-sm text-white/60 mb-1">SAP Version & FP</div>
                                    <div className="font-medium text-white">{company.erpDetails.sapB1VersionAndFP}</div>
                                  </div>
                                )}
                                
                                {company.erpDetails.sapLicenseAMC && (
                                  <div className="bg-white/5 p-4 rounded-lg">
                                    <div className="text-sm text-white/60 mb-1">SAP License AMC</div>
                                    <div className="font-medium text-white">{company.erpDetails.sapLicenseAMC}</div>
                                  </div>
                                )}
                                
                                {company.erpDetails.sapSupportAMC?.status && (
                                  <div className="bg-white/5 p-4 rounded-lg">
                                    <div className="text-sm text-white/60 mb-1">SAP Support AMC</div>
                                    <div className="font-medium text-white mb-2">{company.erpDetails.sapSupportAMC.status}</div>
                                    {company.erpDetails.sapSupportAMC.status === 'Active' && (
                                      <div className="text-xs text-white/60">
                                        <div>From: {formatDate(company.erpDetails.sapSupportAMC.fromDate)}</div>
                                        <div>To: {formatDate(company.erpDetails.sapSupportAMC.toDate)}</div>
                                        {isExpired && (
                                          <div className="text-red-400 mt-1">
                                            <FaExclamationTriangle className="inline mr-1" />
                                            Support AMC has expired
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {company.erpDetails.sapSupportAMCType && (
                                  <div className="bg-white/5 p-4 rounded-lg">
                                    <div className="text-sm text-white/60 mb-1">Support AMC Type</div>
                                    <div className="font-medium text-white">{company.erpDetails.sapSupportAMCType}</div>
                                  </div>
                                )}
                                
                                {company.erpDetails.erpIncidentTypes?.length > 0 && (
                                  <div className="bg-white/5 p-4 rounded-lg">
                                    <div className="text-sm text-white/60 mb-1">ERP Incident Types</div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {company.erpDetails.erpIncidentTypes.map(type => (
                                        <Badge key={type} color="blue" className="text-xs">
                                          {type}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Employees Section */}
                          {company.employees.length > 0 && (
                            <div className="mb-6">
                              <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                <FaUsers className="text-emerald-400" />
                                Employees ({company.employees.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {company.employees.map(employee => (
                                  <div key={employee._id} className="bg-white/5 p-3 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-xs font-bold">
                                        {employee.name.charAt(0)}
                                      </div>
                                      <div>
                                        <div className="font-medium text-white">{employee.name}</div>
                                        <div className="text-xs text-white/60">{employee.email}</div>
                                        <div className="text-xs mt-1">
                                          <Badge color="gray" className="text-xs">
                                            {employee.role}
                                          </Badge>
                                          {employee.status && employee.status !== 'active' && (
                                            <Badge color="red" className="text-xs ml-1">
                                              {employee.status}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Tickets Section */}
                          {company.tickets.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                                <FaTicketAlt className="text-blue-400" />
                                Recent Tickets ({company.tickets.length})
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-white/50">
                                      <th className="p-2 text-left">Ticket #</th>
                                      <th className="p-2 text-left">Title</th>
                                      <th className="p-2 text-left">Status</th>
                                      <th className="p-2 text-left">Priority</th>
                                      <th className="p-2 text-left">Created</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {company.tickets.slice(0, 5).map(ticket => (
                                      <tr key={ticket._id} className="border-t border-white/5">
                                        <td className="p-2 text-white/70">{ticket.ticketNumber}</td>
                                        <td className="p-2 text-white">{ticket.title}</td>
                                        <td className="p-2">
                                          <Badge color={getStatusColor(ticket.status)}>
                                            {ticket.status}
                                          </Badge>
                                        </td>
                                        <td className="p-2">
                                          <span className={`px-2 py-1 rounded text-xs ${
                                            ticket.priority === 'high' 
                                              ? 'bg-red-500/20 text-red-400'
                                              : ticket.priority === 'medium'
                                              ? 'bg-yellow-500/20 text-yellow-400'
                                              : 'bg-green-500/20 text-green-400'
                                          }`}>
                                            {ticket.priority}
                                          </span>
                                        </td>
                                        <td className="p-2 text-white/60">
                                          {new Date(ticket.createdAt).toLocaleDateString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6 px-4">
            <div className="text-sm text-white/60">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} companies
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <span className="text-white/70 px-3">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {filteredCompanies.length === 0 && (
          <div className="text-center text-white/40 py-16">
            <div className="text-6xl mb-4">🏢</div>
            <p className="text-xl mb-2">No companies found</p>
            <p className="text-white/60 mb-4">
              {searchTerm ? 'Try a different search term' : 
               selectedStatus !== 'all' ? 'Try changing the status filter' :
               'Companies will appear when users register with company names'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setSelectedERP('all');
                }}
              >
                Clear Filters
              </Button>
              <Button 
                variant="primary" 
                onClick={handleManualRefresh}
              >
                Refresh Data
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💡</div>
          <div>
            <h4 className="font-bold text-white text-lg mb-2">How Company Management Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black/20 p-4 rounded-lg">
                <h5 className="font-semibold text-white mb-2">Company Operations</h5>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• Use "Add Company" to create new companies with ERP details</li>
                  <li>• Edit button allows updating company and ERP information</li>
                  <li>• Delete button removes companies (no employees allowed)</li>
                  <li>• Click "View ERP Details" to see comprehensive ERP info</li>
                  <li>• Filter by ERP system to view specific implementations</li>
                </ul>
              </div>
              <div className="bg-black/20 p-4 rounded-lg">
                <h5 className="font-semibold text-white mb-2">ERP System Tracking</h5>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• Track SAP B1, CREST, and SFA implementations</li>
                  <li>• Monitor SAP License and Support AMC status</li>
                  <li>• Set and track support expiration dates</li>
                  <li>• Define allowed ERP incident types per company</li>
                  <li>• Expired AMC notifications are shown in red</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-white/70">
                <strong>Note:</strong> The "Refresh Analytics" button triggers your backend to scan all users 
                and create/update companies based on their <code>companyName</code> field.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Company Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Company"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Domain *
              </label>
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="contact@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                placeholder="+1234567890"
              />
            </div>
          </div>

          {/* ERP Details Section */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <FaDatabase className="text-purple-400" />
              ERP System Details
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  ERP Name
                </label>
                <select
                  name="erpDetails.erpName"
                  value={formData.erpDetails.erpName}
                  onChange={handleInputChange}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                >
                  <option value="">Select ERP System</option>
                  {erpOptions.map(erp => (
                    <option key={erp} value={erp}>{erp}</option>
                  ))}
                </select>
              </div>

              {formData.erpDetails.erpName === 'SAP B1' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        SAP B1 Version Type
                      </label>
                      <select
                        name="erpDetails.sapB1VersionType"
                        value={formData.erpDetails.sapB1VersionType}
                        onChange={handleInputChange}
                        className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                      >
                        <option value="">Select Version Type</option>
                        {sapVersionOptions.map(version => (
                          <option key={version} value={version}>{version}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        SAP Version and FP
                      </label>
                      <input
                        type="text"
                        name="erpDetails.sapB1VersionAndFP"
                        value={formData.erpDetails.sapB1VersionAndFP}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                        placeholder="e.g., 10 FP 2502"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        SAP License AMC
                      </label>
                      <select
                        name="erpDetails.sapLicenseAMC"
                        value={formData.erpDetails.sapLicenseAMC}
                        onChange={handleInputChange}
                        className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                      >
                        <option value="">Select License Status</option>
                        {licenseAMCOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        SAP Support AMC Type
                      </label>
                      <select
                        name="erpDetails.sapSupportAMCType"
                        value={formData.erpDetails.sapSupportAMCType}
                        onChange={handleInputChange}
                        className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                      >
                        <option value="">Select Support Type</option>
                        {supportAMCTypeOptions.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      SAP Support AMC Status
                    </label>
                    <select
                      name="erpDetails.sapSupportAMCStatus"
                      value={formData.erpDetails.sapSupportAMC?.status || ''}
                      onChange={handleInputChange}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                    >
                      <option value="">Select Support Status</option>
                      {supportAMCOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {formData.erpDetails.sapSupportAMC?.status === 'Active' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          From Date *
                        </label>
                        <input
                          type="date"
                          name="erpDetails.sapSupportAMCFromDate"
                          value={formData.erpDetails.sapSupportAMC?.fromDate || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          To Date *
                        </label>
                        <input
                          type="date"
                          name="erpDetails.sapSupportAMCToDate"
                          value={formData.erpDetails.sapSupportAMC?.toDate || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  ERP Incident Types
                </label>
                <div className="space-y-2">
                  {incidentTypeOptions.map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.erpDetails.erpIncidentTypes.includes(type)}
                        onChange={() => handleIncidentTypeChange(type)}
                        className="rounded bg-white/5 border-white/10 text-[#ED1B2F] focus:ring-[#ED1B2F]"
                      />
                      <span className="text-white/90">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
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
            onClick={handleCreateCompany}
            disabled={!formData.name || !formData.domain}
          >
            Create Company
          </Button>
        </div>
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit ${selectedCompany?.name || 'Company'}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Domain *
              </label>
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
              />
            </div>
          </div>

          {/* ERP Details Section - Same structure as create modal */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <FaDatabase className="text-purple-400" />
              ERP System Details
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  ERP Name
                </label>
                <select
                  name="erpDetails.erpName"
                  value={formData.erpDetails.erpName}
                  onChange={handleInputChange}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                >
                  <option value="">Select ERP System</option>
                  {erpOptions.map(erp => (
                    <option key={erp} value={erp}>{erp}</option>
                  ))}
                </select>
              </div>

              {formData.erpDetails.erpName === 'SAP B1' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        SAP B1 Version Type
                      </label>
                      <select
                        name="erpDetails.sapB1VersionType"
                        value={formData.erpDetails.sapB1VersionType}
                        onChange={handleInputChange}
                        className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                      >
                        <option value="">Select Version Type</option>
                        {sapVersionOptions.map(version => (
                          <option key={version} value={version}>{version}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        SAP Version and FP
                      </label>
                      <input
                        type="text"
                        name="erpDetails.sapB1VersionAndFP"
                        value={formData.erpDetails.sapB1VersionAndFP}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                        placeholder="e.g., 10 FP 2502"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        SAP License AMC
                      </label>
                      <select
                        name="erpDetails.sapLicenseAMC"
                        value={formData.erpDetails.sapLicenseAMC}
                        onChange={handleInputChange}
                        className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                      >
                        <option value="">Select License Status</option>
                        {licenseAMCOptions.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        SAP Support AMC Type
                      </label>
                      <select
                        name="erpDetails.sapSupportAMCType"
                        value={formData.erpDetails.sapSupportAMCType}
                        onChange={handleInputChange}
                        className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                      >
                        <option value="">Select Support Type</option>
                        {supportAMCTypeOptions.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      SAP Support AMC Status
                    </label>
                    <select
                      name="erpDetails.sapSupportAMCStatus"
                      value={formData.erpDetails.sapSupportAMC?.status || ''}
                      onChange={handleInputChange}
                      className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                    >
                      <option value="">Select Support Status</option>
                      {supportAMCOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {formData.erpDetails.sapSupportAMC?.status === 'Active' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          From Date *
                        </label>
                        <input
                          type="date"
                          name="erpDetails.sapSupportAMCFromDate"
                          value={formData.erpDetails.sapSupportAMC?.fromDate || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          To Date *
                        </label>
                        <input
                          type="date"
                          name="erpDetails.sapSupportAMCToDate"
                          value={formData.erpDetails.sapSupportAMC?.toDate || ''}
                          onChange={handleInputChange}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  ERP Incident Types
                </label>
                <div className="space-y-2">
                  {incidentTypeOptions.map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.erpDetails.erpIncidentTypes.includes(type)}
                        onChange={() => handleIncidentTypeChange(type)}
                        className="rounded bg-white/5 border-white/10 text-[#ED1B2F] focus:ring-[#ED1B2F]"
                      />
                      <span className="text-white/90">{type}</span>
                    </label>
                  ))}
                </div>
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
            onClick={handleUpdateCompany}
            disabled={!formData.name || !formData.domain}
          >
            Update Company
          </Button>
        </div>
      </Modal>

      {/* Delete Company Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Company"
        size="md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <FaTrash className="text-red-400 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Delete {selectedCompany?.name}?
          </h3>
          <p className="text-white/70 mb-4">
            Are you sure you want to delete this company? This action cannot be undone.
          </p>
          <p className="text-sm text-red-400 mb-6">
            Note: Companies with existing employees cannot be deleted.
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
            onClick={handleDeleteCompany}
          >
            Delete Company
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

export default CompaniesTab;