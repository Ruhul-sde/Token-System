import express from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Department from '../models/Department.js';
import { authenticate, authorize} from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

/* =========================================================
   GET ALL USERS WITH ROLE FILTERING (SUPERADMIN & ADMIN)
========================================================= */
router.get('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { 
      status, 
      role, 
      companyId,
      search,
      page = 1, 
      limit = 20,
      roleType = 'all' // 'all', 'admin', 'user'
    } = req.query;
    
    const query = {};
    
    // Apply filters
    if (status && status !== 'all') query.status = status;
    if (role && role !== 'all') query.role = role;
    if (companyId && companyId !== 'all') query.company = companyId;
    
    // Role type filtering
    if (roleType === 'admin') {
      query.role = 'admin';
    } else if (roleType === 'user') {
      query.role = 'user';
    } else if (role && role !== 'all') {
      query.role = role;
    }
    
    // Admin can only see users from their company
    if (req.user.role === 'admin' && req.user.company) {
      query.company = req.user.company;
    }
    
    // Admin cannot see superadmins
    if (req.user.role === 'admin') {
      query.role = { $ne: 'superadmin' };
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('company', 'name domain')
      .populate('department', 'name')
      .populate('statusChangedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    // Get statistics based on role type
    const baseQuery = roleType !== 'all' ? { role: roleType } : {};
    if (req.user.role === 'admin' && req.user.company) {
      baseQuery.company = req.user.company;
      if (req.user.role === 'admin') {
        baseQuery.role = { $ne: 'superadmin' };
      }
    }
    
    const stats = {
      totalUsers: await User.countDocuments({ ...baseQuery }),
      activeUsers: await User.countDocuments({ ...baseQuery, status: 'active' }),
      suspendedUsers: await User.countDocuments({ ...baseQuery, status: 'suspended' }),
      frozenUsers: await User.countDocuments({ ...baseQuery, status: 'frozen' }),
      // Role distribution (admin can't see superadmin stats)
      userRole: await User.countDocuments({ 
        ...(req.user.role === 'admin' && req.user.company ? { company: req.user.company } : {}),
        role: 'user' 
      }),
      adminRole: await User.countDocuments({ 
        ...(req.user.role === 'admin' && req.user.company ? { company: req.user.company } : {}),
        role: 'admin' 
      }),
      ...(req.user.role === 'superadmin' ? {
        superadminRole: await User.countDocuments({ role: 'superadmin' })
      } : {})
    };
    
    // Get companies for filter (admin only sees their company)
    let companies = [];
    if (req.user.role === 'superadmin') {
      companies = await Company.find().select('name').sort({ name: 1 });
    } else if (req.user.role === 'admin' && req.user.company) {
      const company = await Company.findById(req.user.company).select('name');
      if (company) companies = [company];
    }
    
    res.json({
      success: true,
      users,
      stats,
      companies: companies.map(c => ({ id: c._id, name: c.name })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

/* =========================================================
   GET USERS BY SPECIFIC ROLE (SUPERADMIN & ADMIN)
========================================================= */
router.get('/role/:role', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { role } = req.params;
    const { 
      status, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const query = { role };
    
    // Validate role
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    // Admin cannot see superadmins
    if (req.user.role === 'admin' && role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to superadmin data'
      });
    }
    
    // Admin can only see users from their company
    if (req.user.role === 'admin' && req.user.company) {
      query.company = req.user.company;
    }
    
    // Apply filters
    if (status && status !== 'all') query.status = status;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('company', 'name domain')
      .populate('department', 'name')
      .populate('statusChangedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    // Get statistics for this role
    const stats = {
      total: await User.countDocuments(query),
      active: await User.countDocuments({ ...query, status: 'active' }),
      suspended: await User.countDocuments({ ...query, status: 'suspended' }),
      frozen: await User.countDocuments({ ...query, status: 'frozen' }),
      withCompany: await User.countDocuments({ ...query, company: { $exists: true, $ne: null } }),
      withDepartment: await User.countDocuments({ ...query, department: { $exists: true, $ne: null } })
    };
    
    res.json({
      success: true,
      users,
      stats,
      role,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.role}s:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch ${req.params.role}s`,
      error: error.message
    });
  }
});

/* =========================================================
   GET CURRENT USER PROFILE (ALL ROLES)
========================================================= */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('company', 'name domain')
      .populate('department', 'name')
      .populate('statusChangedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
});

/* =========================================================
   GET SINGLE USER (SUPERADMIN, ADMIN, OR SELF)
========================================================= */
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Check if user is accessing their own profile
    const isSelf = req.params.id === req.user._id.toString();
    
    // Check if user has permission
    if (!isSelf && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view other users'
      });
    }
    
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate('company', 'name domain')
      .populate('department', 'name')
      .populate('statusChangedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Admin can only see users from their company
    if (req.user.role === 'admin' && user.company?._id?.toString() !== req.user.company?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to users from other companies'
      });
    }
    
    // Admin cannot see superadmins
    if (req.user.role === 'admin' && user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to superadmin data'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

/* =========================================================
   CREATE NEW USER (SUPERADMIN & ADMIN)
========================================================= */
router.post('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      employeeCode,
      companyId,
      companyName,
      departmentId,
      phoneNumber,
      position,
      role = 'user' // Default to 'user', can be 'admin' or 'user' (not superadmin)
    } = req.body;
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }
    
    // Validate role - admin cannot create superadmins
    let allowedRoles = ['user', 'admin'];
    if (req.user.role === 'superadmin') {
      allowedRoles.push('superadmin');
    }
    
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be ${allowedRoles.join(' or ')}`
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        ...(employeeCode ? [{ employeeCode }] : [])
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or employee code already exists'
      });
    }
    
    // For admin users, force their company
    let finalCompanyId = companyId;
    let finalCompanyName = companyName;
    
    if (req.user.role === 'admin') {
      // Admin can only create users for their own company
      if (companyId && companyId !== req.user.company?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only create users for your own company'
        });
      }
      finalCompanyId = req.user.company;
      if (req.user.company) {
        const company = await Company.findById(req.user.company);
        if (company) {
          finalCompanyName = company.name;
        }
      }
    } else if (companyId) {
      // Superadmin creating user with specific company
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(400).json({
          success: false,
          message: 'Company not found'
        });
      }
      finalCompanyName = company.name;
    }
    
    // Validate department if provided
    if (departmentId) {
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Department not found'
        });
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      employeeCode,
      company: finalCompanyId || null,
      companyName: finalCompanyName,
      department: departmentId || null,
      phoneNumber,
      position,
      role: role === 'superadmin' && req.user.role !== 'superadmin' ? 'admin' : role,
      status: 'active',
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;
    
    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

