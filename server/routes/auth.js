import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/* ===================== REGISTER ===================== */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, employeeCode, role, companyName } = req.body;
    
    console.log('=== REGISTRATION REQUEST ===');
    console.log('Data received:', { email, name, employeeCode, companyName });
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if employee code already exists (if provided)
    if (employeeCode) {
      const existingCode = await User.findOne({ employeeCode });
      if (existingCode) {
        return res.status(400).json({ message: 'Employee code already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      employeeCode: employeeCode ? employeeCode.trim() : null,
      companyName: companyName ? companyName.trim() : null,
      role: role || 'user'
    });

    await user.save();
    console.log(`✅ User registered successfully: ${user.email}, Company: ${user.companyName || 'Not specified'}`);

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Return response
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role,
        employeeCode: user.employeeCode
      },
      token
    });

  } catch (error) {
    console.error('❌ REGISTRATION FAILED:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (error.keyPattern.employeeCode) {
        return res.status(400).json({ message: 'Employee code already exists' });
      }
    }
    
    res.status(500).json({ 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== LOGIN ===================== */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email:', email);
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user and populate department
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('department', 'name description');
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ 
        message: `Account is ${user.status}. Please contact administrator.`,
        status: user.status
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log(`✅ Login successful: ${user.email}, Role: ${user.role}`);

    // Return user data
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role,
        department: user.department,
        employeeCode: user.employeeCode,
        status: user.status
      },
      token
    });

  } catch (error) {
    console.error('❌ LOGIN FAILED:', error);
    res.status(500).json({ 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== LOGOUT ===================== */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

/* ===================== GET CURRENT USER ===================== */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('department', 'name description');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'User fetched successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        role: user.role,
        department: user.department,
        employeeCode: user.employeeCode,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ GET ME FAILED:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== UPDATE PROFILE (INCLUDES COMPANY NAME) ===================== */
router.patch('/update-profile', authenticate, async (req, res) => {
  try {
    const { name, employeeCode, companyName } = req.body;
    const userId = req.user._id;

    console.log('=== UPDATE PROFILE REQUEST ===');
    console.log('User ID:', userId);
    console.log('Update data:', { name, employeeCode, companyName });

    // Validate name
    if (name && name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    // Check if employeeCode is unique (if provided and changed)
    if (employeeCode && employeeCode !== req.user.employeeCode) {
      const existingUser = await User.findOne({ 
        employeeCode, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Employee code already exists' });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (employeeCode !== undefined) updateData.employeeCode = employeeCode.trim() || null;
    if (companyName !== undefined) updateData.companyName = companyName.trim() || null;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('department', 'name description');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ Profile updated for: ${updatedUser.email}`);
    console.log(`   Company name: ${updatedUser.companyName || 'Not specified'}`);

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        companyName: updatedUser.companyName,
        role: updatedUser.role,
        department: updatedUser.department,
        employeeCode: updatedUser.employeeCode,
        status: updatedUser.status
      }
    });
  } catch (error) {
    console.error('❌ UPDATE PROFILE FAILED:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern.employeeCode) {
        return res.status(400).json({ message: 'Employee code already exists' });
      }
    }
    
    res.status(500).json({ 
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== CHANGE PASSWORD ===================== */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password changed for: ${user.email}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('❌ CHANGE PASSWORD FAILED:', error);
    res.status(500).json({ 
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== FORGOT PASSWORD ===================== */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Generate reset token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In production, you would send an email with the reset link
    // For now, we'll log it for development
    console.log(`🔑 Password reset token for ${email}: ${resetToken}`);
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    console.log(`🔗 Reset link: ${resetLink}`);

    // TODO: Send email with reset link in production
    // await sendResetEmail(email, resetLink);

    res.json({ 
      message: 'Password reset link sent to your email',
      // In development, return the reset link for testing
      ...(process.env.NODE_ENV === 'development' && { 
        resetLink,
        token: resetToken 
      })
    });
  } catch (error) {
    console.error('❌ FORGOT PASSWORD FAILED:', error);
    res.status(500).json({ 
      message: 'Failed to process password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== RESET PASSWORD ===================== */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password reset for: ${user.email}`);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('❌ RESET PASSWORD FAILED:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Reset token has expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }
    
    res.status(500).json({ 
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== UPDATE COMPANY NAME ===================== */
router.post('/update-company', authenticate, async (req, res) => {
  try {
    const { companyName } = req.body;
    
    console.log('=== UPDATE COMPANY NAME REQUEST ===');
    console.log('User ID:', req.user._id);
    console.log('New company name:', companyName);
    
    if (!companyName || companyName.trim() === '') {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // Update user's company name
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { companyName: companyName.trim() },
      { new: true, runValidators: true }
    )
    .select('-password')
    .populate('department', 'name description');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ Company name updated for ${updatedUser.email}: ${updatedUser.companyName}`);

    res.json({
      message: 'Company name updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        companyName: updatedUser.companyName,
        role: updatedUser.role,
        department: updatedUser.department,
        employeeCode: updatedUser.employeeCode
      }
    });
  } catch (error) {
    console.error('❌ UPDATE COMPANY NAME FAILED:', error);
    res.status(500).json({ 
      message: 'Failed to update company name',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== TEST COMPANY ENDPOINT ===================== */
router.get('/test-company', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name email companyName employeeCode role');
    
    res.json({
      message: 'User company data',
      user,
      hasCompanyName: !!user.companyName,
      companyName: user.companyName || 'Not specified',
      companyNameLength: user.companyName ? user.companyName.length : 0,
      isCompanyNameEmpty: user.companyName === '' || user.companyName === null || user.companyName === undefined
    });
  } catch (error) {
    console.error('❌ TEST COMPANY FAILED:', error);
    res.status(500).json({ 
      message: 'Failed to fetch company data',
      error: error.message 
    });
  }
});

export default router;