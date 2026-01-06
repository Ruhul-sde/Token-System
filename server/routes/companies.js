import express from 'express';
import Company from '../models/Company.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/* =========================================================
   GET ALL COMPANIES (SUPER ADMIN)
========================================================= */
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

/* =========================================================
   GET SINGLE COMPANY DETAILS
========================================================= */
router.get('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // ✅ FIX: get employees by companyName (NOT domain)
    const employees = await User.find({
      companyName: company.name
    }).select('-password');

    const employeeIds = employees.map(e => e._id);

    const tickets = await Ticket.find({
      createdBy: { $in: employeeIds }
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

/* =========================================================
   REFRESH COMPANY ANALYTICS (🔥 MAIN FIX)
========================================================= */
router.post(
  '/refresh',
  authenticate,
  authorize('superadmin'),
  async (req, res) => {
    try {
      // ✅ Get all users with REAL company names
      const users = await User.find({
        role: { $ne: 'superadmin' },
        companyName: { $nin: [null, ''] }
      });

      // ✅ Group users by companyName
      const companyMap = {};
      users.forEach(user => {
        const key = user.companyName.trim();
        if (!companyMap[key]) companyMap[key] = [];
        companyMap[key].push(user);
      });

      const companies = [];

      for (const [companyName, companyUsers] of Object.entries(companyMap)) {
        const userIds = companyUsers.map(u => u._id);

        const tickets = await Ticket.find({
          createdBy: { $in: userIds }
        });

        const resolvedTickets = tickets.filter(t => t.status === 'resolved');
        const pendingTickets = tickets.filter(t => t.status === 'pending');

        // Support time
        const solvedWithTime = resolvedTickets.filter(
          t => t.timeToSolve && t.timeToSolve > 0
        );

        const totalSupportTime = solvedWithTime.reduce(
          (sum, t) => sum + t.timeToSolve,
          0
        );

        const averageSupportTime =
          solvedWithTime.length > 0
            ? totalSupportTime / solvedWithTime.length
            : 0;

        // Ratings
        const ratedTickets = tickets.filter(t => t.feedback?.rating);
        const averageRating =
          ratedTickets.length > 0
            ? ratedTickets.reduce(
                (sum, t) => sum + t.feedback.rating,
                0
              ) / ratedTickets.length
            : 0;

        // ✅ UPSERT COMPANY BY NAME (NOT DOMAIN)
        const company = await Company.findOneAndUpdate(
          { name: companyName },
          {
            name: companyName,
            employeeCount: companyUsers.length,
            totalTickets: tickets.length,
            resolvedTickets: resolvedTickets.length,
            pendingTickets: pendingTickets.length,
            totalSupportTime,
            averageSupportTime,
            averageRating,
            totalFeedbacks: ratedTickets.length,
            status: 'active'
          },
          { upsert: true, new: true }
        );

        companies.push(company);
      }

      res.json(companies);
    } catch (error) {
      console.error('Error refreshing companies:', error);
      res.status(500).json({
        message: 'Failed to refresh companies',
        error: error.message
      });
    }
  }
);

/* =========================================================
   UPDATE COMPANY (STATUS / NAME)
========================================================= */
router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, status, statusReason } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (status) {
      updateData.status = status;
      updateData.statusReason = statusReason;
      updateData.statusChangedBy = req.user._id;
      updateData.statusChangedAt = new Date();
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      updateData,
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
