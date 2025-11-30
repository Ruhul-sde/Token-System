import express from 'express';
import AdminProfile from '../models/AdminProfile.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all admin profiles
router.get('/', authenticate, async (req, res) => {
  try {
    const profiles = await AdminProfile.find()
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get admin profiles by department
router.get('/by-department/:departmentId', authenticate, async (req, res) => {
  try {
    const profiles = await AdminProfile.find({ department: req.params.departmentId })
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create admin profile (superadmin only)
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, email, password, expertise, department, categories, phone, employeeId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    if (employeeId) {
      const existingCode = await User.findOne({ employeeCode: employeeId });
      if (existingCode) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
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
      user: user._id, // Ensure user._id is correctly assigned
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

    res.status(201).json(populatedProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update admin profile (superadmin only)
router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    // Removed unused fields: bio, departments, profileImage, isActive, address, emergencyContact
    const { expertise, phone, employeeId } = req.body;

    const profile = await AdminProfile.findByIdAndUpdate(
      req.params.id,
      { expertise, phone, employeeId }, // Only update fields that are still relevant
      { new: true }
    )
      .populate('user', 'name email role department employeeCode')
      .populate('department', 'name description categories');

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete admin profile (superadmin only)
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    await AdminProfile.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;