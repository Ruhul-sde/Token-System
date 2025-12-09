import express from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import { authenticate, authorize } from '../middleware/auth.js';
import Department from '../models/Department.js';
import { generateTicketNumber } from '../utils/ticketGenerator.js'; // Imported the ticket generator utility
import { sendEmailNotification, sendTicketCreatedEmail, sendTicketResolvedEmail } from '../utils/email.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware to validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ticket ID format' });
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

    // Generate ticket number: TYYMMDDIT001
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

    // Find the count of tickets created today for this department to ensure uniqueness
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayCount = await Ticket.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
      department: department || null // Count tickets for the specific department or all if department is null
    });

    const sequenceNumber = String(todayCount + 1).padStart(3, '0');
    const ticketNumber = `T${year}${month}${day}${deptInitial}${sequenceNumber}`; // Formatted ticket number

    console.log('===== TICKET CREATION DEBUG =====');
    console.log('Creating ticket with department:', department);
    console.log('Department name:', deptExists?.name);

    const ticket = new Ticket({
      ticketNumber,
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

    await ticket.save();
    await ticket.populate(['createdBy', 'department']); // Populate related fields

    console.log('Ticket created successfully:', {
      id: ticket._id.toString().slice(-6),
      ticketNumber: ticket.ticketNumber,
      departmentId: ticket.department?._id?.toString().slice(-6) || 'none',
      departmentName: ticket.department?.name || 'Unassigned',
      createdBy: ticket.createdBy?.name
    });
    console.log('================================');

    // Send email to the user who created the ticket
    if (ticket.createdBy && ticket.createdBy.email) {
      await sendTicketCreatedEmail(ticket.createdBy.email, ticket);
      console.log(`✅ Ticket creation email sent to: ${ticket.createdBy.email}`);
    }

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.get('/:id', authenticate, validateObjectId, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate(['createdBy', 'assignedTo', 'solvedBy', 'department', 'remarks.addedBy', 'adminAttachments.uploadedBy']);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Authorization check
    const isCreator = ticket.createdBy._id.toString() === req.user._id.toString();
    const isAssigned = ticket.assignedTo && ticket.assignedTo._id.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isDepartmentAdmin = req.user.role === 'admin' && req.user.department &&
                              ticket.department && req.user.department.toString() === ticket.department._id.toString();

    if (!isCreator && !isAssigned && !isAdmin && !isDepartmentAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};

    console.log('===== TICKET FETCH DEBUG =====');
    console.log('User:', req.user.email);
    console.log('User Role:', req.user.role);
    console.log('User Department ID:', req.user.department?.toString() || 'None');

    // Role-based filtering
    if (req.user.role === 'user') {
      // Users see only tickets they created
      query.createdBy = req.user._id;
      console.log('→ User: Showing only own tickets');
    } else if (req.user.role === 'admin') {
      // Admins see all tickets in their department, or all tickets if no department assigned
      if (req.user.department) {
        const deptId = typeof req.user.department === 'string'
          ? new mongoose.Types.ObjectId(req.user.department)
          : req.user.department;
        query.department = deptId;
        console.log('→ Admin: Showing tickets in department:', deptId.toString());
      } else {
        console.log('→ Admin: No department assigned - showing ALL tickets');
        // No restriction - admins without department see all tickets
      }
    } else if (req.user.role === 'superadmin') {
      // Super admins see ALL tickets - no filtering
      console.log('→ Superadmin: Showing ALL tickets');
    }

    console.log('Query:', JSON.stringify(query));

    const tickets = await Ticket.find(query)
      .populate(['createdBy', 'assignedTo', 'solvedBy', 'department'])
      .sort({ createdAt: -1 });

    console.log(`✓ Found ${tickets.length} tickets for ${req.user.role}`);

    if (tickets.length > 0) {
      console.log('First 3 tickets:');
      tickets.slice(0, 3).forEach(t => {
        console.log(`  - ${t.ticketNumber}: ${t.title} (Dept: ${t.department?.name || 'None'}) Created by: ${t.createdBy?.name}`);
      });
    } else {
      const totalCount = await Ticket.countDocuments({});
      console.log(`⚠️ No tickets returned but ${totalCount} total tickets exist in database`);
      if (req.user.role === 'admin' && !req.user.department) {
        console.log('💡 Admin needs a department assignment to see tickets');
      }
    }
    console.log('=============================');

    res.json(tickets);
  } catch (error) {
    console.error('❌ Error fetching tokens:', error);
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/solve', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' }); // Ticket not found error
    }

    const solvedAt = new Date();
    const timeToSolve = solvedAt - ticket.createdAt; // Calculate time to solve in milliseconds

    ticket.status = 'resolved';
    ticket.solvedBy = req.user._id;
    ticket.solvedAt = solvedAt;
    ticket.timeToSolve = timeToSolve;

    await ticket.save();
    await ticket.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

    // Send email notification when ticket is resolved
    if (ticket.createdBy && ticket.createdBy.email) {
      await sendTicketResolvedEmail(ticket.createdBy.email, ticket);
      console.log(`✅ Ticket resolution email sent to: ${ticket.createdBy.email}`);
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.patch('/:id/assign', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const { assignedTo, department } = req.body;

    // Validate ticket exists
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
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

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { assignedTo, department, status: 'assigned' },
      { new: true }
    ).populate(['createdBy', 'assignedTo', 'solvedBy', 'department']);

    res.json(updatedTicket);
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
        return res.status(400).json({ message: 'Solution is required to mark ticket as resolved' });
      }
      if (solution.trim().length < 10) {
        return res.status(400).json({ message: 'Solution must be at least 10 characters long' });
      }

      updateData.solution = solution;
      updateData.solvedBy = req.user._id;
      updateData.solvedAt = new Date();
      const ticket = await Ticket.findById(req.params.id); // Fetch ticket to calculate time difference
      if (ticket) {
        updateData.timeToSolve = new Date() - ticket.createdAt; // Store in milliseconds
      }
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // Return the updated document
    ).populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Populate related fields

    // Send email notification when ticket is resolved
    if ((status === 'resolved' || status === 'closed') && ticket.createdBy && ticket.createdBy.email) {
      await sendTicketResolvedEmail(ticket.createdBy.email, ticket);
      console.log(`✅ Ticket resolution email sent to: ${ticket.createdBy.email}`);
    }

    res.json(ticket);
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

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' }); // Ticket not found error
    }

    ticket.remarks.push({
      text,
      addedBy: req.user._id,
      addedAt: new Date()
    });

    await ticket.save();
    await ticket.populate(['createdBy', 'assignedTo', 'solvedBy', 'department', 'remarks.addedBy']); // Repopulate with remarks

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.post('/:id/attachments', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const { filename, url } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' }); // Ticket not found error
    }

    ticket.adminAttachments.push({
      filename,
      url,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    });

    await ticket.save();
    await ticket.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

