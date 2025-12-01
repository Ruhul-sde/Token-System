import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('department');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Check if user is suspended or frozen
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact administrator.' });
    }

    if (user.status === 'frozen') {
      return res.status(403).json({ message: 'Your account has been frozen. Please contact administrator.' });
    }

    console.log('Authenticated user:', {
      email: user.email,
      role: user.role,
      status: user.status,
      deptId: user.department?._id?.toString() || 'none',
      deptName: user.department?.name || 'none'
    });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};