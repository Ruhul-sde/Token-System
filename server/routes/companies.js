import express from 'express';
import Company from '../models/Company.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/* =========================================================
   GET ALL COMPANIES (SUPER ADMIN)
========================================================= */
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { 
      status, 
      erpName, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1, 
      limit = 10 
    } = req.query;
    
    const query = {};
    
    // Apply filters
    if (status && status !== 'all') query.status = status;
    if (erpName && erpName !== 'all') {
      if (erpName === 'none') {
        query.$or = [
          { 'erpDetails.erpName': { $exists: false } },
          { 'erpDetails.erpName': null },
          { 'erpDetails.erpName': '' }
        ];
      } else {
        query['erpDetails.erpName'] = erpName;
      }
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const companies = await Company.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('statusChangedBy', 'name email');
    
    const total = await Company.countDocuments(query);
    
    res.json({
      success: true,
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
});

/* =========================================================
   GET SINGLE COMPANY DETAILS
========================================================= */
router.get('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('statusChangedBy', 'name email');
    
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Company not found' 
      });
    }

    // Get employees by company name
    const employees = await User.find({
      companyName: company.name
    }).select('-password -resetPasswordToken -resetPasswordExpires');

    const employeeIds = employees.map(e => e._id);

    const tickets = await Ticket.find({
      createdBy: { $in: employeeIds }
    })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      company, 
      employees, 
      tickets,
      stats: {
        totalEmployees: employees.length,
        totalTickets: tickets.length,
        resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
        pendingTickets: tickets.filter(t => t.status === 'pending').length,
        highPriorityTickets: tickets.filter(t => t.priority === 'high').length,
        averageResolutionTime: company.averageSupportTime,
        averageRating: company.averageRating
      }
    });
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company details',
      error: error.message
    });
  }
});

/* =========================================================
   CREATE NEW COMPANY (SUPER ADMIN)
========================================================= */
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const {
      name,
      domain,
      contactPerson,
      contactEmail,
      contactPhone,
      erpDetails = {}
    } = req.body;

    // Validate required fields
    if (!name || !domain) {
      return res.status(400).json({
        success: false,
        message: 'Company name and domain are required'
      });
    }

    // Check if company with same domain already exists
    const existingCompany = await Company.findOne({ 
      $or: [
        { domain: domain.toLowerCase() },
        { name: { $regex: new RegExp(`^${name}$`, 'i') } }
      ]
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Company with this domain or name already exists'
      });
    }

    // Validate ERP details
    if (erpDetails) {
      // Validate SAP Support AMC dates for Active status
      if (erpDetails.sapSupportAMC?.status === 'Active') {
        if (!erpDetails.sapSupportAMC.fromDate || !erpDetails.sapSupportAMC.toDate) {
          return res.status(400).json({
            success: false,
            message: 'From Date and To Date are required for Active SAP Support AMC'
          });
        }
        
        // Validate date range
        const fromDate = new Date(erpDetails.sapSupportAMC.fromDate);
        const toDate = new Date(erpDetails.sapSupportAMC.toDate);
        
        if (fromDate >= toDate) {
          return res.status(400).json({
            success: false,
            message: 'From Date must be before To Date'
          });
        }
        
        if (toDate < new Date()) {
          return res.status(400).json({
            success: false,
            message: 'To Date cannot be in the past'
          });
        }
      }
      
      // Validate ERP name if provided
      if (erpDetails.erpName && !['SAP B1', 'CREST', 'SFA'].includes(erpDetails.erpName)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ERP name. Must be one of: SAP B1, CREST, SFA'
        });
      }
    }

    const company = new Company({
      name: name.trim(),
      domain: domain.toLowerCase().trim(),
      contactPerson: contactPerson?.trim(),
      contactEmail: contactEmail?.toLowerCase().trim(),
      contactPhone: contactPhone?.trim(),
      erpDetails: erpDetails || {},
      createdBy: req.user._id,
      updatedBy: req.user._id,
      status: 'active'
    });

    await company.save();

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      company
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
      error: error.message
    });
  }
});

