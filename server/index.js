// ======================= ENV MUST BE FIRST =======================
import dotenv from 'dotenv';
dotenv.config();

console.log('🔐 ENV CHECK:', {
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS_EXISTS: !!process.env.SMTP_PASS,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set'
});

// ======================= IMPORTS =======================
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import chalk from 'chalk';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Routes - REMOVE userDashboardRoutes import
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import departmentRoutes from './routes/departments.js';
import dashboardRoutes from './routes/dashboard.js';
import adminProfileRoutes from './routes/adminProfiles.js';
import companyRoutes from './routes/companies.js';
import ticketRoutes from './routes/tickets.js';
import timeTrackingRoutes from './routes/timeTracking.js';
// REMOVE: import userDashboardRoutes from './routes/userDashboard.js'; // Remove this

// ======================= DIR SETUP =======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(chalk.blue('📁 Created uploads directory'));
}

// REMOVE this line - it's causing the conflict
// app.use('/api/dashboard', userDashboardRoutes); // Remove this line

// ======================= APP SETUP =======================
const app = express();
const PORT = process.env.PORT || 3001;

// ======================= RATE LIMITING =======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ======================= MIDDLEWARE =======================
// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable for now, configure properly in production
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Other middleware
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());
app.use(morgan('dev'));
app.use(limiter);

// ======================= STATIC FILES =======================
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// ======================= API ENDPOINTS =======================
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uploadsDir: uploadsDir,
    nodeVersion: process.version
  });
});

// Test endpoint for debugging
app.get('/api/debug', (req, res) => {
  res.status(200).json({
    message: 'Server is working',
    uploadsExists: fs.existsSync(uploadsDir),
    uploadsPath: uploadsDir,
    filesInUploads: fs.readdirSync(uploadsDir).length
  });
});

// Simple ping endpoint for keep-alive
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// ======================= ROUTES =======================
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dashboard', dashboardRoutes); // This is your existing dashboard
app.use('/api/admin-profiles', adminProfileRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);

// ======================= ERROR HANDLING =======================
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(chalk.red('💥 Server Error:'), err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ======================= DB + SERVER =======================
const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(chalk.green('✓ MongoDB Connected'));
    
    app.listen(PORT, () => {
      console.log(chalk.green(`✓ Server running on http://localhost:${PORT}`));
      console.log(chalk.blue(`📁 Uploads directory: ${uploadsDir}`));
      console.log(chalk.blue(`🌐 Health check: http://localhost:${PORT}/api/health`));
      console.log(chalk.blue(`🐛 Debug: http://localhost:${PORT}/api/debug`));
    });
    
  } catch (err) {
    console.error(chalk.red('❌ Startup failed:'), err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Received SIGINT. Shutting down gracefully...'));
  await mongoose.connection.close();
  console.log(chalk.green('✓ MongoDB connection closed'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n🛑 Received SIGTERM. Shutting down gracefully...'));
  await mongoose.connection.close();
  console.log(chalk.green('✓ MongoDB connection closed'));
  process.exit(0);
});

startServer();

export default app;