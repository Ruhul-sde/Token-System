import express from 'express';
import AdminProfile from '../models/AdminProfile.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// =========================================================
// Debug middleware (optional - remove in production)
// =========================================================
router.use((req, res, next) => {
  console.log('AdminProfiles Route Access:', {
    path: req.path,
    method: req.method,
    userRole: req.user?.role,
    userId: req.user?._id
  });
  next();
});

// =========================================================
// Get all admin profiles (superadmin & admin)
// =========================================================
router.get('/', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    let query = {};
    
    // Admin can only see profiles from their department
    if (req.user.role === 'admin' && req.user.department) {
      query.department = req.user.department._id || req.user.department;
    }
    
    const profiles = await AdminProfile.find(query)
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');
    
    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('Error fetching admin profiles:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch admin profiles', 
      error: error.message 
    });
  }
});

// =========================================================
// Get admin profiles by department (superadmin & admin)
// =========================================================
router.get('/by-department/:departmentId', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    // Admin can only view their own department
    if (req.user.role === 'admin') {
      const userDept = req.user.department._id || req.user.department;
      if (userDept.toString() !== departmentId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view profiles from your own department'
        });
      }
    }
    
    const profiles = await AdminProfile.find({ department: departmentId })
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');
    
    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error('Error fetching profiles by department:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch profiles', 
      error: error.message 
    });
  }
});

// =========================================================
// Get single admin profile (superadmin & admin & self)
// =========================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const profile = await AdminProfile.findById(req.params.id)
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }
    
    // Check permissions
    const isSelf = profile.user._id.toString() === req.user._id.toString();
    const isAdminOrSuperadmin = ['superadmin', 'admin'].includes(req.user.role);
    
    if (!isSelf && !isAdminOrSuperadmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this profile'
      });
    }
    
    // Admin can only view profiles from their department
    if (req.user.role === 'admin' && !isSelf) {
      const userDept = req.user.department._id || req.user.department;
      const profileDept = profile.department._id || profile.department;
      
      if (userDept.toString() !== profileDept.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view profiles from your own department'
        });
      }
    }
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch admin profile', 
      error: error.message 
    });
  }
});

// =========================================================
// Get my admin profile (for admin users)
// =========================================================
router.get('/my-profile', authenticate, authorize('admin'), async (req, res) => {
  try {
    const profile = await AdminProfile.findOne({ user: req.user._id })
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching my profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch profile', 
      error: error.message 
    });
  }
});

// =========================================================
// Create admin profile (superadmin only)
// =========================================================
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, email, password, expertise, department, categories, phone, employeeId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Admin with this email already exists' 
      });
    }

    if (employeeId) {
      const existingCode = await User.findOne({ employeeCode: employeeId });
      if (existingCode) {
        return res.status(400).json({ 
          success: false,
          message: 'Employee ID already exists' 
        });
      }
    }

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Create user account with hashed password
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(password, 12);

    const user = new User({
      email,
      password: hashedPassword,
      name,
      employeeCode: employeeId,
      role: 'admin',
      department
    });

    await user.save();

    // Create admin profile
    const profile = new AdminProfile({
      user: user._id,
      expertise,
      department,
      categories,
      phone,
      employeeId
    });

    await profile.save();

    const populatedProfile = await AdminProfile.findById(profile._id)
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');

    res.status(201).json({
      success: true,
      message: 'Admin profile created successfully',
      data: populatedProfile
    });
  } catch (error) {
    console.error('Error creating admin profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create admin profile', 
      error: error.message 
    });
  }
});

// =========================================================
// Update admin profile (superadmin only for full updates)
// =========================================================
router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, expertise, phone, employeeId, department, categories } = req.body;

    // Find the profile to get the user ID
    const profile = await AdminProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Admin profile not found' 
      });
    }

    // Update the User model if name or department changed
    if (name || department) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (department) userUpdate.department = department;
      
      await User.findByIdAndUpdate(profile.user, userUpdate);
    }

    // Update admin profile
    const updateData = {};
    if (expertise !== undefined) updateData.expertise = expertise;
    if (phone !== undefined) updateData.phone = phone;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (department !== undefined) updateData.department = department;
    if (categories !== undefined) updateData.categories = categories;
    updateData.updatedAt = Date.now();

    const updatedProfile = await AdminProfile.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');

    res.json({
      success: true,
      message: 'Admin profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update admin profile', 
      error: error.message 
    });
  }
});

// =========================================================
// Update own admin profile (for admin users)
// =========================================================
router.patch('/my-profile', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { expertise, phone } = req.body;

    // Find the profile by user ID
    const profile = await AdminProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Admin profile not found' 
      });
    }

    // Update only allowed fields for admin
    const updateData = {};
    if (expertise !== undefined) updateData.expertise = expertise;
    if (phone !== undefined) updateData.phone = phone;
    updateData.updatedAt = Date.now();

    const updatedProfile = await AdminProfile.findByIdAndUpdate(
      profile._id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating my profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update profile', 
      error: error.message 
    });
  }
});

// =========================================================
// Update limited admin profile (admin can update others in their department)
// =========================================================
router.patch('/:id/limited', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { expertise, phone } = req.body;
    const profileId = req.params.id;

    // Find the profile
    const profile = await AdminProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Admin profile not found' 
      });
    }

    // Check permissions
    const isSelf = profile.user.toString() === req.user._id.toString();
    
    // Admin can only update profiles in their department
    if (req.user.role === 'admin' && !isSelf) {
      const userDept = req.user.department._id || req.user.department;
      const profileDept = profile.department;
      
      if (userDept.toString() !== profileDept.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update profiles from your own department'
        });
      }
    }

    // Update allowed fields
    const updateData = {};
    if (expertise !== undefined) updateData.expertise = expertise;
    if (phone !== undefined) updateData.phone = phone;
    updateData.updatedAt = Date.now();

    const updatedProfile = await AdminProfile.findByIdAndUpdate(
      profileId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update profile', 
      error: error.message 
    });
  }
});

// =========================================================
// Delete admin profile (superadmin only)
// =========================================================
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    // Find profile to get user ID
    const profile = await AdminProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: 'Admin profile not found' 
      });
    }

    // Delete the user account as well
    await User.findByIdAndDelete(profile.user);
    
    // Delete the admin profile
    await AdminProfile.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true,
      message: 'Admin profile deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting admin profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete admin profile', 
      error: error.message 
    });
  }
});

// =========================================================
// Search admin profiles (superadmin & admin)
// =========================================================
router.get('/search', authenticate, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build search query
    let searchQuery = {};
    
    // Admin can only search in their department
    if (req.user.role === 'admin' && req.user.department) {
      searchQuery.department = req.user.department._id || req.user.department;
    }

    // Search in User collection first
    const users = await User.find({
      $and: [
        { role: 'admin' },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { employeeCode: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('_id');

    const userIds = users.map(user => user._id);
    
    // Add user IDs to search query
    searchQuery.user = { $in: userIds };

    const profiles = await AdminProfile.find(searchQuery)
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');

    res.json({
      success: true,
      data: profiles,
      count: profiles.length
    });
  } catch (error) {
    console.error('Error searching admin profiles:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search admin profiles', 
      error: error.message 
    });
  }
});

export default router;