/* =========================================================
   UPDATE COMPANY DETAILS (PUT - FULL UPDATE)
========================================================= */
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const {
      name,
      contactPerson,
      contactEmail,
      contactPhone,
      erpDetails,
      status,
      statusReason
    } = req.body;

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Company not found' 
      });
    }

    // Update basic information
    if (name !== undefined) company.name = name.trim();
    if (contactPerson !== undefined) company.contactPerson = contactPerson?.trim();
    if (contactEmail !== undefined) company.contactEmail = contactEmail?.toLowerCase().trim();
    if (contactPhone !== undefined) company.contactPhone = contactPhone?.trim();

    // Update ERP details
    if (erpDetails !== undefined) {
      // If erpDetails is null or empty object, set to empty
      if (!erpDetails || Object.keys(erpDetails).length === 0) {
        company.erpDetails = {};
      } else {
        // Update each field individually
        if (erpDetails.erpName !== undefined) {
          company.erpDetails.erpName = erpDetails.erpName || null;
        }
        if (erpDetails.sapB1VersionType !== undefined) {
          company.erpDetails.sapB1VersionType = erpDetails.sapB1VersionType || null;
        }
        if (erpDetails.sapB1VersionAndFP !== undefined) {
          company.erpDetails.sapB1VersionAndFP = erpDetails.sapB1VersionAndFP?.trim() || '';
        }
        if (erpDetails.sapLicenseAMC !== undefined) {
          company.erpDetails.sapLicenseAMC = erpDetails.sapLicenseAMC || null;
        }
        if (erpDetails.sapSupportAMCType !== undefined) {
          company.erpDetails.sapSupportAMCType = erpDetails.sapSupportAMCType || null;
        }
        if (erpDetails.erpIncidentTypes !== undefined) {
          company.erpDetails.erpIncidentTypes = erpDetails.erpIncidentTypes || [];
        }
        
        // Handle sapSupportAMC object
        if (erpDetails.sapSupportAMC !== undefined) {
          if (!company.erpDetails.sapSupportAMC) company.erpDetails.sapSupportAMC = {};
          if (erpDetails.sapSupportAMC.status !== undefined) {
            company.erpDetails.sapSupportAMC.status = erpDetails.sapSupportAMC.status || null;
          }
          if (erpDetails.sapSupportAMC.fromDate !== undefined) {
            company.erpDetails.sapSupportAMC.fromDate = erpDetails.sapSupportAMC.fromDate || null;
          }
          if (erpDetails.sapSupportAMC.toDate !== undefined) {
            company.erpDetails.sapSupportAMC.toDate = erpDetails.sapSupportAMC.toDate || null;
          }
        }
      }
      
      // Validate dates if SAP Support AMC is Active
      if (company.erpDetails.sapSupportAMC?.status === 'Active') {
        if (!company.erpDetails.sapSupportAMC.fromDate || !company.erpDetails.sapSupportAMC.toDate) {
          return res.status(400).json({
            success: false,
            message: 'From Date and To Date are required for Active SAP Support AMC'
          });
        }
        
        // Validate date range
        const fromDate = new Date(company.erpDetails.sapSupportAMC.fromDate);
        const toDate = new Date(company.erpDetails.sapSupportAMC.toDate);
        
        if (fromDate >= toDate) {
          return res.status(400).json({
            success: false,
            message: 'From Date must be before To Date'
          });
        }
      }
    }

    // Update status if changed
    if (status && status !== company.status) {
      company.status = status;
      company.statusReason = statusReason?.trim();
      company.statusChangedBy = req.user._id;
      company.statusChangedAt = new Date();
    }

    company.updatedBy = req.user._id;
    await company.save();

    res.json({
      success: true,
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
});

