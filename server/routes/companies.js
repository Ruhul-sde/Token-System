import express from 'express';
import Company from '../models/Company.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js'; // ✅ FIXED
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get all companies with analytics
 */
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const companies = await Company.find().sort({ totalTickets: -1 });
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
});

/**
 * Get single company details
 */
router.get('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get employees by company domain
    const employees = await User.find({
      email: new RegExp(`@${company.domain}$`, 'i')
    }).select('-password');

    // Get tickets created by company employees
    const tickets = await Ticket.find({
      createdBy: { $in: employees.map(e => e._id) }
    }).populate(['createdBy', 'assignedTo', 'department']);

    res.json({ company, employees, tickets });
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({
      message: 'Failed to fetch company details',
      error: error.message
    });
  }
});

/**
 * Refresh company analytics
 */
router.post('/refresh', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'superadmin' } });

    // Group users by email domain
    const domainMap = {};
    users.forEach(user => {
      const domain = user.email.split('@')[1];
      if (!domainMap[domain]) domainMap[domain] = [];
      domainMap[domain].push(user);
    });

    const companies = [];

    for (const [domain, domainUsers] of Object.entries(domainMap)) {
      const userIds = domainUsers.map(u => u._id);

      // Get tickets for company users
      const tickets = await Ticket.find({ createdBy: { $in: userIds } });

      const resolvedTickets = tickets.filter(t => t.status === 'resolved');
      const pendingTickets = tickets.filter(t => t.status === 'pending');

      // Support time calculation
      const ticketsWithTime = resolvedTickets.filter(
        t => t.timeToSolve && t.timeToSolve > 0
      );
      const totalSupportTime = ticketsWithTime.reduce(
        (sum, t) => sum + t.timeToSolve,
        0
      );
      const averageSupportTime =
        ticketsWithTime.length > 0
          ? totalSupportTime / ticketsWithTime.length
          : 0;

      // Rating calculation
      const ticketsWithRating = tickets.filter(t => t.feedback?.rating);
      const totalRating = ticketsWithRating.reduce(
        (sum, t) => sum + t.feedback.rating,
        0
      );
      const averageRating =
        ticketsWithRating.length > 0
          ? totalRating / ticketsWithRating.length
          : 0;

      const companyName =
        domainUsers[0].companyName || domain.split('.')[0].toUpperCase();

      // Upsert company analytics
      const company = await Company.findOneAndUpdate(
        { domain },
        {
          name: companyName,
          domain,
          employeeCount: domainUsers.length,
          totalTickets: tickets.length,
          resolvedTickets: resolvedTickets.length,
          pendingTickets: pendingTickets.length,
          totalSupportTime,
          averageSupportTime,
          averageRating,
          totalFeedbacks: ticketsWithRating.length
        },
        { upsert: true, new: true }
      );

      companies.push(company);
    }

    res.json({
      message: 'Companies refreshed successfully',
      companies
    });
  } catch (error) {
    console.error('Error refreshing companies:', error);
    res.status(500).json({
      message: 'Failed to refresh companies',
      error: error.message
    });
  }
});

/**
 * Update company name
 */
router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name } = req.body;

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({
      message: 'Failed to update company',
      error: error.message
    });
  }
});

export default router;
