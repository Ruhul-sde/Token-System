// routes/tickets.js
import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Ticket from '../models/Ticket.js';
import Department from '../models/Department.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  sendTicketCreatedEmail,
  sendTicketResolvedEmail,
  sendTokenCompletedEmail
} from '../utils/email.js';

const router = express.Router();

/* ===================== HELPERS ===================== */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ===================== MULTER SETUP ===================== */
// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and document files are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  }
});

/* ===================== TICKET NUMBER GENERATION ===================== */
const generateTicketNumber = async (departmentId) => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  let deptInitial = 'G';

  if (departmentId && isValidObjectId(departmentId)) {
    const dept = await Department.findById(departmentId).lean();
    if (dept?.name) deptInitial = dept.name[0].toUpperCase();
  }

  const start = new Date(now.setHours(0, 0, 0, 0));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const count = await Ticket.countDocuments({
    createdAt: { $gte: start, $lt: end },
    ...(departmentId && { department: departmentId })
  });

  return `T${yy}${mm}${dd}${deptInitial}${String(count + 1).padStart(3, '0')}`;
};

/* ===================== CREATE TICKET ===================== */
router.post('/', authenticate, upload.array('attachments', 10), async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('=== TICKET CREATION REQUEST ===');
    console.log('Files received:', req.files?.length || 0);
    console.log('Body fields:', req.body);

    const {
      title,
      description,
      priority = 'medium',
      department,
      category,
      reason
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!department) {
      return res.status(400).json({ message: 'Department is required' });
    }

    const departmentId = isValidObjectId(department) ? department : null;
    const ticketNumber = await generateTicketNumber(departmentId);

    // Process uploaded files - store in database
    const attachments = req.files?.map(file => ({
      filename: `${Date.now()}-${file.originalname}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer, // Store buffer directly in database
      uploadedAt: new Date()
    })) || [];

    const ticket = await Ticket.create({
      ticketNumber,
      type: 'ticket',
      title: title.trim(),
      description: description.trim(),
      category: category || null,
      reason: reason || null,
      attachments,
      priority,
      department: departmentId,
      createdBy: req.user._id,
      status: 'pending'
    });

    await ticket.populate(['createdBy', 'department']);

    console.log('✅ Ticket created successfully:', ticket.ticketNumber);

    // 📧 Send email (non-blocking)
    if (ticket.createdBy?.email) {
      sendTicketCreatedEmail(ticket.createdBy.email, ticket)
        .catch(err => console.error('EMAIL ERROR:', err.message));
    }

    return res.status(201).json(ticket);

  } catch (error) {
    console.error('❌ CREATE TICKET FAILED:', error.message);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum 10MB.' });
      }
      return res.status(400).json({ message: error.message });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    // Handle duplicate ticket number
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate ticket number' });
    }
    
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== CREATE TICKET (JSON ALTERNATIVE) ===================== */
router.post('/json', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      title,
      description,
      priority = 'medium',
      department,
      category,
      reason,
      attachments = []
    } = req.body;

    console.log('JSON Ticket creation:', { title, description, department });

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }
    if (!department) {
      return res.status(400).json({ message: 'Department is required' });
    }

    const departmentId = isValidObjectId(department) ? department : null;
    const ticketNumber = await generateTicketNumber(departmentId);

    const ticket = await Ticket.create({
      ticketNumber,
      type: 'ticket',
      title: title.trim(),
      description: description.trim(),
      category: category || null,
      reason: reason || null,
      attachments,
      priority,
      department: departmentId,
      createdBy: req.user._id,
      status: 'pending'
    });

    await ticket.populate(['createdBy', 'department']);

    console.log('✅ JSON Ticket created successfully:', ticket.ticketNumber);

    // 📧 Send email
    if (ticket.createdBy?.email) {
      sendTicketCreatedEmail(ticket.createdBy.email, ticket)
        .catch(err => console.error('EMAIL ERROR:', err.message));
    }

    return res.status(201).json(ticket);

  } catch (error) {
    console.error('❌ JSON TICKET CREATION FAILED:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== DOWNLOAD ATTACHMENT ===================== */
router.get('/:ticketId/attachment/:attachmentId', authenticate, async (req, res) => {
  try {
    const { ticketId, attachmentId } = req.params;
    
    // Validate IDs
    if (!isValidObjectId(ticketId) || !isValidObjectId(attachmentId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Find the attachment
    const attachment = ticket.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Check permissions
    if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }
    
    // Set headers
    const filename = encodeURIComponent(attachment.originalName || attachment.filename);
    res.set({
      'Content-Type': attachment.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': attachment.size,
      'Cache-Control': 'private, max-age=3600'
    });
    
    // Send file buffer
    res.send(attachment.data);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      message: 'Failed to download file', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/* ===================== VIEW/GET ATTACHMENT INLINE ===================== */
router.get('/:ticketId/view/:attachmentId', authenticate, async (req, res) => {
  try {
    const { ticketId, attachmentId } = req.params;
    
    // Validate IDs
    if (!isValidObjectId(ticketId) || !isValidObjectId(attachmentId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Find the attachment
    const attachment = ticket.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Check permissions
    if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }
    
    // Check if file type can be displayed inline (images, PDFs)
    const viewableTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    const canDisplayInline = viewableTypes.includes(attachment.mimeType);
    
    // Set headers
    const filename = encodeURIComponent(attachment.originalName || attachment.filename);
    res.set({
      'Content-Type': attachment.mimeType || 'application/octet-stream',
      'Content-Disposition': canDisplayInline ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`,
      'Content-Length': attachment.size,
      'Cache-Control': 'private, max-age=3600'
    });
    
    // Send file buffer
    res.send(attachment.data);
    
  } catch (error) {
    console.error('View file error:', error);
    res.status(500).json({ 
      message: 'Failed to view file', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/* ===================== GET ATTACHMENT INFO (METADATA ONLY) ===================== */
router.get('/:ticketId/attachments', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Validate ID
    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findById(ticketId).select('attachments createdBy department');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check permissions
    if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }
    
    // Return attachments without file data (just metadata)
    const attachments = ticket.attachments.map(att => ({
      _id: att._id,
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      uploadedAt: att.uploadedAt
    }));
    
    res.status(200).json({ attachments });
    
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ 
      message: 'Failed to get attachments', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/* ===================== DELETE ATTACHMENT ===================== */
router.delete('/:ticketId/attachment/:attachmentId', authenticate, async (req, res) => {
  try {
    const { ticketId, attachmentId } = req.params;
    
    // Validate IDs
    if (!isValidObjectId(ticketId) || !isValidObjectId(attachmentId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check permissions - only ticket creator or admin/superadmin can delete
    if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }
    
    // Find and remove the attachment
    const attachment = ticket.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    ticket.attachments.pull(attachmentId);
    await ticket.save();
    
    res.status(200).json({ 
      message: 'Attachment deleted successfully',
      ticketId,
      attachmentId
    });
    
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ 
      message: 'Failed to delete attachment', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/* ===================== ADD ATTACHMENTS TO EXISTING TICKET ===================== */
router.post('/:ticketId/attachments', authenticate, upload.array('attachments', 10), async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Validate ID
    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check permissions
    if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }
    
    // Check if any files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    // Process uploaded files
    const newAttachments = req.files.map(file => ({
      filename: `${Date.now()}-${file.originalname}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
      uploadedAt: new Date()
    }));
    
    // Add new attachments to ticket
    ticket.attachments.push(...newAttachments);
    await ticket.save();
    
    // Get updated attachments without file data
    const attachments = ticket.attachments.map(att => ({
      _id: att._id,
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      uploadedAt: att.uploadedAt
    }));
    
    res.status(200).json({
      message: 'Attachments added successfully',
      count: newAttachments.length,
      attachments
    });
    
  } catch (error) {
    console.error('Add attachments error:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum 10MB.' });
      }
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to add attachments', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/* ===================== GET ALL TICKETS ===================== */
router.get('/', authenticate, async (req, res) => {
  try {
    const query = {};

    // USER → own tickets
    if (req.user.role === 'user') {
      query.createdBy = req.user._id;
    }

    // ADMIN → department tickets
    if (req.user.role === 'admin' && req.user.department) {
      const deptId = req.user.department._id || req.user.department;
      if (isValidObjectId(deptId)) {
        query.department = deptId;
      }
    }

    // SUPERADMIN → all tickets (no filter)

    const tickets = await Ticket.find(query)
      .populate([
        { path: 'createdBy', select: 'name email companyName' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'solvedBy', select: 'name email' },
        { path: 'department', select: 'name description categories' },
        { path: 'remarks.addedBy', select: 'name email' }
      ])
      .select('-attachments.data -adminAttachments.data') // Exclude file data for performance
      .sort({ createdAt: -1 })
      .lean();

    // Add attachment count to each ticket
    const ticketsWithAttachmentCount = tickets.map(ticket => ({
      ...ticket,
      attachmentCount: ticket.attachments?.length || 0,
      attachments: undefined // Remove attachments array from response
    }));

    console.log(`📊 Found ${tickets.length} tickets for user ${req.user._id}`);

    return res.status(200).json(ticketsWithAttachmentCount);

  } catch (error) {
    console.error('❌ GET TICKETS FAILED:', error);
    return res.status(500).json({
      message: 'Failed to load tickets',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== GET SINGLE TICKET ===================== */
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await Ticket.findById(req.params.id)
      .populate([
        { path: 'createdBy', select: 'name email companyName' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'solvedBy', select: 'name email' },
        { path: 'department', select: 'name description categories' },
        { path: 'remarks.addedBy', select: 'name email' },
        { path: 'adminAttachments.uploadedBy', select: 'name email' }
      ])
      .select('-attachments.data -adminAttachments.data'); // Exclude file data

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check permissions
    if (req.user.role === 'user' && ticket.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }

    return res.status(200).json(ticket);

  } catch (error) {
    console.error('❌ GET TICKET FAILED:', error);
    return res.status(500).json({
      message: 'Failed to load ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== UPDATE TICKET STATUS ===================== */
router.patch('/:id/status', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const { status, solution, remarks } = req.body;

    // Find ticket first
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'email name');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }

    const updateData = {};
    
    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.solvedAt = new Date();
        updateData.solvedBy = req.user._id;
        updateData.timeToSolve = new Date() - ticket.createdAt;
      }
    }
    
    if (solution) {
      updateData.solution = solution;
    }
    
    if (remarks && remarks.trim()) {
      const newRemark = {
        text: remarks.trim(),
        addedBy: req.user._id
      };
      updateData.$push = { remarks: newRemark };
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate(['createdBy', 'department', 'solvedBy'])
     .select('-attachments.data -adminAttachments.data');

    // Send email if resolved
    if (status === 'resolved' && ticket.createdBy?.email) {
      const emailFn = ticket.type === 'token' ? sendTokenCompletedEmail : sendTicketResolvedEmail;
      emailFn(ticket.createdBy.email, updatedTicket)
        .catch(err => console.error('EMAIL ERROR:', err.message));
    }

    return res.status(200).json(updatedTicket);

  } catch (error) {
    console.error('❌ UPDATE STATUS FAILED:', error);
    return res.status(500).json({
      message: 'Update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== ADD REMARK ===================== */
router.post('/:id/remarks', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Remark text is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }

    const remark = {
      text: text.trim(),
      addedBy: req.user._id
    };

    ticket.remarks.push(remark);
    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'remarks.addedBy', select: 'name email' }
      ])
      .select('-attachments.data -adminAttachments.data');

    return res.status(200).json(updatedTicket);

  } catch (error) {
    console.error('❌ ADD REMARK FAILED:', error);
    return res.status(500).json({
      message: 'Failed to add remark',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== GET TICKET STATS ===================== */
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    let query = {};

    // USER → own tickets
    if (req.user.role === 'user') {
      query.createdBy = req.user._id;
    }

    // ADMIN → department tickets
    if (req.user.role === 'admin' && req.user.department) {
      const deptId = req.user.department._id || req.user.department;
      if (isValidObjectId(deptId)) {
        query.department = deptId;
      }
    }

    const tickets = await Ticket.find(query).select('-attachments.data -adminAttachments.data').lean();

    const stats = {
      total: tickets.length,
      pending: tickets.filter(t => t.status === 'pending').length,
      assigned: tickets.filter(t => t.status === 'assigned').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      byPriority: {
        low: tickets.filter(t => t.priority === 'low').length,
        medium: tickets.filter(t => t.priority === 'medium').length,
        high: tickets.filter(t => t.priority === 'high').length
      },
      byDepartment: {},
      recentTickets: tickets.slice(0, 10).map(t => ({
        _id: t._id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt
      }))
    };

    // Calculate average resolution time
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' && t.timeToSolve);
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, t) => sum + t.timeToSolve, 0);
      stats.avgResolutionTime = Math.round(totalTime / resolvedTickets.length / 60000); // in minutes
    } else {
      stats.avgResolutionTime = 0;
    }

    return res.status(200).json(stats);

  } catch (error) {
    console.error('❌ GET STATS FAILED:', error);
    return res.status(500).json({
      message: 'Failed to load statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== DELETE TICKET ===================== */
router.delete('/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    return res.status(200).json({ message: 'Ticket deleted successfully' });

  } catch (error) {
    console.error('❌ DELETE TICKET FAILED:', error);
    return res.status(500).json({
      message: 'Failed to delete ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== SUBMIT FEEDBACK ===================== */
router.post('/:id/feedback', authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find ticket
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user owns the ticket
    if (ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only give feedback on your own tickets' });
    }

    // Check if ticket is resolved
    if (ticket.status !== 'resolved') {
      return res.status(400).json({ message: 'You can only give feedback on resolved tickets' });
    }

    // Check if feedback already exists
    if (ticket.feedback && ticket.feedback.rating) {
      return res.status(400).json({ message: 'Feedback already submitted for this ticket' });
    }

    // Update ticket with feedback
    ticket.feedback = {
      rating,
      comment: comment?.trim() || null,
      submittedAt: new Date()
    };

    await ticket.save();

    // Populate before returning
    await ticket.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'department', select: 'name' }
    ]);

    console.log(`✅ Feedback submitted for ticket ${ticket.ticketNumber}: ${rating} stars`);

    return res.status(200).json(ticket);

  } catch (error) {
    console.error('❌ FEEDBACK SUBMISSION FAILED:', error);
    return res.status(500).json({
      message: 'Failed to submit feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== GET FEEDBACK ===================== */
router.get('/:id/feedback', authenticate, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await Ticket.findById(req.params.id).select('feedback createdBy');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check permissions
    if (ticket.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json(ticket.feedback || {});

  } catch (error) {
    console.error('❌ GET FEEDBACK FAILED:', error);
    return res.status(500).json({
      message: 'Failed to fetch feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ===================== TEST ENDPOINT ===================== */
router.post('/test', authenticate, (req, res) => {
  console.log('=== TEST ENDPOINT HIT ===');
  console.log('User:', req.user._id, req.user.email);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers['content-type']);
  
  res.status(200).json({
    message: 'Test successful',
    user: req.user._id,
    body: req.body,
    headers: req.headers
  });
});

/* ===================== ADD ADMIN ATTACHMENTS ===================== */
router.post('/:ticketId/admin-attachments', authenticate, authorize('admin', 'superadmin'), upload.array('attachments', 10), async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Validate ID
    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }
    
    // Check if any files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    // Process uploaded files
    const newAttachments = req.files.map(file => ({
      filename: `${Date.now()}-${file.originalname}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    }));
    
    // Add new admin attachments to ticket
    ticket.adminAttachments.push(...newAttachments);
    await ticket.save();
    
    // Get updated admin attachments without file data
    const adminAttachments = ticket.adminAttachments.map(att => ({
      _id: att._id,
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      uploadedBy: att.uploadedBy,
      uploadedAt: att.uploadedAt
    }));
    
    res.status(200).json({
      message: 'Admin attachments added successfully',
      count: newAttachments.length,
      adminAttachments
    });
    
  } catch (error) {
    console.error('Add admin attachments error:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum 10MB.' });
      }
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: 'Failed to add admin attachments', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/* ===================== DOWNLOAD ADMIN ATTACHMENT ===================== */
router.get('/:ticketId/admin-attachment/:attachmentId', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { ticketId, attachmentId } = req.params;
    
    // Validate IDs
    if (!isValidObjectId(ticketId) || !isValidObjectId(attachmentId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Find the admin attachment
    const attachment = ticket.adminAttachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Admin attachment not found' });
    }
    
    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }
    
    // Set headers
    const filename = encodeURIComponent(attachment.originalName || attachment.filename);
    res.set({
      'Content-Type': attachment.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': attachment.size,
      'Cache-Control': 'private, max-age=3600'
    });
    
    // Send file buffer
    res.send(attachment.data);
    
  } catch (error) {
    console.error('Download admin attachment error:', error);
    res.status(500).json({ 
      message: 'Failed to download admin attachment', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/* ===================== DELETE ADMIN ATTACHMENT ===================== */
router.delete('/:ticketId/admin-attachment/:attachmentId', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { ticketId, attachmentId } = req.params;
    
    // Validate IDs
    if (!isValidObjectId(ticketId) || !isValidObjectId(attachmentId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    // Find the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check admin department access
    if (req.user.role === 'admin' && 
        ticket.department && 
        req.user.department?._id?.toString() !== ticket.department.toString()) {
      return res.status(403).json({ message: 'Access denied to this department ticket' });
    }
    
    // Find and remove the admin attachment
    const attachment = ticket.adminAttachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Admin attachment not found' });
    }
    
    ticket.adminAttachments.pull(attachmentId);
    await ticket.save();
    
    res.status(200).json({ 
      message: 'Admin attachment deleted successfully',
      ticketId,
      attachmentId
    });
    
  } catch (error) {
    console.error('Delete admin attachment error:', error);
    res.status(500).json({ 
      message: 'Failed to delete admin attachment', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

export default router;