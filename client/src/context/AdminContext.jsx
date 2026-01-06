import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const { API_URL } = useAuth();
  
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      
      const [ticketsRes, usersRes, deptsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/tickets`, config),
        axios.get(`${API_URL}/users`, config),
        axios.get(`${API_URL}/departments`, config),
        axios.get(`${API_URL}/dashboard/stats`, config)
      ]);

      setTickets(ticketsRes.data);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setStats(statsRes.data);
      
      return {
        tickets: ticketsRes.data,
        users: usersRes.data,
        departments: deptsRes.data,
        stats: statsRes.data
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch dashboard data';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const updateTicketStatus = useCallback(async (ticketId, status, solution = '', remarks = '') => {
    try {
      const token = localStorage.getItem('token');
      
      // Prepare update data based on backend endpoint
      const updateData = { 
        status,
        ...(solution && { solution }),
        ...(remarks && { remarks })
      };
      
      const response = await axios.patch(
        `${API_URL}/tickets/${ticketId}/status`, 
        updateData, 
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // Refresh data
      await fetchDashboardData();
      return response.data;
    } catch (error) {
      console.error('Update ticket error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update ticket');
    }
  }, [API_URL, fetchDashboardData]);

  const addRemarkToTicket = useCallback(async (ticketId, text) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/tickets/${ticketId}/remarks`, 
        { text }, 
        { 
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // Refresh data
      await fetchDashboardData();
      return response.data;
    } catch (error) {
      console.error('Add remark error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to add remark');
    }
  }, [API_URL, fetchDashboardData]);

  const createTicketOnBehalf = useCallback(async (ticketData) => {
    try {
      const token = localStorage.getItem('token');
      
      // Format data to match backend expectations
      const formattedData = {
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority || 'medium',
        department: ticketData.department,
        ...(ticketData.category && { category: ticketData.category }),
        ...(ticketData.reason && { reason: ticketData.reason }),
        supportingDocuments: ticketData.supportingDocuments || [],
        userDetails: {
          name: ticketData.userDetails.name,
          email: ticketData.userDetails.email,
          ...(ticketData.userDetails.employeeCode && { employeeCode: ticketData.userDetails.employeeCode }),
          ...(ticketData.userDetails.companyName && { companyName: ticketData.userDetails.companyName })
        }
      };

      console.log('Sending ticket data to backend:', formattedData);

      const response = await axios.post(
        `${API_URL}/tickets/on-behalf`, 
        formattedData, 
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Refresh dashboard data
      await fetchDashboardData();
      
      console.log('Ticket created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create ticket error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to create ticket';
      throw new Error(errorMessage);
    }
  }, [API_URL, fetchDashboardData]);

  const deleteTicket = useCallback(async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_URL}/tickets/${ticketId}`, 
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // Refresh data
      await fetchDashboardData();
      return response.data;
    } catch (error) {
      console.error('Delete ticket error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to delete ticket');
    }
  }, [API_URL, fetchDashboardData]);

  const assignTicket = useCallback(async (ticketId, assigneeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${API_URL}/tickets/${ticketId}/assign`, 
        { assigneeId }, 
        { 
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // Refresh data
      await fetchDashboardData();
      return response.data;
    } catch (error) {
      console.error('Assign ticket error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to assign ticket');
    }
  }, [API_URL, fetchDashboardData]);

  const getTicketById = useCallback(async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/tickets/${ticketId}`, 
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Get ticket by ID error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch ticket');
    }
  }, [API_URL]);

  const getTicketStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/tickets/dashboard/stats`, 
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Get stats error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
    }
  }, [API_URL]);

  const getFilteredTickets = useCallback((filters = {}) => {
    let result = [...tickets];
    
    // Apply filters
    if (filters.status && filters.status !== 'all') {
      result = result.filter(t => t.status === filters.status);
    }
    
    if (filters.priority && filters.priority !== 'all') {
      result = result.filter(t => t.priority === filters.priority);
    }
    
    if (filters.department && filters.department !== 'all') {
      result = result.filter(t => t.department?._id === filters.department);
    }
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.ticketNumber?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (filters.sortBy) {
      result.sort((a, b) => {
        switch (filters.sortBy) {
          case 'date':
            return new Date(b.createdAt) - new Date(a.createdAt);
          case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          case 'status':
            return a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });
    }
    
    return result;
  }, [tickets]);

  const getDepartmentStats = useCallback(() => {
    if (!departments || departments.length === 0) {
      return [];
    }
    
    return departments
      .map(dept => {
        const deptTickets = tickets.filter(t => t.department?._id === dept._id);
        return {
          name: dept.name,
          solved: deptTickets.filter(t => t.status === 'resolved').length,
          pending: deptTickets.filter(t => t.status === 'pending').length,
          assigned: deptTickets.filter(t => t.status === 'assigned').length,
          inProgress: deptTickets.filter(t => t.status === 'in-progress').length,
          total: deptTickets.length
        };
      })
      .filter(dept => dept.total > 0) // Only show departments with tickets
      .sort((a, b) => b.total - a.total); // Sort by total tickets
  }, [departments, tickets]);

  const getSolutions = useCallback((searchQuery = '', categoryFilter = 'all') => {
    let solutions = tickets.filter(t => t.status === 'resolved' && t.solution);
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      solutions = solutions.filter(t => 
        t.title?.toLowerCase().includes(query) || 
        t.solution?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      solutions = solutions.filter(t => t.category === categoryFilter);
    }
    
    // Sort by solved date (most recent first)
    return solutions.sort((a, b) => 
      new Date(b.solvedAt || b.updatedAt || b.createdAt) - 
      new Date(a.solvedAt || a.updatedAt || a.createdAt)
    );
  }, [tickets]);

  const refreshTickets = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/tickets`, config);
      setTickets(response.data);
      return response.data;
    } catch (error) {
      console.error('Refresh tickets error:', error);
      throw new Error(error.response?.data?.message || 'Failed to refresh tickets');
    }
  }, [API_URL]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // State
    tickets,
    users,
    departments,
    stats,
    loading,
    error,
    selectedTicket,
    
    // Setters
    setTickets,
    setUsers,
    setDepartments,
    setStats,
    setSelectedTicket,
    setError,
    setLoading,
    
    // Actions
    fetchDashboardData,
    updateTicketStatus,
    addRemarkToTicket,
    createTicketOnBehalf,
    deleteTicket,
    assignTicket,
    getTicketById,
    getTicketStats,
    refreshTickets,
    clearError,
    
    // Helper functions
    getFilteredTickets,
    getDepartmentStats,
    getSolutions,
    
    // Utility functions
    getTicketCountByStatus: (status) => {
      return tickets.filter(ticket => ticket.status === status).length;
    },
    
    getTicketCountByPriority: (priority) => {
      return tickets.filter(ticket => ticket.priority === priority).length;
    },
    
    getRecentTickets: (limit = 10) => {
      return [...tickets]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    },
    
    getUnresolvedTickets: () => {
      return tickets.filter(t => 
        t.status !== 'resolved' && t.status !== 'closed'
      );
    },
    
    getTicketStatusDistribution: () => {
      const statuses = ['pending', 'assigned', 'in-progress', 'resolved', 'closed'];
      return statuses.map(status => ({
        status,
        count: tickets.filter(t => t.status === status).length
      }));
    }
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};