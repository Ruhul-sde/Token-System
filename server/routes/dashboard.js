import express from 'express';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    let query = {};

    // If admin (not superadmin), filter by their department
    if (req.user.role === 'admin' && req.user.department) {
      query.department = req.user.department;
    }

    const totalTokens = await Token.countDocuments(query);
    const pendingTokens = await Token.countDocuments({ ...query, status: 'pending' });
    const assignedTokens = await Token.countDocuments({ ...query, status: 'assigned' });
    const solvedTokens = await Token.countDocuments({ ...query, status: 'resolved' });


    // Re-calculate solverStats with the department filter if applicable
    const solverStats = await Token.aggregate([
      { $match: { status: 'resolved', ...query } }, // Apply department filter here as well
      {
        $group: {
          _id: '$solvedBy',
          tokensSolved: { $sum: 1 },
          avgTimeToSolve: { $avg: '$timeToSolve' },
          totalTimeSpent: { $sum: '$timeToSolve' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'solver'
        }
      },
      { $unwind: '$solver' },
      {
        $project: {
          solverName: '$solver.name',
          solverEmail: '$solver.email',
          tokensSolved: 1,
          avgTimeToSolve: 1,
          totalTimeSpent: 1
        }
      }
    ]);

    // Re-fetch recentTokens with department filter if applicable
    let recentTokensQuery = Token.find().populate(['createdBy', 'solvedBy', 'assignedTo', 'department']).sort({ createdAt: -1 }).limit(10);
    if (req.user.role === 'admin' && req.user.department) {
      recentTokensQuery = recentTokensQuery.where('department').equals(req.user.department);
    }
    const recentTokens = await recentTokensQuery;


    res.json({
      overview: {
        totalTokens,
        pendingTokens,
        assignedTokens,
        resolvedTokens: solvedTokens,
        solvedTokens
      },
      departmentStats: solverStats, // Renamed from solverStats to departmentStats for clarity in this context
      recentTokens
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;