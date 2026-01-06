// components/super-admin/tabs/CompaniesTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import axios from 'axios';
import { formatTime } from '../../../constants/theme';

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
  const [showDetails, setShowDetails] = useState({});

  // Fetch companies from backend
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

      let companiesData;
      
      if (manualRefresh) {
        // Use the refresh endpoint to get updated data
        const response = await axios.post(
          `${API_URL}/companies/refresh`, 
          {}, 
          config
        );
        companiesData = response.data;
        console.log('✅ Companies refreshed via backend');
      } else {
        // Get existing companies
        const response = await axios.get(`${API_URL}/companies`, config);
        companiesData = response.data;
        console.log('📊 Loaded existing companies');
      }

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
            
            const { employees = [], tickets = [] } = detailsResponse.data;
            
            return {
              id: company._id,
              name: company.name,
              domain: company.domain || '',
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
              lastRefreshed: company.updatedAt
            };
          } catch (error) {
            console.error(`Error fetching details for company ${company.name}:`, error);
            return {
              id: company._id,
              name: company.name,
              domain: company.domain || '',
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
              createdAt: company.createdAt
            };
          }
        })
      );

      // Sort by total users (descending)
      transformedCompanies.sort((a, b) => b.totalUsers - a.totalUsers);

      setCompanies(transformedCompanies);
      
      // Calculate overall stats
      const totalCompanies = transformedCompanies.length;
      const totalUsers = transformedCompanies.reduce((sum, c) => sum + c.totalUsers, 0);
      const totalTickets = transformedCompanies.reduce((sum, c) => sum + c.totalTickets, 0);
      const activeTickets = transformedCompanies.reduce((sum, c) => sum + c.activeTickets, 0);
      
      setStats({
        totalCompanies,
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
  }, [API_URL]);

  // Fetch data on component mount
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

  // Filter companies based on search and status
  const filteredCompanies = companies.filter(company => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.domain && company.domain.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = selectedStatus === 'all' || 
      company.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'suspended': return 'yellow';
      case 'frozen': return 'red';
      case 'pending': return 'blue';
      default: return 'gray';
    }
  };

  // Get resolution rate
  const getResolutionRate = (company) => {
    if (company.totalTickets === 0) return 0;
    return Math.round((company.resolvedTickets / company.totalTickets) * 100);
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
          <h3 className="text-2xl font-bold text-white">Company Directory</h3>
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
            onClick={handleManualRefresh}
            className="flex items-center gap-2"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Refreshing...
              </>
            ) : (
              <>
                <span className="text-lg">🔄</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search companies by name or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
              🔍
            </span>
          </div>
        </div>
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="frozen">Frozen</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-white">{stats.totalCompanies}</div>
          <div className="text-sm text-white/60">Total Companies</div>
          <div className="text-xs text-blue-400 mt-1">
            {companies.filter(c => c.isNewCompany).length} new
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-emerald-400">{stats.totalUsers}</div>
          <div className="text-sm text-white/60">Total Employees</div>
          <div className="text-xs text-emerald-400 mt-1">
            Avg: {(stats.totalUsers / stats.totalCompanies || 0).toFixed(1)} per company
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-blue-400">{stats.totalTickets}</div>
          <div className="text-sm text-white/60">Total Tickets</div>
          <div className="text-xs text-blue-400 mt-1">
            Avg: {(stats.totalTickets / stats.totalCompanies || 0).toFixed(1)} per company
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
          <div className="text-2xl font-bold text-[#ED1B2F]">{stats.activeTickets}</div>
          <div className="text-sm text-white/60">Active Tickets</div>
          <div className="text-xs text-[#ED1B2F] mt-1">
            {((stats.activeTickets / stats.totalTickets) * 100 || 0).toFixed(1)}% of total
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="p-4">Company</th>
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
                          <div className="text-xs text-white/60 mt-1">
                            {company.domain || 'No domain specified'}
                            {company.createdAt && (
                              <span className="ml-2">
                                • Joined: {new Date(company.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
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
                        <div className="text-xs text-yellow-400 mt-1">
                          ⭐ {company.avgRating.toFixed(1)} rating
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
                          onClick={() => {
                            const newStatus = company.status === 'suspended' ? 'active' : 'suspended';
                            const reason = prompt(`Reason for ${newStatus} ${company.name}:`);
                            if (reason !== null) {
                              updateCompanyStatus(company.id, newStatus, reason);
                            }
                          }}
                          className="w-full justify-center"
                        >
                          {company.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => {
                            const newStatus = company.status === 'frozen' ? 'active' : 'frozen';
                            const reason = prompt(`Reason for ${newStatus} ${company.name}:`);
                            if (reason !== null) {
                              updateCompanyStatus(company.id, newStatus, reason);
                            }
                          }}
                          className="w-full justify-center"
                        >
                          {company.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Details */}
                  {showDetails[company.id] && company.employees.length > 0 && (
                    <tr className="bg-black/20">
                      <td colSpan="7" className="p-4">
                        <div className="pl-14">
                          <h4 className="font-bold text-white mb-3">Employees ({company.employees.length})</h4>
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
                          
                          {company.tickets.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-bold text-white mb-3">Recent Tickets ({company.tickets.length})</h4>
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
            <h4 className="font-bold text-white text-lg mb-2">How Company Data Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-black/20 p-4 rounded-lg">
                <h5 className="font-semibold text-white mb-2">Data Source</h5>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• Companies are created from user <code>companyName</code></li>
                  <li>• Click "Refresh Analytics" to sync with user data</li>
                  <li>• Each company shows employees from that company</li>
                  <li>• Tickets are aggregated per company</li>
                </ul>
              </div>
              <div className="bg-black/20 p-4 rounded-lg">
                <h5 className="font-semibold text-white mb-2">Adding Companies</h5>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>1. User registers with <code>companyName</code></li>
                  <li>2. Click "Refresh Analytics" button</li>
                  <li>3. Company appears in the list automatically</li>
                  <li>4. New companies are marked with 🆕 badge</li>
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
    </Card>
  );
};

export default CompaniesTab;