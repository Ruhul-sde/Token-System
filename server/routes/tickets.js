import express from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendEmailNotification } from '../utils/email.js';

const router = express.Router();

/* ===================== HELPERS ===================== */

const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  next();
};

const generateTicketNumber = async (department) => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  let deptInitial = 'G';
  if (department) {
    const dept = await Department.findById(department);
    if (dept?.name) deptInitial = dept.name.charAt(0).toUpperCase();
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const count = await Ticket.countDocuments({
    createdAt: { $gte: todayStart, $lt: todayEnd },
    department: department || null
  });

  const seq = String(count + 1).padStart(3, '0');
  return `T${year}${month}${day}${deptInitial}${seq}`;
};

/* ===================== CREATE TICKET ===================== */

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, priority, department, category, attachments, reason } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const ticketNumber = await generateTicketNumber(department);

    const ticket = new Ticket({
      type: 'ticket',
      ticketNumber,
      title,
      description,
      priority,
      department: department || null,
      category,
      attachments,
      reason,
      createdBy: req.user._id
    });

    await ticket.save();
    await ticket.populate(['createdBy', 'department']);

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== CREATE TOKEN (USER) ===================== */

router.post('/token', authenticate, async (req, res) => {
  try {
    const { title, description, priority, department, category, attachments, reason, supportingDocuments } = req.body;

    const ticketNumber = await generateTicketNumber(department);

    const token = new Ticket({
      type: 'token',
      ticketNumber,
      title,
      description,
      priority,
      department: department || null,
      category,
      attachments,
      supportingDocuments: supportingDocuments || [],
      reason,
      createdBy: req.user._id
    });

    await token.save();
    await token.populate(['createdBy', 'department']);

    res.status(201).json(token);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== CREATE TOKEN ON BEHALF ===================== */

router.post('/token/on-behalf', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { title, description, department, userDetails, supportingDocuments } = req.body;

    if (!userDetails?.email || !userDetails?.name) {
      return res.status(400).json({ message: 'User details required' });
    }

    let user = await User.findOne({ email: userDetails.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: userDetails.name,
        email: userDetails.email.toLowerCase(),
        role: 'user',
        department
      });
    }

    const ticketNumber = await generateTicketNumber(department);

    const token = new Ticket({
      type: 'token',
      ticketNumber,
      title,
      description,
      department,
      supportingDocuments: supportingDocuments || [],
      reason: `Created on behalf by ${req.user.name}`,
      createdBy: user._id
    });

    await token.save();
    await token.populate(['createdBy', 'department']);

    res.status(201).json(token);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== GET ALL ===================== */

router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'user') {
      query.createdBy = req.user._id;
    } else if (req.user.role === 'admin' && req.user.department) {
      query.department = req.user.department;
    }

    const tickets = await Ticket.find(query)
      .populate(['createdBy', 'assignedTo', 'solvedBy', 'department'])
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== GET BY ID ===================== */

router.get('/:id', authenticate, validateObjectId, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate(['createdBy', 'assignedTo', 'solvedBy', 'department', 'remarks.addedBy']);

    if (!ticket) return res.status(404).json({ message: 'Not found' });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== UPDATE STATUS ===================== */

router.patch('/:id/update', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate(['createdBy', 'assignedTo', 'department']);

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== REMARKS ===================== */

router.post('/:id/remarks', authenticate, authorize('admin', 'superadmin'), validateObjectId, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    ticket.remarks.push({ text: req.body.text, addedBy: req.user._id });
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===================== FEEDBACK ===================== */

router.post('/:id/feedback', authenticate, validateObjectId, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    ticket.feedback = {
      rating: req.body.rating,
      comment: req.body.comment,
      submittedAt: new Date()
    };
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
