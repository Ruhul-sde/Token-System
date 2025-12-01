import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    let query = {};

    // If admin (not superadmin), filter users by their department
    if (req.user.role === 'admin' && req.user.department) {
      query.department = req.user.department;
    }

    const users = await User.find(query).populate('department');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { department, role } = req.body;

    // Validate role if provided
    if (role && !['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { department, role },
      { new: true, runValidators: true }
    ).select('-password').populate('department');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

// Update user status (suspend/freeze/activate)
router.patch('/:id/status', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { status, reason } = req.body;

    // Validate status
    if (!['active', 'suspended', 'frozen'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active, suspended, or frozen' });
    }

    // Prevent self-suspension
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        status,
        statusReason: reason || '',
        statusChangedBy: req.user._id,
        statusChangedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password').populate(['department', 'statusChangedBy']);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
});

export default router;