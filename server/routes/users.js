import express from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Department from '../models/Department.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

/* =========================================================
   GET ALL USERS
========================================================= */
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { 
      status, 
      role, 
      companyId,
      search,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const query = {};
    
    // Apply filters
    if (status && status !== 'all') query.status = status;
    if (role && role !== 'all') query.role = role;
    if (companyId && companyId !== 'all') query.company = companyId;
    
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
    
    // Get statistics
    const stats = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ status: 'active' }),
      suspendedUsers: await User.countDocuments({ status: 'suspended' }),
      frozenUsers: await User.countDocuments({ status: 'frozen' }),
      userRole: await User.countDocuments({ role: 'user' }),
      superadminRole: await User.countDocuments({ role: 'superadmin' })
    };
    
    // Get unique companies for filter
    const companies = await Company.find().select('name').sort({ name: 1 });
    
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
   GET SINGLE USER
========================================================= */
router.get('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
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
   CREATE NEW USER (SUPER ADMIN)
========================================================= */
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
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
      position
    } = req.body;
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
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
    
    // Validate company if provided
    let company = null;
    let finalCompanyName = companyName;
    
    if (companyId) {
      company = await Company.findById(companyId);
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
      company: companyId || null,
      companyName: finalCompanyName,
      department: departmentId || null,
      phoneNumber,
      position,
      role: 'user', // Default role is user, superadmin cannot be created
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
      message: 'User created successfully',
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
   UPDATE USER (SUPER ADMIN)
========================================================= */
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
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
    
    // Prevent self-update for certain fields
    if (req.params.id === req.user._id.toString() && role && role !== user.role) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }
    
    // Validate role if provided
    if (role && !['user', 'superadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Must be user or superadmin'
      });
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
    
    // Validate company if provided
    let company = null;
    let finalCompanyName = companyName;
    
    if (companyId) {
      company = await Company.findById(companyId);
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
    if (companyId !== undefined) user.company = companyId || null;
    if (companyName !== undefined || companyId !== undefined) {
      user.companyName = finalCompanyName;
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
   UPDATE USER STATUS
========================================================= */
router.patch('/:id/status', authenticate, authorize('superadmin'), async (req, res) => {
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
   RESET USER PASSWORD
========================================================= */
router.post('/:id/reset-password', authenticate, authorize('superadmin'), async (req, res) => {
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
   DELETE USER
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
   GET USER STATISTICS
========================================================= */
router.get('/stats/overview', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    // Basic counts
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    const frozenUsers = await User.countDocuments({ status: 'frozen' });
    
    // Role distribution
    const userRole = await User.countDocuments({ role: 'user' });
    const superadminRole = await User.countDocuments({ role: 'superadmin' });
    
    // Company distribution
    const usersWithCompany = await User.countDocuments({ 
      company: { $exists: true, $ne: null } 
    });
    
    // Department distribution
    const usersWithDepartment = await User.countDocuments({ 
      department: { $exists: true, $ne: null } 
    });
    
    // Recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRegistrations = await User.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    
    // Last login stats
    const usersWithLastLogin = await User.countDocuments({ 
      lastLogin: { $exists: true, $ne: null } 
    });
    
    // Average users per company
    const avgUsersPerCompany = await User.aggregate([
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
        superadmin: superadminRole
      },
      assignments: {
        withCompany: usersWithCompany,
        withDepartment: usersWithDepartment
      },
      recentActivity: {
        recentRegistrations,
        usersWithLastLogin
      },
      averages: {
        usersPerCompany: avgUsersPerCompany[0]?.avgUsers || 0
      }
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