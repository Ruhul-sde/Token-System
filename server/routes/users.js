
import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('department');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { department, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { department, role },
      { new: true }
    ).select('-password').populate('department');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
