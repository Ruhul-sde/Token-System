import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  contactPerson: {
    type: String
  },
  contactEmail: {
    type: String
  },
  contactPhone: {
    type: String
  },
  
  // ERP Details (Header Level - Non-editable after initial setup)
  erpDetails: {
    erpName: {
      type: String,
      enum: ['SAP B1', 'CREST', 'SFA', null],
      default: null
    },
    sapB1VersionType: {
      type: String,
      enum: ['HANA', 'SQL', null],
      default: null
    },
    sapB1VersionAndFP: {
      type: String,
      default: ''
    },
    sapLicenseAMC: {
      type: String,
      enum: ['Active', 'Terminated', null],
      default: null
    },
    sapSupportAMC: {
      status: {
        type: String,
        enum: ['Active', 'Suspended', null],
        default: null
      },
      fromDate: {
        type: Date
      },
      toDate: {
        type: Date
      }
    },
    sapSupportAMCType: {
      type: String,
      enum: ['Limited', 'Unlimited', null],
      default: null
    },
    erpIncidentTypes: [{
      type: String,
      enum: ['Functional / Transactional', 'Technical / Connection', 'Add-Ons']
    }]
  },
  
  // Company Analytics
  employeeCount: {
    type: Number,
    default: 0
  },
  totalTickets: {
    type: Number,
    default: 0
  },
  resolvedTickets: {
    type: Number,
    default: 0
  },
  pendingTickets: {
    type: Number,
    default: 0
  },
  totalSupportTime: {
    type: Number,
    default: 0
  },
  averageSupportTime: {
    type: Number,
    default: 0
  },
  
  // Company Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'frozen'],
    default: 'active'
  },
  statusReason: {
    type: String
  },
  statusChangedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  statusChangedAt: {
    type: Date
  },
  
  // Ratings & Feedback
  averageRating: {
    type: Number,
    default: 0
  },
  totalFeedbacks: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Update timestamp on save
companySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
companySchema.index({ name: 1 });
companySchema.index({ domain: 1 });
companySchema.index({ 'erpDetails.erpName': 1 });
companySchema.index({ status: 1 });

export default mongoose.model('Company', companySchema);