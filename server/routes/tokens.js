import express from 'express';
import mongoose from 'mongoose';
import Token from '../models/Token.js';
import { authenticate, authorize } from '../middleware/auth.js';
import Department from '../models/Department.js';
import { generateTokenNumber } from '../utils/tokenGenerator.js'; // Imported the token generator utility
import { sendEmailNotification } from '../utils/email.js';
import User from '../models/User.js'; // Assuming User model is needed for fetching admins

const router = express.Router();

// Middleware to validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid token ID format' });
  }
  next();
};

// Admin/SuperAdmin creating token on behalf of user
router.post('/on-behalf', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { title, description, priority, department, category, subCategory, attachments, reason, userDetails } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    if (!userDetails || !userDetails.name || !userDetails.email) {
      return res.status(400).json({ message: 'User name and email are required' });
    }

    // Validate title and description length
    if (title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({ message: 'Title must be between 3 and 200 characters' });
    }

    if (description.trim().length < 10 || description.trim().length > 2000) {
      return res.status(400).json({ message: 'Description must be between 10 and 2000 characters' });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority value' });
    }

    // Validate department exists if provided
    let deptExists = null;
    if (department) {
      deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(400).json({ message: 'Invalid department' });
      }

      // Validate category exists in department if provided
      if (category) {
        const categoryExists = deptExists.categories.some(cat => cat.name === category);
        if (!categoryExists) {
          return res.status(400).json({ message: 'Invalid category for selected department' });
        }
      }
    }

    // Check if user exists, if not create a temporary user record
    let user = await User.findOne({ email: userDetails.email.toLowerCase() });
    
    if (!user) {
      // Create a new user account
      const bcrypt = (await import('bcryptjs')).default;
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      user = new User({
        email: userDetails.email.toLowerCase(),
        password: hashedPassword,
        name: userDetails.name,
        employeeCode: userDetails.employeeCode || undefined,
        companyName: userDetails.companyName || undefined,
        role: 'user',
        department: department || undefined
      });
      
      await user.save();
      
      // Send email with credentials (if email service is configured)
      try {
        await sendEmailNotification(user.email, null, {
          subject: 'Account Created - Support Token System',
          text: `Your account has been created by an administrator.\n\nEmail: ${user.email}\nTemporary Password: ${tempPassword}\n\nPlease login and change your password.`
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    // Generate token number
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    let deptInitial = 'G';
    if (department) {
      const dept = await Department.findById(department);
      if (dept) {
        deptInitial = dept.name ? dept.name.charAt(0).toUpperCase() : 'G';
      }
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayCount = await Token.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
      department: department || null
    });

    const sequenceNumber = String(todayCount + 1).padStart(3, '0');
    const tokenNumber = `T${year}${month}${day}${deptInitial}${sequenceNumber}`;

    const token = new Token({
      tokenNumber,
      title,
      description,
      priority,
      department: department || null,
      category,
      subCategory,
      attachments,
      reason: reason || `Created on behalf of user by ${req.user.name}`,
      createdBy: user._id
    });

    await token.save();
    await token.populate(['createdBy', 'department']);

    // Notify admins about the new token
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    for (const admin of admins) {
      await sendEmailNotification(admin.email, token);
    }

    res.status(201).json({ 
      token,
      message: user.isNew ? 'Token created and user account created' : 'Token created successfully'
    });
  } catch (error) {
    console.error('Error creating token on behalf:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, priority, department, category, subCategory, attachments, reason } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Validate title and description length
    if (title.trim().length < 3 || title.trim().length > 200) {
      return res.status(400).json({ message: 'Title must be between 3 and 200 characters' });
    }

    if (description.trim().length < 10 || description.trim().length > 2000) {
      return res.status(400).json({ message: 'Description must be between 10 and 2000 characters' });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority value' });
    }

    // Validate department exists if provided
    let deptExists = null;
    if (department) {
      deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(400).json({ message: 'Invalid department' });
      }

      // Validate category exists in department if provided
      if (category) {
        const categoryExists = deptExists.categories.some(cat => cat.name === category);
        if (!categoryExists) {
          return res.status(400).json({ message: 'Invalid category for selected department' });
        }
      }
    }

    // Generate token number: TYYMMDDIT001
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Get department initial (default to 'IT' for Information Technology or general if no department)
    let deptInitial = 'G'; // Default to 'G' for General
    if (department) {
      const dept = await Department.findById(department);
      if (dept) {
        // Using the first letter of the department name, or a default if name is empty
        deptInitial = dept.name ? dept.name.charAt(0).toUpperCase() : 'G';
      }
    }

    // Find the count of tokens created today for this department to ensure uniqueness
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayCount = await Token.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
      department: department || null // Count tokens for the specific department or all if department is null
    });

    const sequenceNumber = String(todayCount + 1).padStart(3, '0');
    const tokenNumber = `T${year}${month}${day}${deptInitial}${sequenceNumber}`; // Formatted token number

    console.log('===== TOKEN CREATION DEBUG =====');
    console.log('Creating token with department:', department);
    console.log('Department name:', deptExists?.name);

    const token = new Token({
      tokenNumber,
      title,
      description,
      priority,
      department: department || null,
      category,
      subCategory,
      attachments,
      reason,
      createdBy: req.user._id
    });

    await token.save();
    await token.populate(['createdBy', 'department']); // Populate related fields

    console.log('Token created successfully:', {
      id: token._id.toString().slice(-6),
      tokenNumber: token.tokenNumber,
      departmentId: token.department?._id?.toString().slice(-6) || 'none',
      departmentName: token.department?.name || 'Unassigned',
      createdBy: token.createdBy?.name
    });
    console.log('================================');

    // Notify admins about the new token
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    for (const admin of admins) {
      await sendEmailNotification(admin.email, token); // Send email notification to admins
    }

    res.status(201).json(token);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.get('/:id', authenticate, validateObjectId, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id)
      .populate(['createdBy', 'assignedTo', 'solvedBy', 'department', 'remarks.addedBy', 'adminAttachments.uploadedBy']);

    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    // Authorization check
    const isCreator = token.createdBy._id.toString() === req.user._id.toString();
    const isAssigned = token.assignedTo && token.assignedTo._id.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isDepartmentAdmin = req.user.role === 'admin' && req.user.department &&
                              token.department && req.user.department.toString() === token.department._id.toString();

    if (!isCreator && !isAssigned && !isAdmin && !isDepartmentAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this token' });
    }

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};

    console.log('===== TOKEN FETCH DEBUG =====');
    console.log('User:', req.user.email);
    console.log('User Role:', req.user.role);
    console.log('User Department ID:', req.user.department?.toString() || 'None');

    // Role-based filtering
    if (req.user.role === 'user') {
      // Users see only tokens they created
      query.createdBy = req.user._id;
      console.log('→ User: Showing only own tokens');
    } else if (req.user.role === 'admin') {
      // Admins see all tokens in their department, or all tokens if no department assigned
      if (req.user.department) {
        const deptId = typeof req.user.department === 'string' 
          ? new mongoose.Types.ObjectId(req.user.department)
          : req.user.department;
        query.department = deptId;
        console.log('→ Admin: Showing tokens in department:', deptId.toString());
      } else {
        console.log('→ Admin: No department assigned - showing ALL tokens');
        // No restriction - admins without department see all tokens
      }
    } else if (req.user.role === 'superadmin') {
      // Super admins see ALL tokens - no filtering
      console.log('→ Superadmin: Showing ALL tokens');
    }

    console.log('Query:', JSON.stringify(query));

    const tokens = await Token.find(query)
      .populate(['createdBy', 'assignedTo', 'solvedBy', 'department'])
      .sort({ createdAt: -1 });

    console.log(`✓ Found ${tokens.length} tokens for ${req.user.role}`);
    
    if (tokens.length > 0) {
      console.log('First 3 tokens:');
      tokens.slice(0, 3).forEach(t => {
        console.log(`  - ${t.tokenNumber}: ${t.title} (Dept: ${t.department?.name || 'None'}) Created by: ${t.createdBy?.name}`);
      });
    } else {
      const totalCount = await Token.countDocuments({});
      console.log(`⚠️ No tokens returned but ${totalCount} total tokens exist in database`);
      if (req.user.role === 'admin' && !req.user.department) {
        console.log('💡 Admin needs a department assignment to see tokens');
      }
    }
    console.log('=============================');

    res.json(tokens);
  } catch (error) {
    console.error('❌ Error fetching tokens:', error);
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/solve', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);

    if (!token) {
      return res.status(404).json({ message: 'Token not found' }); // Token not found error
    }

    const solvedAt = new Date();
    const timeToSolve = solvedAt - new Date(token.createdAt); // Calculate time to solve in milliseconds

    token.status = 'resolved';
    token.solvedBy = req.user._id;
    token.solvedAt = solvedAt;
    token.timeToSolve = timeToSolve;

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

    console.log(`Time to solve for token ${token.tokenNumber}: ${timeToSolve}ms`);

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.patch('/:id/assign', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const { assignedTo, department } = req.body;

    // Validate token exists
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    // Validate assignedTo user exists and is admin/superadmin
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(400).json({ message: 'Assigned user not found' });
      }
      if (!['admin', 'superadmin'].includes(assignedUser.role)) {
        return res.status(400).json({ message: 'Can only assign to admin or superadmin users' });
      }
    }

    // Validate department exists
    if (department) {
      const deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(400).json({ message: 'Invalid department' });
      }
    }

    const updatedToken = await Token.findByIdAndUpdate(
      req.params.id,
      { assignedTo, department, status: 'assigned' },
      { new: true }
    ).populate(['createdBy', 'assignedTo', 'solvedBy', 'department']);

    res.json(updatedToken);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.patch('/:id/update', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const { status, priority, assignedTo, expectedResolutionDate, actualResolutionDate, solution } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (expectedResolutionDate) updateData.expectedResolutionDate = expectedResolutionDate;
    if (actualResolutionDate) updateData.actualResolutionDate = actualResolutionDate;

    // If status is closed or resolved, set solvedBy and calculate timeToSolve
    if (status === 'closed' || status === 'resolved') {
      // Validate that solution is provided
      if (!solution || solution.trim().length === 0) {
        return res.status(400).json({ message: 'Solution is required to mark token as resolved' });
      }
      if (solution.trim().length < 10) {
        return res.status(400).json({ message: 'Solution must be at least 10 characters long' });
      }
      
      updateData.solution = solution;
      updateData.solvedBy = req.user._id;
      updateData.solvedAt = new Date();
      const token = await Token.findById(req.params.id); // Fetch token to calculate time difference
      if (token) {
        // Calculate time difference in milliseconds
        const timeInMs = new Date() - new Date(token.createdAt);
        updateData.timeToSolve = timeInMs; // Store in milliseconds
        console.log(`Time to solve for token ${token.tokenNumber}: ${timeInMs}ms`);
      }
    }

    const token = await Token.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // Return the updated document
    ).populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Populate related fields

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.post('/:id/remarks', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const { text } = req.body;

    // Validate remark text
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Remark text is required' });
    }

    if (text.trim().length > 1000) {
      return res.status(400).json({ message: 'Remark text must not exceed 1000 characters' });
    }

    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' }); // Token not found error
    }

    token.remarks.push({
      text,
      addedBy: req.user._id,
      addedAt: new Date()
    });

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department', 'remarks.addedBy']); // Repopulate with remarks

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.post('/:id/attachments', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const { filename, url } = req.body;

    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' }); // Token not found error
    }

    token.adminAttachments.push({
      filename,
      url,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    });

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.patch('/:id', authenticate, validateObjectId, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);

    if (!token) {
      return res.status(404).json({ message: 'Token not found' }); // Token not found error
    }

    // Authorization check: only the creator can edit their token
    if (token.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this token' });
    }

    const { title, description, priority, category, subCategory, reason, attachments } = req.body;

    // Update token fields if provided
    if (title) token.title = title;
    if (description) token.description = description;
    if (priority) token.priority = priority;
    if (category) token.category = category;
    if (subCategory !== undefined) token.subCategory = subCategory;
    if (reason !== undefined) token.reason = reason;
    if (attachments) token.attachments = attachments;

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.post('/:id/feedback', authenticate, validateObjectId, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Validate comment if provided
    if (comment && comment.trim().length > 500) {
      return res.status(400).json({ message: 'Comment must not exceed 500 characters' });
    }

    const token = await Token.findById(req.params.id);

    if (!token) {
      return res.status(404).json({ message: 'Token not found' }); // Token not found error
    }

    // Check if token is resolved, closed, or solved before allowing feedback
    if (!['resolved', 'closed', 'solved'].includes(token.status)) {
      return res.status(400).json({ message: 'Feedback can only be provided for resolved or solved tokens' });
    }

    // Authorization check: only the creator can provide feedback
    if (token.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to provide feedback for this token' });
    }

    // Check if feedback already exists
    if (token.feedback && token.feedback.rating) {
      return res.status(400).json({ message: 'Feedback has already been submitted for this token' });
    }

    token.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']);

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;