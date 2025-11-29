
import express from 'express';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendEmailNotification } from '../utils/email.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, priority, department, category, subCategory, attachments, reason } = req.body;
    
    const token = new Token({
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
    await token.populate(['createdBy', 'department']);

    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    for (const admin of admins) {
      await sendEmailNotification(admin.email, token);
    }

    res.status(201).json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'user') {
      query.createdBy = req.user._id;
    } else if (req.user.role === 'admin') {
      if (req.user.department) {
        query.department = req.user.department._id;
      }
    }

    const tokens = await Token.find(query)
      .populate(['createdBy', 'assignedTo', 'solvedBy', 'department'])
      .sort({ createdAt: -1 });
    
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/solve', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    const solvedAt = new Date();
    const timeToSolve = Math.floor((solvedAt - token.createdAt) / 1000 / 60);

    token.status = 'solved';
    token.solvedBy = req.user._id;
    token.solvedAt = solvedAt;
    token.timeToSolve = timeToSolve;

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']);

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/assign', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { assignedTo, department } = req.body;
    
    const token = await Token.findByIdAndUpdate(
      req.params.id,
      { assignedTo, department, status: 'assigned' },
      { new: true }
    ).populate(['createdBy', 'assignedTo', 'solvedBy', 'department']);

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/update', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status, priority, assignedTo, expectedResolutionDate, actualResolutionDate } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (expectedResolutionDate) updateData.expectedResolutionDate = expectedResolutionDate;
    if (actualResolutionDate) updateData.actualResolutionDate = actualResolutionDate;

    if (status === 'closed' || status === 'resolved') {
      updateData.solvedBy = req.user._id;
      updateData.solvedAt = new Date();
      const token = await Token.findById(req.params.id);
      if (token) {
        updateData.timeToSolve = Math.floor((new Date() - token.createdAt) / 1000 / 60);
      }
    }

    const token = await Token.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate(['createdBy', 'assignedTo', 'solvedBy', 'department']);

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/remarks', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { text } = req.body;
    
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    token.remarks.push({
      text,
      addedBy: req.user._id,
      addedAt: new Date()
    });

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department', 'remarks.addedBy']);

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/attachments', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { filename, url } = req.body;
    
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    token.adminAttachments.push({
      filename,
      url,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    });

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']);

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    if (token.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this token' });
    }

    const { title, description, priority, category, subCategory, reason, attachments } = req.body;
    
    if (title) token.title = title;
    if (description) token.description = description;
    if (priority) token.priority = priority;
    if (category) token.category = category;
    if (subCategory !== undefined) token.subCategory = subCategory;
    if (reason !== undefined) token.reason = reason;
    if (attachments) token.attachments = attachments;

    await token.save();
    await token.populate(['createdBy', 'assignedTo', 'solvedBy', 'department']);

    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/feedback', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const token = await Token.findById(req.params.id);
    
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    if (token.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to provide feedback for this token' });
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
