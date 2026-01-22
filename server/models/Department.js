// models/Department.js
import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  categories: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
departmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ status: 1 });

export default mongoose.model('Department', departmentSchema);