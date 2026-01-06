// components/super-admin/tabs/SolutionsDirectoryTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { 
  Search, 
  Filter, 
  Download, 
  Copy, 
  CheckCircle,
  TrendingUp,
  BarChart3,
  FileText,
  MessageSquare,
  Clock,
  Tag
} from 'lucide-react';

const SolutionsDirectoryTab = () => {
  const { tickets, departments, users } = useSuperAdmin();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('grid'); // grid, list, analytics
  const [expandedSolutions, setExpandedSolutions] = useState({});
  const [copiedSolutionId, setCopiedSolutionId] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month');
  
  // Get all resolved tickets with solutions
  const resolvedTickets = useMemo(() => {
    return tickets.filter(ticket => 
      ticket.status === 'resolved' && 
      ticket.solution && 
      ticket.solution.trim().length > 0
    );
  }, [tickets]);
  
  // Filter solutions
  const filteredSolutions = useMemo(() => {
    let filtered = [...resolvedTickets];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.title?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.solution?.toLowerCase().includes(query) ||
        ticket.category?.toLowerCase().includes(query) ||
        ticket.ticketNumber?.toString().includes(searchQuery)
      );
    }
    
    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(ticket => 
        selectedCategories.includes(ticket.category)
      );
    }
    
    // Department filter
    if (selectedDepartments.length > 0) {
      filtered = filtered.filter(ticket => 
        selectedDepartments.includes(ticket.department?._id)
      );
    }
    
    // Priority filter
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter(ticket => 
        selectedPriorities.includes(ticket.priority)
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.resolvedAt || a.updatedAt);
      const dateB = new Date(b.resolvedAt || b.updatedAt);
      
      switch (sortBy) {
        case 'recent':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'title':
          return a.title?.localeCompare(b.title);
        case 'department':
          return (a.department?.name || '').localeCompare(b.department?.name || '');
        default:
          return dateB - dateA;
      }
    });
    
    return filtered;
  }, [resolvedTickets, searchQuery, selectedCategories, selectedDepartments, selectedPriorities, sortBy]);
  
  // Analytics data
  const analyticsData = useMemo(() => {
    const data = {
      totalSolutions: resolvedTickets.length,
      byDepartment: {},
      byCategory: {},
      byMonth: {},
      byPriority: {},
      topContributors: {},
      avgResolutionTime: 0,
      mostCommonIssues: []
    };
    
    // Calculate analytics
    resolvedTickets.forEach(ticket => {
      // By department
      const deptName = ticket.department?.name || 'Unassigned';
      data.byDepartment[deptName] = (data.byDepartment[deptName] || 0) + 1;
      
      // By category
      const category = ticket.category || 'Uncategorized';
      data.byCategory[category] = (data.byCategory[category] || 0) + 1;
      
      // By month
      const date = new Date(ticket.resolvedAt || ticket.updatedAt);
      const monthYear = `${date.getMonth()+1}/${date.getFullYear()}`;
      data.byMonth[monthYear] = (data.byMonth[monthYear] || 0) + 1;
      
      // By priority
      data.byPriority[ticket.priority] = (data.byPriority[ticket.priority] || 0) + 1;
      
      // Top contributors
      const resolver = ticket.resolvedBy?.name || ticket.assignedTo?.name || 'Unknown';
      data.topContributors[resolver] = (data.topContributors[resolver] || 0) + 1;
    });
    
    // Convert to arrays for easier rendering
    data.byDepartment = Object.entries(data.byDepartment)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    data.byCategory = Object.entries(data.byCategory)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    data.topContributors = Object.entries(data.topContributors)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Most common issues (by title)
    const titleCounts = {};
    resolvedTickets.forEach(ticket => {
      const title = ticket.title;
      titleCounts[title] = (titleCounts[title] || 0) + 1;
    });
    
    data.mostCommonIssues = Object.entries(titleCounts)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return data;
  }, [resolvedTickets]);
  
  // Get unique values for filters
  const allCategories = useMemo(() => {
    const categories = new Set();
    resolvedTickets.forEach(ticket => {
      if (ticket.category) categories.add(ticket.category);
    });
    return Array.from(categories);
  }, [resolvedTickets]);
  
  const allPriorities = useMemo(() => {
    const priorities = new Set();
    resolvedTickets.forEach(ticket => {
      if (ticket.priority) priorities.add(ticket.priority);
    });
    return Array.from(priorities);
  }, [resolvedTickets]);
  
  // Helper functions
  const toggleExpand = (ticketId) => {
    setExpandedSolutions(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };
  
  const copySolution = async (ticketId, solution) => {
    try {
      await navigator.clipboard.writeText(solution);
      setCopiedSolutionId(ticketId);
      setTimeout(() => setCopiedSolutionId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const exportToCSV = () => {
    const headers = [
      'Ticket ID',
      'Title',
      'Category',
      'Department',
      'Priority',
      'Issue Description',
      'Solution',
      'Resolved By',
      'Resolution Date',
      'Created Date'
    ];
    
    const csvData = filteredSolutions.map(ticket => [
      ticket.ticketNumber || ticket._id,
      `"${ticket.title?.replace(/"/g, '""')}"`,
      ticket.category || 'N/A',
      ticket.department?.name || 'N/A',
      ticket.priority || 'N/A',
      `"${ticket.description?.replace(/"/g, '""')}"`,
      `"${ticket.solution?.replace(/"/g, '""')}"`,
      ticket.resolvedBy?.name || ticket.assignedTo?.name || 'N/A',
      ticket.resolvedAt ? new Date(ticket.resolvedAt).toISOString().split('T')[0] : 'N/A',
      ticket.createdAt ? new Date(ticket.createdAt).toISOString().split('T')[0] : 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solutions-directory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  // Render solution card
  const renderSolutionCard = (ticket) => {
    const isExpanded = expandedSolutions[ticket._id];
    const solutionPreview = ticket.solution?.length > 200 && !isExpanded
      ? `${ticket.solution.substring(0, 200)}...`
      : ticket.solution;
    
    return (
      <Card key={ticket._id} className="hover:bg-white/5 transition-all duration-300">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-lg font-bold text-white group-hover:text-[#ED1B2F] transition-colors">
                  {ticket.title}
                </h4>
                <Badge className={getPriorityColor(ticket.priority)}>
                  {ticket.priority}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {ticket.category && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs">
                    <Tag size={12} />
                    {ticket.category}
                  </span>
                )}
                {ticket.department?.name && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-xs">
                    🏢 {ticket.department.name}
                  </span>
                )}
                <span className="text-xs text-white/50">
                  #{ticket.ticketNumber || ticket._id?.slice(-6)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white"
                onClick={() => copySolution(ticket._id, ticket.solution)}
                title="Copy Solution"
              >
                {copiedSolutionId === ticket._id ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Copy size={16} />
                )}
              </Button>
            </div>
          </div>
          
          {/* Issue Description */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-red-400" />
              <h5 className="text-sm font-medium text-red-300">Issue</h5>
            </div>
            <p className="text-sm text-white/80 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
              {ticket.description}
            </p>
          </div>
          
          {/* Solution */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400" />
                <h5 className="text-sm font-medium text-green-300">Solution</h5>
              </div>
              {ticket.solution?.length > 200 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-white/60 hover:text-white"
                  onClick={() => toggleExpand(ticket._id)}
                >
                  {isExpanded ? 'Show Less' : 'Show More'}
                </Button>
              )}
            </div>
            <p className="text-sm text-white/90 bg-green-500/5 p-3 rounded-lg border border-green-500/10 whitespace-pre-wrap">
              {solutionPreview}
            </p>
          </div>
          
          {/* Footer */}
          <div className="flex flex-wrap justify-between items-center pt-4 border-t border-white/10 text-xs text-white/60">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                👤 {ticket.resolvedBy?.name || ticket.assignedTo?.name || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {ticket.resolvedAt 
                  ? new Date(ticket.resolvedAt).toLocaleDateString()
                  : new Date(ticket.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {ticket.supportingDocuments?.length > 0 && (
                <span className="flex items-center gap-1">
                  📎 {ticket.supportingDocuments.length}
                </span>
              )}
              <span className="px-2 py-1 rounded bg-white/5">
                {ticket.solution?.length} chars
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  };
  
  // Render analytics view
  const renderAnalyticsView = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-blue-300">Total Solutions</h5>
              <FileText size={20} className="text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{analyticsData.totalSolutions}</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-green-300">Departments</h5>
              <TrendingUp size={20} className="text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">{analyticsData.byDepartment.length}</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-purple-300">Categories</h5>
              <BarChart3 size={20} className="text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{analyticsData.byCategory.length}</p>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-yellow-300">Top Contributor</h5>
              <CheckCircle size={20} className="text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {analyticsData.topContributors[0]?.name?.split(' ')[0] || 'N/A'}
            </p>
          </div>
        </Card>
      </div>
      
      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Department */}
        <Card>
          <h5 className="text-lg font-bold text-white mb-4">Solutions by Department</h5>
          <div className="space-y-3">
            {analyticsData.byDepartment.slice(0, 8).map((dept, index) => (
              <div key={dept.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                    {index + 1}
                  </div>
                  <span className="text-white/80">{dept.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(dept.count / analyticsData.totalSolutions) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-bold">{dept.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* By Category */}
        <Card>
          <h5 className="text-lg font-bold text-white mb-4">Solutions by Category</h5>
          <div className="space-y-3">
            {analyticsData.byCategory.slice(0, 8).map((cat, index) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                    {index + 1}
                  </div>
                  <span className="text-white/80">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(cat.count / analyticsData.totalSolutions) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-bold">{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Top Contributors */}
        <Card>
          <h5 className="text-lg font-bold text-white mb-4">Top Contributors</h5>
          <div className="space-y-3">
            {analyticsData.topContributors.map((contributor, index) => (
              <div key={contributor.name} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold">
                    {contributor.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{contributor.name}</p>
                    <p className="text-xs text-white/50">{contributor.count} solutions</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-[#ED1B2F] to-[#455185] text-white">
                  #{index + 1}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Most Common Issues */}
        <Card>
          <h5 className="text-lg font-bold text-white mb-4">Most Common Issues</h5>
          <div className="space-y-3">
            {analyticsData.mostCommonIssues.map((issue, index) => (
              <div key={issue.title} className="p-3 hover:bg-white/5 rounded-lg transition-colors border border-white/5">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-sm text-white/90 flex-1">{issue.title}</p>
                </div>
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>Recurred {issue.count} times</span>
                  <span className="px-2 py-1 rounded bg-white/5">
                    {((issue.count / analyticsData.totalSolutions) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">Solutions Directory</h3>
          <p className="text-white/60 mt-1">
            Knowledge base of {resolvedTickets.length} resolved issues and their solutions
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={exportToCSV}
          >
            <Download size={16} />
            Export CSV
          </Button>
          
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              className="rounded-none border-r border-white/10"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              className="rounded-none border-r border-white/10"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              variant={viewMode === 'analytics' ? 'primary' : 'ghost'}
              className="rounded-none"
              onClick={() => setViewMode('analytics')}
            >
              Analytics
            </Button>
          </div>
        </div>
      </div>
      
      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={20} />
              <input
                type="text"
                placeholder="Search solutions by title, description, or solution..."
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-[#ED1B2F]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Sort */}
          <select
            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm min-w-[140px]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title A-Z</option>
            <option value="department">Department</option>
          </select>
        </div>
        
        {/* Filter Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Category Filters */}
          {allCategories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-white/60" />
              <span className="text-xs text-white/60">Categories:</span>
              {allCategories.map(category => (
                <button
                  key={category}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedCategories.includes(category)
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setSelectedCategories(prev =>
                      prev.includes(category)
                        ? prev.filter(c => c !== category)
                        : [...prev, category]
                    );
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
          
          {/* Priority Filters */}
          {allPriorities.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">Priority:</span>
              {allPriorities.map(priority => (
                <button
                  key={priority}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedPriorities.includes(priority)
                      ? getPriorityColor(priority) + ' border'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setSelectedPriorities(prev =>
                      prev.includes(priority)
                        ? prev.filter(p => p !== priority)
                        : [...prev, priority]
                    );
                  }}
                >
                  {priority}
                </button>
              ))}
            </div>
          )}
          
          {/* Clear Filters */}
          {(selectedCategories.length > 0 || selectedDepartments.length > 0 || selectedPriorities.length > 0) && (
            <Button
              variant="ghost"
              className="text-xs h-7"
              onClick={() => {
                setSelectedCategories([]);
                setSelectedDepartments([]);
                setSelectedPriorities([]);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>
      
      {/* Results Info */}
      <div className="flex justify-between items-center text-sm text-white/60">
        <span>
          Showing {filteredSolutions.length} of {resolvedTickets.length} solutions
          {searchQuery && ` for "${searchQuery}"`}
        </span>
        <span className="flex items-center gap-2">
          <span className="px-2 py-1 rounded bg-white/5">
            {analyticsData.totalSolutions} total
          </span>
          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400">
            {analyticsData.byDepartment.length} departments
          </span>
          <span className="px-2 py-1 rounded bg-green-500/10 text-green-400">
            {analyticsData.byCategory.length} categories
          </span>
        </span>
      </div>
      
      {/* Content */}
      {viewMode === 'analytics' ? (
        renderAnalyticsView()
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredSolutions.map(ticket => (
            <Card key={ticket._id} className="hover:bg-white/5 transition-all">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-2">{ticket.title}</h4>
                    <div className="flex items-center gap-3 mb-3 text-sm text-white/60">
                      <span>#{ticket.ticketNumber}</span>
                      <span>•</span>
                      <span>{ticket.category || 'Uncategorized'}</span>
                      <span>•</span>
                      <span>{ticket.department?.name || 'No Department'}</span>
                    </div>
                    <p className="text-sm text-white/80 line-clamp-2">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copySolution(ticket._id, ticket.solution)}
                    >
                      {copiedSolutionId === ticket._id ? 'Copied!' : 'Copy Solution'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSolutions.map(renderSolutionCard)}
        </div>
      )}
      
      {/* No Results */}
      {filteredSolutions.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4 grayscale">🔍</div>
          <h4 className="text-xl font-bold text-white mb-2">No solutions found</h4>
          <p className="text-white/60 mb-6">
            {searchQuery 
              ? `No solutions matching "${searchQuery}"`
              : 'No solutions available for the selected filters'
            }
          </p>
          {(searchQuery || selectedCategories.length > 0 || selectedDepartments.length > 0 || selectedPriorities.length > 0) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategories([]);
                setSelectedDepartments([]);
                setSelectedPriorities([]);
              }}
            >
              Clear All Filters
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default SolutionsDirectoryTab;