/* =========================================================
   UPDATE USER (SUPERADMIN, ADMIN, OR SELF)
========================================================= */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      name,
      employeeCode,
      companyId,
      companyName,
      departmentId,
      phoneNumber,
      position,
      role
    } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isSelf = req.params.id === req.user._id.toString();
    const isAdminOrSuperadmin = ['superadmin', 'admin'].includes(req.user.role);
    
    // Check permissions
    if (!isSelf && !isAdminOrSuperadmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update other users'
      });
    }
    
    // Admin can only update users from their company
    if (req.user.role === 'admin' && !isSelf) {
      if (user.company?._id?.toString() !== req.user.company?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update users from your own company'
        });
      }
      
      // Admin cannot update superadmins
      if (user.role === 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'You cannot update superadmin users'
        });
      }
    }
    
    // Prevent self-update for certain fields
    if (isSelf) {
      if (role && role !== user.role) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role'
        });
      }
      if (req.body.status && req.body.status !== user.status) {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own status'
        });
      }
    }
    
    // Validate role if provided
    if (role) {
      let allowedRoles = ['user', 'admin'];
      if (req.user.role === 'superadmin') {
        allowedRoles.push('superadmin');
      }
      
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be ${allowedRoles.join(' or ')}`
        });
      }
      
      // Admin cannot set role to superadmin
      if (req.user.role === 'admin' && role === 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'You cannot set role to superadmin'
        });
      }
    }
    
    // Validate employee code uniqueness
    if (employeeCode && employeeCode !== user.employeeCode) {
      const existingWithCode = await User.findOne({ 
        employeeCode,
        _id: { $ne: req.params.id }
      });
      if (existingWithCode) {
        return res.status(400).json({
          success: false,
          message: 'Employee code already in use'
        });
      }
    }
    
    // Handle company updates
    let finalCompanyId = companyId;
    let finalCompanyName = companyName;
    
    if (companyId && companyId !== user.company?.toString()) {
      // Admin can only keep users in their company
      if (req.user.role === 'admin' && companyId !== req.user.company?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign users to your own company'
        });
      }
      
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(400).json({
          success: false,
          message: 'Company not found'
        });
      }
      finalCompanyName = company.name;
    }
    
    // Validate department if provided
    if (departmentId) {
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Department not found'
        });
      }
    }
    
    // Update user
    if (name !== undefined) user.name = name;
    if (employeeCode !== undefined) user.employeeCode = employeeCode || null;
    if (companyId !== undefined) user.company = finalCompanyId || null;
    if (companyName !== undefined || companyId !== undefined) {
      user.companyName = finalCompanyName || user.companyName;
    }
    if (departmentId !== undefined) user.department = departmentId || null;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (position !== undefined) user.position = position;
    if (role !== undefined) user.role = role;
    
    user.updatedBy = req.user._id;
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

/* =========================================================
   UPDATE USER STATUS (SUPERADMIN & ADMIN ONLY)
========================================================= */
router.patch('/:id/status', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { status, statusReason } = req.body;
    
    // Validate status
    if (!['active', 'suspended', 'frozen'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, suspended, or frozen'
      });
    }
    
    // Prevent self-status change
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status'
      });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Admin can only update users from their company
    if (req.user.role === 'admin') {
      if (user.company?._id?.toString() !== req.user.company?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update users from your own company'
        });
      }
      
      // Admin cannot update superadmins
      if (user.role === 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'You cannot update superadmin users'
        });
      }
      
      // Admin cannot update other admins (only superadmin can)
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can update admin status'
        });
      }
    }
    
    // Update status
    user.status = status;
    user.statusReason = statusReason || '';
    user.statusChangedBy = req.user._id;
    user.statusChangedAt = new Date();
    user.updatedBy = req.user._id;
    
    await user.save();
    
    res.json({
      success: true,
      message: `User status updated to ${status}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        statusReason: user.statusReason,
        statusChangedAt: user.statusChangedAt
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
});

