import express from 'express';
import Department from '../models/Department.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all departments
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};

    // If admin (not superadmin), only show their department
    if (req.user.role === 'admin' && req.user.department) {
      query._id = req.user.department;
    }

    const departments = await Department.find(query);
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create department (superadmin only)
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const department = new Department({ name, description });
    await department.save();
    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update department (superadmin only)
router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, description, categories } = req.body;
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, description, categories },
      { new: true }
    );
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add category to department (superadmin only)
router.post('/:id/categories', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { category } = req.body;
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    if (!department.categories.includes(category)) {
      department.categories.push(category);
      await department.save();
    }
    res.json(department);
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: error.message });
  }
});

// Remove category from department (superadmin only)
router.delete('/:id/categories/:category', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    department.categories = department.categories.filter(c => c !== req.params.category);
    await department.save();
    res.json(department);
  } catch (error) {
    console.error('Error removing category:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete department (superadmin only)
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;