// routes/departments.js
import express from 'express';
import Department from '../models/Department.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET all departments
router.get('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
});

// GET single department
router.get('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    res.json({
      success: true,
      department
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
      error: error.message
    });
  }
});

// CREATE department
router.post('/', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, description, categories } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }
    
    // Check if department already exists
    const existingDept = await Department.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    
    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: 'Department with this name already exists'
      });
    }
    
    const department = new Department({
      name: name.trim(),
      description: description?.trim(),
      categories: Array.isArray(categories) ? categories : []
    });
    
    await department.save();
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: error.message
    });
  }
});

// UPDATE department
router.put('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { name, description, categories } = req.body;
    
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    
    // Update fields
    if (name !== undefined) department.name = name.trim();
    if (description !== undefined) department.description = description?.trim();
    if (categories !== undefined) {
      department.categories = Array.isArray(categories) ? categories : [];
    }
    
    await department.save();
    
    res.json({
      success: true,
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: error.message
    });
  }
});

// DELETE department
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
});

export default router;