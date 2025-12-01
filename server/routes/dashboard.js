
import express from 'express';
import Token from '../models/Token.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const totalTokens = await Token.countDocuments();
    const solvedTokens = await Token.countDocuments({ status: 'resolved' });
    const pendingTokens = await Token.countDocuments({ status: 'pending' });
    const assignedTokens = await Token.countDocuments({ status: 'assigned' });

    const solverStats = await Token.aggregate([
      { $match: { status: 'resolved' } },
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

    const recentTokens = await Token.find()
      .populate(['createdBy', 'solvedBy', 'assignedTo', 'department'])
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      overview: {
        totalTokens,
        solvedTokens,
        pendingTokens,
        assignedTokens
      },
      solverStats,
      recentTokens
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