/* =========================================================
   UPDATE COMPANY STATUS (PATCH - PARTIAL UPDATE)
========================================================= */
router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const {
      name,
      contactPerson,
      contactEmail,
      contactPhone,
      erpDetails,
      status,
      statusReason
    } = req.body;

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Company not found' 
      });
    }

    // Update only provided fields
    if (name !== undefined && name !== null) company.name = name.trim();
    if (contactPerson !== undefined && contactPerson !== null) company.contactPerson = contactPerson.trim();
    if (contactEmail !== undefined && contactEmail !== null) company.contactEmail = contactEmail.toLowerCase().trim();
    if (contactPhone !== undefined && contactPhone !== null) company.contactPhone = contactPhone.trim();

    // Update ERP details if provided
    if (erpDetails !== undefined && erpDetails !== null) {
      // Initialize erpDetails if it doesn't exist
      if (!company.erpDetails) company.erpDetails = {};
      
      // Update each field individually if provided
      if (erpDetails.erpName !== undefined) {
        company.erpDetails.erpName = erpDetails.erpName || null;
      }
      if (erpDetails.sapB1VersionType !== undefined) {
        company.erpDetails.sapB1VersionType = erpDetails.sapB1VersionType || null;
      }
      if (erpDetails.sapB1VersionAndFP !== undefined) {
        company.erpDetails.sapB1VersionAndFP = erpDetails.sapB1VersionAndFP?.trim() || '';
      }
      if (erpDetails.sapLicenseAMC !== undefined) {
        company.erpDetails.sapLicenseAMC = erpDetails.sapLicenseAMC || null;
      }
      if (erpDetails.sapSupportAMCType !== undefined) {
        company.erpDetails.sapSupportAMCType = erpDetails.sapSupportAMCType || null;
      }
      if (erpDetails.erpIncidentTypes !== undefined) {
        company.erpDetails.erpIncidentTypes = erpDetails.erpIncidentTypes || [];
      }
      
      // Handle sapSupportAMC object
      if (erpDetails.sapSupportAMC !== undefined) {
        if (!company.erpDetails.sapSupportAMC) company.erpDetails.sapSupportAMC = {};
        if (erpDetails.sapSupportAMC.status !== undefined) {
          company.erpDetails.sapSupportAMC.status = erpDetails.sapSupportAMC.status || null;
        }
        if (erpDetails.sapSupportAMC.fromDate !== undefined) {
          company.erpDetails.sapSupportAMC.fromDate = erpDetails.sapSupportAMC.fromDate || null;
        }
        if (erpDetails.sapSupportAMC.toDate !== undefined) {
          company.erpDetails.sapSupportAMC.toDate = erpDetails.sapSupportAMC.toDate || null;
        }
        
        // Validate dates if SAP Support AMC is Active
        if (company.erpDetails.sapSupportAMC?.status === 'Active') {
          if (!company.erpDetails.sapSupportAMC.fromDate || !company.erpDetails.sapSupportAMC.toDate) {
            return res.status(400).json({
              success: false,
              message: 'From Date and To Date are required for Active SAP Support AMC'
            });
          }
          
          // Validate date range
          const fromDate = new Date(company.erpDetails.sapSupportAMC.fromDate);
          const toDate = new Date(company.erpDetails.sapSupportAMC.toDate);
          
          if (fromDate >= toDate) {
            return res.status(400).json({
              success: false,
              message: 'From Date must be before To Date'
            });
          }
        }
      }
    }

    // Update status if provided
    if (status !== undefined && status !== null && status !== company.status) {
      company.status = status;
      company.statusReason = statusReason?.trim();
      company.statusChangedBy = req.user._id;
      company.statusChangedAt = new Date();
    }

    company.updatedBy = req.user._id;
    await company.save();

    res.json({
      success: true,
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
});

/* =========================================================
   DELETE COMPANY (SUPER ADMIN)
========================================================= */
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: 'Company not found' 
      });
    }

    // Check if company has any employees
    const employeeCount = await User.countDocuments({
      companyName: company.name
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete company with existing employees. Please reassign or delete employees first.'
      });
    }

    // Check if company has any tickets
    const ticketsCount = await Ticket.countDocuments({
      'createdBy.companyName': company.name
    });

    if (ticketsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete company with existing tickets. Please resolve or reassign tickets first.'
      });
    }

    await Company.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company',
      error: error.message
    });
  }
});