/* =========================================================
   RESET USER PASSWORD (SUPERADMIN & ADMIN ONLY)
========================================================= */
router.post('/:id/reset-password', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Admin can only reset passwords for users in their company
    if (req.user.role === 'admin') {
      if (user.company?._id?.toString() !== req.user.company?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only reset passwords for users in your company'
        });
      }
      
      // Admin cannot reset superadmin passwords
      if (user.role === 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'You cannot reset superadmin passwords'
        });
      }
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.updatedBy = req.user._id;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
});

/* =========================================================
   UPDATE OWN PASSWORD (ALL ROLES)
========================================================= */
router.patch('/profile/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.updatedBy = req.user._id;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password',
      error: error.message
    });
  }
});

/* =========================================================
   DELETE USER (SUPERADMIN ONLY)
========================================================= */
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Cannot delete superadmin (except for other superadmins)
    if (user.role === 'superadmin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete other superadmin accounts'
      });
    }
    
    // Check if user has any tickets created
    const Ticket = mongoose.model('Ticket');
    const ticketCount = await Ticket.countDocuments({ createdBy: user._id });
    
    if (ticketCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with existing tickets. Please reassign tickets first.'
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

/* =========================================================
   GET USER STATISTICS (SUPERADMIN & ADMIN)
========================================================= */
router.get('/stats/overview', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    // Base query for admin users
    let baseQuery = {};
    if (req.user.role === 'admin' && req.user.company) {
      baseQuery.company = req.user.company;
      baseQuery.role = { $ne: 'superadmin' }; // Admin can't see superadmin stats
    }
    
    // Basic counts
    const totalUsers = await User.countDocuments(baseQuery);
    const activeUsers = await User.countDocuments({ ...baseQuery, status: 'active' });
    const suspendedUsers = await User.countDocuments({ ...baseQuery, status: 'suspended' });
    const frozenUsers = await User.countDocuments({ ...baseQuery, status: 'frozen' });
    
    // Role distribution
    const userRole = await User.countDocuments({ ...baseQuery, role: 'user' });
    const adminRole = await User.countDocuments({ ...baseQuery, role: 'admin' });
    let superadminRole = 0;
    if (req.user.role === 'superadmin') {
      superadminRole = await User.countDocuments({ role: 'superadmin' });
    }
    
    // Company distribution
    const usersWithCompany = await User.countDocuments({ 
      ...baseQuery,
      company: { $exists: true, $ne: null } 
    });
    
    // Department distribution
    const usersWithDepartment = await User.countDocuments({ 
      ...baseQuery,
      department: { $exists: true, $ne: null } 
    });
    
    // Recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRegistrations = await User.countDocuments({ 
      ...baseQuery,
      createdAt: { $gte: sevenDaysAgo } 
    });
    
    // Last login stats
    const usersWithLastLogin = await User.countDocuments({ 
      ...baseQuery,
      lastLogin: { $exists: true, $ne: null } 
    });
    
    // Average users per company (only for superadmin)
    let avgUsersPerCompany = 0;
    if (req.user.role === 'superadmin') {
      const result = await User.aggregate([
        {
          $match: { company: { $exists: true, $ne: null } }
        },
        {
          $group: {
            _id: '$company',
            userCount: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            avgUsers: { $avg: '$userCount' }
          }
        }
      ]);
      
      avgUsersPerCompany = result[0]?.avgUsers || 0;
    }
    
    res.json({
      success: true,
      totalUsers,
      statusDistribution: {
        active: activeUsers,
        suspended: suspendedUsers,
        frozen: frozenUsers
      },
      roleDistribution: {
        user: userRole,
        admin: adminRole,
        ...(req.user.role === 'superadmin' ? { superadmin: superadminRole } : {})
      },
      assignments: {
        withCompany: usersWithCompany,
        withDepartment: usersWithDepartment
      },
      recentActivity: {
        recentRegistrations,
        usersWithLastLogin
      },
      ...(req.user.role === 'superadmin' ? {
        averages: {
          usersPerCompany: avgUsersPerCompany
        }
      } : {})
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
});

export default router;