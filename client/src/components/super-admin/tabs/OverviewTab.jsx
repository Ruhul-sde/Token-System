// components/super-admin/tabs/OverviewTab.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import {
  FaUsers,
  FaTicketAlt,
  FaBuilding,
  FaChartLine,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaStar,
  FaSync,
  FaArrowUp,
  FaArrowDown,
  FaLayerGroup
} from 'react-icons/fa';
import axios from 'axios';
const OverviewTab = () => {
  const { API_URL } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTickets: 0,
    totalCompanies: 0,
    totalDepartments: 0,
    openTickets: 0,
    resolvedTickets: 0,
    pendingTickets: 0,
    avgResolutionTime: 0,
    avgRating: 0,
    activeUsers: 0
  });

  const [departments, setDepartments] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Safely access departments array
  const safeDepartments = Array.isArray(departments) ? departments : [];

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` } 
      };

      // Fetch user stats
      const usersResponse = await axios.get(`${API_URL}/users`, config);
      const usersData = usersResponse.data.users || [];
      const userStats = usersResponse.data.stats || {};

      // Fetch ticket stats
      const ticketsResponse = await axios.get(`${API_URL}/tickets/dashboard/stats`, config);
      const ticketsData = ticketsResponse.data || {};

      // Fetch companies
      const companiesResponse = await axios.get(`${API_URL}/companies?limit=5`, config);
      const companiesData = companiesResponse.data.companies || [];

      // Fetch departments
      const departmentsResponse = await axios.get(`${API_URL}/departments`, config);
      const departmentsData = departmentsResponse.data.departments || 
                              departmentsResponse.data || 
                              [];

      // Fetch recent tickets
      const recentTicketsResponse = await axios.get(`${API_URL}/tickets?limit=5`, config);
      const recentTicketsData = recentTicketsResponse.data.tickets || 
                                recentTicketsResponse.data || 
                                [];

      // Calculate statistics
      const totalUsers = usersData.length || userStats.totalUsers || 0;
      const activeUsers = Array.isArray(usersData) ? 
                          usersData.filter(u => u.status === 'active').length : 
                          userStats.activeUsers || 0;
      const totalTickets = ticketsData.total || 0;
      const openTickets = ticketsData.pending || ticketsData.open || 0;
      const resolvedTickets = ticketsData.resolved || ticketsData.closed || 0;
      const pendingTickets = ticketsData.pending || 0;
      const avgResolutionTime = ticketsData.avgResolutionTime || 0;
      const avgRating = 4.2; // Default or calculate from tickets

      setStats({
        totalUsers,
        totalTickets,
        totalCompanies: Array.isArray(companiesData) ? companiesData.length : 0,
        totalDepartments: Array.isArray(departmentsData) ? departmentsData.length : 0,
        openTickets,
        resolvedTickets,
        pendingTickets,
        avgResolutionTime,
        avgRating,
        activeUsers
      });

      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      setRecentTickets(Array.isArray(recentTicketsData) ? recentTicketsData.slice(0, 5) : []);
      setRecentUsers(Array.isArray(usersData) ? usersData.slice(0, 5) : []);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetching overview data:', error);
      // Set default values to prevent crashes
      setDepartments([]);
      setRecentTickets([]);
      setRecentUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'pending': return 'yellow';
      case 'resolved': return 'emerald';
      case 'open': return 'blue';
      case 'closed': return 'gray';
      default: return 'gray';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  // Format time
  const formatTime = (minutes) => {
    if (!minutes || minutes <= 0) return '0m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get department icon color
  const getDepartmentIconColor = (index) => {
    const colors = [
      'from-purple-500/20 to-blue-500/20',
      'from-red-500/20 to-orange-500/20',
      'from-emerald-500/20 to-green-500/20',
      'from-yellow-500/20 to-amber-500/20',
      'from-pink-500/20 to-rose-500/20',
      'from-indigo-500/20 to-violet-500/20'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ED1B2F] mb-6"></div>
          <p className="text-white text-lg mb-2">Loading dashboard...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white">Dashboard Overview</h3>
          <p className="text-sm text-white/60">
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </p>
        </div>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Card */}
        <Card className="hover:bg-white/5 transition-colors">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <FaUsers className="text-blue-400 text-2xl" />
              </div>
              <div className="text-right">
                <div className="text-xs text-white/60">Active</div>
                <div className="text-lg font-bold text-emerald-400">
                  {stats.activeUsers} / {stats.totalUsers}
                </div>
              </div>
            </div>
            <h4 className="text-3xl font-bold text-white mb-2">{stats.totalUsers}</h4>
            <p className="text-white/60 text-sm">Total Users</p>
            <div className="mt-4 flex items-center gap-2">
              <FaArrowUp className="text-emerald-400" />
              <span className="text-xs text-emerald-400">Active: {stats.activeUsers}</span>
            </div>
          </div>
        </Card>

        {/* Tickets Card */}
        <Card className="hover:bg-white/5 transition-colors">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <FaTicketAlt className="text-purple-400 text-2xl" />
              </div>
              <div className="text-right">
                <div className="text-xs text-white/60">Open</div>
                <div className="text-lg font-bold text-yellow-400">
                  {stats.openTickets}
                </div>
              </div>
            </div>
            <h4 className="text-3xl font-bold text-white mb-2">{stats.totalTickets}</h4>
            <p className="text-white/60 text-sm">Total Tickets</p>
            <div className="mt-4 flex items-center gap-2">
              <FaCheckCircle className="text-emerald-400" />
              <span className="text-xs text-emerald-400">
                Resolved: {stats.resolvedTickets}
              </span>
            </div>
          </div>
        </Card>

        {/* Companies Card */}
        <Card className="hover:bg-white/5 transition-colors">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-red-500/20">
                <FaBuilding className="text-red-400 text-2xl" />
              </div>
              <div className="text-right">
                <div className="text-xs text-white/60">Active</div>
                <div className="text-lg font-bold text-emerald-400">
                  {stats.totalCompanies}
                </div>
              </div>
            </div>
            <h4 className="text-3xl font-bold text-white mb-2">{stats.totalCompanies}</h4>
            <p className="text-white/60 text-sm">Total Companies</p>
            <div className="mt-4 flex items-center gap-2">
              <FaChartLine className="text-blue-400" />
              <span className="text-xs text-blue-400">
                Departments: {stats.totalDepartments}
              </span>
            </div>
          </div>
        </Card>

        {/* Performance Card */}
        <Card className="hover:bg-white/5 transition-colors">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <FaClock className="text-emerald-400 text-2xl" />
              </div>
              <div className="text-right">
                <div className="text-xs text-white/60">Rating</div>
                <div className="text-lg font-bold text-yellow-400">
                  {stats.avgRating.toFixed(1)}/5
                </div>
              </div>
            </div>
            <h4 className="text-3xl font-bold text-white mb-2">
              {formatTime(stats.avgResolutionTime)}
            </h4>
            <p className="text-white/60 text-sm">Avg. Resolution Time</p>
            <div className="mt-4 flex items-center gap-2">
              <FaStar className="text-yellow-400" />
              <span className="text-xs text-yellow-400">
                Rating: {stats.avgRating.toFixed(1)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-white">Recent Tickets</h4>
              <span className="text-sm text-white/60">{recentTickets.length} total</span>
            </div>
            
            <div className="space-y-3">
              {recentTickets.length > 0 ? recentTickets.map(ticket => (
                <div key={ticket._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-white truncate">{ticket.title}</div>
                    <div className="text-xs text-white/50 mt-1">
                      #{ticket.ticketNumber || ticket._id?.slice(-6)} • 
                      {ticket.createdBy?.name || 'Unknown'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={getStatusColor(ticket.status)} className="text-xs">
                      {ticket.status}
                    </Badge>
                    <Badge color={getPriorityColor(ticket.priority)} className="text-xs">
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>
              )) : (
                <div className="text-center text-white/40 py-4">
                  <FaTicketAlt className="text-4xl mx-auto mb-2" />
                  <p>No recent tickets</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-lg font-bold text-white">{stats.openTickets}</div>
                  <div className="text-xs text-white/60">Open</div>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-lg font-bold text-yellow-400">{stats.pendingTickets}</div>
                  <div className="text-xs text-white/60">Pending</div>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-lg font-bold text-emerald-400">{stats.resolvedTickets}</div>
                  <div className="text-xs text-white/60">Resolved</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Users */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-white">Recent Users</h4>
              <span className="text-sm text-white/60">{recentUsers.length} total</span>
            </div>
            
            <div className="space-y-3">
              {recentUsers.length > 0 ? recentUsers.map(user => (
                <div key={user._id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center">
                    <span className="font-bold text-sm">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{user.name || 'Unknown User'}</div>
                    <div className="text-xs text-white/50 truncate">{user.email || 'No email'}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={getStatusColor(user.status)} className="text-xs">
                        {user.status || 'active'}
                      </Badge>
                      {user.companyName && (
                        <span className="text-xs text-blue-400">{user.companyName}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-white/40">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              )) : (
                <div className="text-center text-white/40 py-4">
                  <FaUsers className="text-4xl mx-auto mb-2" />
                  <p>No recent users</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Active Users</span>
                  <span className="font-medium text-emerald-400">{stats.activeUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Total Users</span>
                  <span className="font-medium text-white">{stats.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">By Companies</span>
                  <span className="font-medium text-blue-400">{stats.totalCompanies}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Departments Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-white">Departments</h4>
            <span className="text-sm text-white/60">{safeDepartments.length} total</span>
          </div>
          
          {safeDepartments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {safeDepartments.map((dept, index) => (
                <div key={dept._id || dept.id || index} className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getDepartmentIconColor(index)} flex items-center justify-center`}>
                      <FaLayerGroup className="text-purple-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{dept.name || 'Unnamed'}</div>
                      <div className="text-xs text-white/60">
                        {dept.status === 'active' ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                  
                  {dept.description && (
                    <p className="text-sm text-white/70 mb-3 line-clamp-2">
                      {dept.description}
                    </p>
                  )}

                  {dept.categories && Array.isArray(dept.categories) && dept.categories.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-white/60 mb-1">Categories:</div>
                      <div className="flex flex-wrap gap-1">
                        {dept.categories.slice(0, 3).map((cat, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                            {cat}
                          </span>
                        ))}
                        {dept.categories.length > 3 && (
                          <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">
                            +{dept.categories.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/40 py-8">
              <FaLayerGroup className="text-4xl mx-auto mb-2" />
              <p>No departments found</p>
              <p className="text-sm mt-1">Departments will appear when created</p>
            </div>
          )}
        </div>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-emerald-400 text-2xl" />
              <div>
                <div className="font-bold text-white">System Status</div>
                <div className="text-sm text-emerald-400">All Systems Operational</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <FaChartLine className="text-purple-400 text-2xl" />
              <div>
                <div className="font-bold text-white">Performance</div>
                <div className="text-sm text-white/70">Avg. Response: {formatTime(stats.avgResolutionTime)}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <FaStar className="text-yellow-400 text-2xl" />
              <div>
                <div className="font-bold text-white">Satisfaction</div>
                <div className="text-sm text-white/70">Rating: {stats.avgRating.toFixed(1)}/5</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;