/* =========================================================
   REFRESH COMPANY ANALYTICS
========================================================= */
router.post(
  '/refresh',
  authenticate,
  authorize('superadmin'),
  async (req, res) => {
    try {
      console.log('Starting company analytics refresh...');
      
      // Get all users with company names
      const users = await User.find({
        role: { $ne: 'superadmin' },
        companyName: { $nin: [null, '', ' '] }
      }).select('companyName');

      console.log(`Found ${users.length} users with company names`);

      const companyMap = {};
      users.forEach(user => {
        const key = user.companyName?.trim();
        if (key && key.length > 0) {
          if (!companyMap[key]) companyMap[key] = [];
          companyMap[key].push(user._id);
        }
      });

      console.log(`Found ${Object.keys(companyMap).length} unique companies`);

      const companies = [];
      const errors = [];

      for (const [companyName, userIds] of Object.entries(companyMap)) {
        try {
          // Get tickets for these users
          const tickets = await Ticket.find({
            createdBy: { $in: userIds }
          });

          const resolvedTickets = tickets.filter(t => t.status === 'resolved');
          const pendingTickets = tickets.filter(t => t.status === 'pending');

          // Calculate support time
          const solvedWithTime = resolvedTickets.filter(
            t => t.timeToSolve && t.timeToSolve > 0
          );

          const totalSupportTime = solvedWithTime.reduce(
            (sum, t) => sum + t.timeToSolve,
            0
          );

          const averageSupportTime = solvedWithTime.length > 0
            ? totalSupportTime / solvedWithTime.length
            : 0;

          // Calculate ratings
          const ratedTickets = tickets.filter(t => t.feedback?.rating);
          const averageRating = ratedTickets.length > 0
            ? ratedTickets.reduce((sum, t) => sum + t.feedback.rating, 0) / ratedTickets.length
            : 0;

          // Find existing company or create new one
          let company = await Company.findOne({ name: companyName });
          
          if (company) {
            // Update existing company
            company.employeeCount = userIds.length;
            company.totalTickets = tickets.length;
            company.resolvedTickets = resolvedTickets.length;
            company.pendingTickets = pendingTickets.length;
            company.totalSupportTime = totalSupportTime;
            company.averageSupportTime = averageSupportTime;
            company.averageRating = averageRating;
            company.totalFeedbacks = ratedTickets.length;
            company.updatedBy = req.user._id;
            
            // Don't change status if company already has a non-active status
            if (company.status === 'active') {
              company.status = 'active';
            }
          } else {
            // Create new company
            company = new Company({
              name: companyName,
              domain: `${companyName.toLowerCase().replace(/\s+/g, '-')}.com`, // Auto-generate domain
              employeeCount: userIds.length,
              totalTickets: tickets.length,
              resolvedTickets: resolvedTickets.length,
              pendingTickets: pendingTickets.length,
              totalSupportTime,
              averageSupportTime,
              averageRating,
              totalFeedbacks: ratedTickets.length,
              status: 'active',
              createdBy: req.user._id,
              updatedBy: req.user._id
            });
          }

          await company.save();
          companies.push(company);
          console.log(`✅ Processed company: ${companyName} (${userIds.length} users, ${tickets.length} tickets)`);

        } catch (companyError) {
          console.error(`❌ Error processing company ${companyName}:`, companyError);
          errors.push({
            companyName,
            error: companyError.message
          });
        }
      }

      res.json({
        success: true,
        message: `Refreshed ${companies.length} companies${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
        companies,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalProcessed: companies.length,
          totalErrors: errors.length,
          totalUsers: users.length,
          totalUniqueCompanies: Object.keys(companyMap).length
        }
      });

    } catch (error) {
      console.error('Error refreshing companies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh companies',
        error: error.message
      });
    }
  }
);

/* =========================================================
   GET COMPANY STATISTICS OVERVIEW
========================================================= */
router.get('/stats/overview', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    console.log('Fetching company statistics overview...');
    
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: 'active' });
    const suspendedCompanies = await Company.countDocuments({ status: 'suspended' });
    const frozenCompanies = await Company.countDocuments({ status: 'frozen' });

    // Get ERP distribution
    const erpStats = await Company.aggregate([
      {
        $group: {
          _id: '$erpDetails.erpName',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get companies with expired SAP Support AMC
    const now = new Date();
    const companiesWithExpiredAMC = await Company.countDocuments({
      'erpDetails.sapSupportAMC.status': 'Active',
      'erpDetails.sapSupportAMC.toDate': { $lt: now }
    });

    // Get companies with AMC expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const companiesWithAMCExpiringSoon = await Company.countDocuments({
      'erpDetails.sapSupportAMC.status': 'Active',
      'erpDetails.sapSupportAMC.toDate': { 
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    });

    // Get average statistics
    const avgStats = await Company.aggregate([
      {
        $group: {
          _id: null,
          avgEmployees: { $avg: '$employeeCount' },
          avgTickets: { $avg: '$totalTickets' },
          avgResolutionRate: { 
            $avg: { 
              $cond: [
                { $eq: ['$totalTickets', 0] },
                0,
                { $divide: ['$resolvedTickets', '$totalTickets'] }
              ]
            }
          },
          avgSupportTime: { $avg: '$averageSupportTime' },
          avgRating: { $avg: '$averageRating' }
        }
      }
    ]);

    // Get top companies by employees
    const topCompaniesByEmployees = await Company.find()
      .sort({ employeeCount: -1 })
      .limit(5)
      .select('name employeeCount totalTickets averageRating');

    // Get top companies by tickets
    const topCompaniesByTickets = await Company.find()
      .sort({ totalTickets: -1 })
      .limit(5)
      .select('name totalTickets resolvedTickets pendingTickets');

    const stats = avgStats[0] || {};

    res.json({
      success: true,
      totalCompanies,
      statusDistribution: {
        active: activeCompanies,
        suspended: suspendedCompanies,
        frozen: frozenCompanies
      },
      erpDistribution: erpStats.reduce((acc, stat) => {
        const key = stat._id === null ? 'Unknown' : stat._id;
        acc[key] = stat.count;
        return acc;
      }, {}),
      amcStatus: {
        expired: companiesWithExpiredAMC,
        expiringSoon: companiesWithAMCExpiringSoon
      },
      averages: {
        employees: Math.round(stats.avgEmployees || 0),
        tickets: Math.round(stats.avgTickets || 0),
        resolutionRate: Math.round((stats.avgResolutionRate || 0) * 100),
        supportTime: Math.round(stats.avgSupportTime || 0),
        rating: (stats.avgRating || 0).toFixed(1)
      },
      topCompanies: {
        byEmployees: topCompaniesByEmployees,
        byTickets: topCompaniesByTickets
      }
    });

  } catch (error) {
    console.error('Error fetching company statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company statistics',
      error: error.message
    });
  }
});

/* =========================================================
   GET ERP SYSTEM TYPES
========================================================= */
router.get('/erp/types', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const erpTypes = await Company.distinct('erpDetails.erpName');
    
    // Filter out null/undefined values and sort
    const filteredTypes = erpTypes
      .filter(type => type)
      .sort();
    
    // Count companies for each ERP type
    const erpCounts = await Promise.all(
      filteredTypes.map(async (type) => {
        const count = await Company.countDocuments({ 'erpDetails.erpName': type });
        return { name: type, count };
      })
    );
    
    // Count companies with no ERP
    const noERPCount = await Company.countDocuments({
      $or: [
        { 'erpDetails.erpName': { $exists: false } },
        { 'erpDetails.erpName': null },
        { 'erpDetails.erpName': '' }
      ]
    });
    
    if (noERPCount > 0) {
      erpCounts.push({ name: 'No ERP', count: noERPCount });
    }
    
    res.json({
      success: true,
      erpTypes: erpCounts,
      totalTypes: erpCounts.length
    });
  } catch (error) {
    console.error('Error fetching ERP types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ERP types',
      error: error.message
    });
  }
});

/* =========================================================
   GET COMPANY NAMES FOR AUTO-COMPLETE
========================================================= */
router.get('/search/names', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { query } = req.query;
    
    const searchQuery = query ? {
      name: { $regex: query, $options: 'i' }
    } : {};
    
    const companies = await Company.find(searchQuery)
      .select('name domain')
      .limit(10)
      .sort({ name: 1 });
    
    res.json({
      success: true,
      companies
    });
  } catch (error) {
    console.error('Error searching company names:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search company names',
      error: error.message
    });
  }
});

/* =========================================================
   BULK UPDATE COMPANY STATUS
========================================================= */
router.post('/bulk/status', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { companyIds, status, statusReason } = req.body;
    
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Company IDs are required'
      });
    }
    
    if (!status || !['active', 'suspended', 'frozen'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required'
      });
    }
    
    const result = await Company.updateMany(
      { _id: { $in: companyIds } },
      {
        $set: {
          status,
          statusReason,
          statusChangedBy: req.user._id,
          statusChangedAt: new Date(),
          updatedBy: req.user._id,
          updatedAt: new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} companies to ${status} status`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk updating company status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update company status',
      error: error.message
    });
  }
});

