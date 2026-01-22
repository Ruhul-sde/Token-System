import express from 'express';
import Department from '../models/Department.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * =========================
 * GET ALL DEPARTMENTS
 * =========================
 */
router.get('/', authenticate, async (req, res) => {
  try {
    let query = {};

    // Admin sees only their department
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

/**
 * =========================
 * CREATE DEPARTMENT
 * (superadmin only)
 * =========================
 */
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, description } = req.body;

    const department = new Department({
      name,
      description,
      categories: []
    });

    await department.save();
    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * =========================
 * UPDATE DEPARTMENT
 * =========================
 */
router.patch('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, description } = req.body;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, description },
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

/**
 * =========================
 * ADD CATEGORY TO DEPARTMENT
 * =========================
 */
router.post(
  '/:departmentId/categories',
  authenticate,
  authorize('superadmin'),
  async (req, res) => {
    try {
      const { name, description, subCategories } = req.body;

      const department = await Department.findById(req.params.departmentId);
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      // Prevent duplicate category name per department
      const exists = department.categories.some(
        c => c.name.toLowerCase() === name.toLowerCase()
      );

      if (exists) {
        return res.status(400).json({ message: 'Category already exists' });
      }

      department.categories.push({
        name,
        description,
        subCategories
      });

      await department.save();
      res.status(201).json(department);
    } catch (error) {
      console.error('Error adding category:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * =========================
 * UPDATE CATEGORY
 * =========================
 */
router.patch(
  '/:departmentId/categories/:categoryId',
  authenticate,
  authorize('superadmin'),
  async (req, res) => {
    try {
      const { name, description, subCategories } = req.body;

      const department = await Department.findById(req.params.departmentId);
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      const category = department.categories.id(req.params.categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      if (name) category.name = name;
      if (description) category.description = description;
      if (subCategories) category.subCategories = subCategories;

      await department.save();
      res.json(department);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * =========================
 * DELETE CATEGORY
 * =========================
 */
router.delete(
  '/:departmentId/categories/:categoryId',
  authenticate,
  authorize('superadmin'),
  async (req, res) => {
    try {
      const department = await Department.findById(req.params.departmentId);
      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      department.categories = department.categories.filter(
        c => c._id.toString() !== req.params.categoryId
      );

      await department.save();
      res.json(department);
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * =========================
 * DELETE DEPARTMENT
 * =========================
 */
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