router.patch('/:id', authenticate, validateObjectId, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' }); // Ticket not found error
    }

    // Authorization check: only the creator can edit their ticket
    if (ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this ticket' });
    }

    const { title, description, priority, category, subCategory, reason, attachments } = req.body;

    // Update ticket fields if provided
    if (title) ticket.title = title;
    if (description) ticket.description = description;
    if (priority) ticket.priority = priority;
    if (category) ticket.category = category;
    if (subCategory !== undefined) ticket.subCategory = subCategory;
    if (reason !== undefined) ticket.reason = reason;
    if (attachments) ticket.attachments = attachments;

    await ticket.save();
    await ticket.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

    res.json(ticket);
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

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' }); // Ticket not found error
    }

    // Check if ticket is resolved, closed, or solved before allowing feedback
    if (!['resolved', 'closed', 'solved'].includes(ticket.status)) {
      return res.status(400).json({ message: 'Feedback can only be provided for resolved or solved tickets' });
    }

    // Authorization check: only the creator can provide feedback
    if (ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to provide feedback for this ticket' });
    }

    // Check if feedback already exists
    if (ticket.feedback && ticket.feedback.rating) {
      return res.status(400).json({ message: 'Feedback has already been submitted for this ticket' });
    }

    ticket.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await ticket.save();
    await ticket.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']); // Repopulate after save

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message }); // Generic error handling
  }
});

export default router; // Export the router