/* =========================================================
   EXPORT COMPANIES DATA
========================================================= */
router.get('/export/csv', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const companies = await Company.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    // Create CSV headers
    const headers = [
      'ID',
      'Name',
      'Domain',
      'Contact Person',
      'Contact Email',
      'Contact Phone',
      'ERP Name',
      'SAP B1 Version Type',
      'SAP Version & FP',
      'SAP License AMC',
      'SAP Support AMC Status',
      'SAP Support AMC From Date',
      'SAP Support AMC To Date',
      'SAP Support AMC Type',
      'ERP Incident Types',
      'Employee Count',
      'Total Tickets',
      'Resolved Tickets',
      'Pending Tickets',
      'Total Support Time',
      'Average Support Time',
      'Average Rating',
      'Total Feedbacks',
      'Status',
      'Status Reason',
      'Created At',
      'Updated At',
      'Created By',
      'Updated By'
    ];
    
    // Convert companies to CSV rows
    const rows = companies.map(company => [
      company._id,
      `"${company.name}"`,
      company.domain,
      `"${company.contactPerson || ''}"`,
      company.contactEmail || '',
      company.contactPhone || '',
      company.erpDetails?.erpName || '',
      company.erpDetails?.sapB1VersionType || '',
      `"${company.erpDetails?.sapB1VersionAndFP || ''}"`,
      company.erpDetails?.sapLicenseAMC || '',
      company.erpDetails?.sapSupportAMC?.status || '',
      company.erpDetails?.sapSupportAMC?.fromDate ? 
        new Date(company.erpDetails.sapSupportAMC.fromDate).toISOString().split('T')[0] : '',
      company.erpDetails?.sapSupportAMC?.toDate ? 
        new Date(company.erpDetails.sapSupportAMC.toDate).toISOString().split('T')[0] : '',
      company.erpDetails?.sapSupportAMCType || '',
      `"${(company.erpDetails?.erpIncidentTypes || []).join(', ')}"`,
      company.employeeCount,
      company.totalTickets,
      company.resolvedTickets,
      company.pendingTickets,
      company.totalSupportTime,
      company.averageSupportTime,
      company.averageRating,
      company.totalFeedbacks,
      company.status,
      `"${company.statusReason || ''}"`,
      company.createdAt.toISOString(),
      company.updatedAt.toISOString(),
      company.createdBy ? `"${company.createdBy.name} <${company.createdBy.email}>"` : '',
      company.updatedBy ? `"${company.updatedBy.name} <${company.updatedBy.email}>"` : ''
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=companies_${new Date().toISOString().split('T')[0]}.csv`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting companies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export companies',
      error: error.message
    });
  }
});

export default router;