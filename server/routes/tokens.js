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

    const token = new Token({
      tokenNumber,
      title,
      description,
      priority,
      department,
      category,
      subCategory,
      attachments,
      reason,
      createdBy: req.user._id
    });

    await token.save();
    await token.populate(['createdBy', 'department']); // Populate related fields

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

    // Filter tokens based on user role
    if (req.user.role === 'user') {
      query.createdBy = req.user._id; // User sees their own tokens
    } else if (req.user.role === 'admin') {
      if (req.user.department) {
        query.department = req.user.department; // Admin sees tokens for their department
      }
    }

    const tokens = await Token.find(query)
      .populate(['createdBy', 'assignedTo', 'solvedBy', 'department']) // Populate related user and department info
      .sort({ createdAt: -1 }); // Sort by creation date descending

    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.patch('/:id/solve', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);

    if (!token) {
      return res.status(404).json({ message: 'Token not found' }); // Token not found error
    }

    const solvedAt = new Date();
    const timeToSolve = Math.floor((solvedAt - token.createdAt) / 1000 / 60); // Calculate time to solve in minutes

    token.status = 'resolved';
    token.solvedBy = req.user._id;
    token.solvedAt = solvedAt;
    token.timeToSolve = timeToSolve;

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

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
    const { status, priority, assignedTo, expectedResolutionDate, actualResolutionDate } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (expectedResolutionDate) updateData.expectedResolutionDate = expectedResolutionDate;
    if (actualResolutionDate) updateData.actualResolutionDate = actualResolutionDate;

    // If status is closed or resolved, set solvedBy and calculate timeToSolve
    if (status === 'closed' || status === 'resolved') {
      updateData.solvedBy = req.user._id;
      updateData.solvedAt = new Date();
      const token = await Token.findById(req.params.id); // Fetch token to calculate time difference
      if (token) {
        updateData.timeToSolve = Math.floor((new Date() - token.createdAt) / 1000 / 60);
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

    // Check if token is resolved or closed before allowing feedback
    if (!['resolved', 'closed'].includes(token.status)) {
      return res.status(400).json({ message: 'Feedback can only be provided for resolved or closed tokens' });
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
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

export default router; // Export the router