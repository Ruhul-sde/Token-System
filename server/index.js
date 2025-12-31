import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import chalk from 'chalk';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { createTerminus } from '@godaddy/terminus';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import departmentRoutes from './routes/departments.js';
import dashboardRoutes from './routes/dashboard.js';
import categoriesRouter from './routes/categories.js';
import adminProfileRoutes from './routes/adminProfiles.js';
import companyRoutes from './routes/companies.js';
import ticketRoutes from './routes/tickets.js';

dotenv.config();

/* ===============================
   App Setup
================================ */
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Frontend URL configuration
const FRONTEND_URLS = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

console.log(chalk.cyan('Frontend URLs allowed:'), FRONTEND_URLS);

/* ===============================
   MongoDB Configuration with Auto-Reconnect
================================ */
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 10000,
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  w: 'majority',
  heartbeatFrequencyMS: 5000,
  family: 4,
  autoIndex: !isProduction, // Auto-create indexes in dev only
};

let mongoRetryCount = 0;
const MAX_MONGO_RETRIES = 10;

const connectDB = async (retry = false) => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log(chalk.green('✓ MongoDB already connected'));
      return;
    }

    console.log(chalk.cyan(`${retry ? 'Retrying' : 'Connecting'} to MongoDB...`));
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
    
    mongoRetryCount = 0;
    console.log(chalk.green('✓ MongoDB Connected Successfully'));
    console.log(chalk.blue('DB Name:'), conn.connection.name);
    console.log(chalk.blue('DB Host:'), conn.connection.host);
    
    return conn;
  } catch (error) {
    mongoRetryCount++;
    
    if (mongoRetryCount <= MAX_MONGO_RETRIES) {
      console.log(chalk.yellow(`⚠ MongoDB connection failed (Attempt ${mongoRetryCount}/${MAX_MONGO_RETRIES})`));
      console.log(chalk.gray(`Error: ${error.message}`));
      console.log(chalk.gray(`Retrying in 5 seconds...`));
      
      // Exponential backoff with jitter
      const delay = Math.min(5000 * Math.pow(1.5, mongoRetryCount), 30000);
      setTimeout(() => connectDB(true), delay);
    } else {
      console.error(chalk.red('✗ MongoDB Connection Failed after maximum retries'));
      if (!isProduction) {
        process.exit(1);
      }
    }
  }
};

// MongoDB event listeners for better debugging
mongoose.connection.on('connecting', () => {
  console.log(chalk.cyan('🔄 MongoDB Connecting...'));
});

mongoose.connection.on('connected', () => {
  console.log(chalk.green('✓ MongoDB Connected'));
});

mongoose.connection.on('disconnected', () => {
  console.log(chalk.yellow('⚠ MongoDB Disconnected'));
  if (mongoRetryCount < MAX_MONGO_RETRIES) {
    setTimeout(() => connectDB(true), 5000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log(chalk.green('✓ MongoDB Reconnected'));
  mongoRetryCount = 0;
});

mongoose.connection.on('error', (err) => {
  console.error(chalk.red('✗ MongoDB Error:'), err.message);
});

/* ===============================
   Enhanced CORS for Vite Frontend
================================ */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin && !isProduction) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (FRONTEND_URLS.some(allowedOrigin => 
      origin === allowedOrigin || 
      (origin && origin.startsWith(allowedOrigin.replace(/\/$/, '')))
    )) {
      callback(null, true);
    } else {
      console.log(chalk.yellow(`CORS blocked: ${origin}`));
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

/* ===============================
   Security Middleware
================================ */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - more generous for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 1000 : 5000, // Higher limit for development
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.ip;
  }
});

app.use('/api/', limiter);

// Input sanitization
app.use(mongoSanitize());
app.use(hpp());

// Compression
app.use(compression({
  level: 6,
  threshold: 1024, // Compress all responses over 1KB
}));

/* ===============================
   Body Parsing
================================ */
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON payload'
      });
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 50,
}));

app.use(cookieParser());

/* ===============================
   Request Logging
================================ */
if (NODE_ENV !== 'test') {
  morgan.token('colored-status', (req, res) => {
    const status = res.statusCode;
    const color = status >= 500 ? 31 // red
      : status >= 400 ? 33 // yellow
      : status >= 300 ? 36 // cyan
      : 32; // green
    
    return `\x1b[${color}m${status}\x1b[0m`;
  });
  
  morgan.token('colored-method', (req) => {
    const method = req.method;
    const color = method === 'GET' ? 32 // green
      : method === 'POST' ? 33 // yellow
      : method === 'PUT' ? 34 // blue
      : method === 'DELETE' ? 31 // red
      : 37; // white
    
    return `\x1b[${color}m${method}\x1b[0m`;
  });
  
  const format = ':date[iso] :colored-method :url :colored-status :response-time ms - :res[content-length]';
  
  app.use(morgan(format, {
    skip: (req) => {
      return req.url === '/health' || 
             req.url === '/ping' || 
             req.url === '/favicon.ico';
    }
  }));
}

/* ===============================
   Health & Status Endpoints
================================ */
app.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbState === 1 ? 'connected' : 'disconnected',
    databaseState: dbState,
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    },
    nodeVersion: process.version,
    environment: NODE_ENV,
    frontendUrls: FRONTEND_URLS,
  };
  
  // If DB is not connected, return 503
  if (dbState !== 1) {
    healthCheck.status = 'WARNING';
    return res.status(503).json(healthCheck);
  }
  
  res.json(healthCheck);
});

app.get('/ping', (req, res) => {
  res.json({ 
    success: true, 
    message: 'pong',
    timestamp: Date.now() 
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: [
      '/api/auth',
      '/api/tickets',
      '/api/users',
      '/api/departments',
      '/api/dashboard',
      '/api/categories',
      '/api/admin-profiles',
      '/api/companies'
    ]
  });
});

/* ===============================
   API Routes
================================ */
console.log(chalk.cyan('\n📦 Loading API Routes...'));

// API v1 routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoriesRouter);
app.use('/api/admin-profiles', adminProfileRoutes);
app.use('/api/companies', companyRoutes);

// Legacy API root redirect
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Ticket System API',
    version: 'v1',
    documentation: '/api-docs', // If you add Swagger/OpenAPI
    endpoints: [
      '/api/auth',
      '/api/tickets',
      '/api/users',
      '/api/departments',
      '/api/dashboard',
      '/api/categories',
      '/api/admin-profiles',
      '/api/companies'
    ]
  });
});

/* ===============================
   404 Handler
================================ */
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    suggestion: 'Check /api for available endpoints'
  });
});

/* ===============================
   Global Error Handler
================================ */
app.use((err, req, res, next) => {
  console.error(chalk.red('✗ Error:'), {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Origin not allowed',
      allowedOrigins: FRONTEND_URLS
    });
  }
  
  // Handle Mongoose errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Handle MongoDB duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate key error',
      field: Object.keys(err.keyPattern)[0]
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Internal server error' : err.message,
    ...(!isProduction && { stack: err.stack })
  });
});

/* ===============================
   Server Start
================================ */
const startServer = async () => {
  console.log(chalk.cyan('\n🚀 Starting Ticket System Server...'));
  console.log(chalk.blue('Environment:'), NODE_ENV);
  console.log(chalk.blue('Port:'), PORT);
  console.log(chalk.blue('Frontend URLs:'), FRONTEND_URLS.join(', '));
  
  // Connect to MongoDB first
  await connectDB();
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(chalk.green(`\n✅ Server running on:`));
    console.log(chalk.green(`   Local: http://localhost:${PORT}`));
    console.log(chalk.green(`   Network: http://0.0.0.0:${PORT}`));
    console.log(chalk.green(`\n✅ API Base URL: http://localhost:${PORT}/api`));
    console.log(chalk.green(`✅ Health Check: http://localhost:${PORT}/health`));
    console.log(chalk.green(`✅ Frontend configured for: ${FRONTEND_URLS.join(', ')}`));
    
    if (NODE_ENV === 'development') {
      console.log(chalk.yellow('\n⚠️  Running in development mode'));
      console.log(chalk.yellow('   CORS is more permissive'));
      console.log(chalk.yellow('   Rate limiting is relaxed'));
    }
  });
  
  // Optimize server for persistent connections
  server.keepAliveTimeout = 120 * 1000; // 120 seconds
  server.headersTimeout = 125 * 1000; // 125 seconds
  server.maxConnections = 1000;
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(chalk.red(`Port ${PORT} is already in use`));
      process.exit(1);
    } else {
      console.error(chalk.red('Server error:'), error);
    }
  });
  
  // Graceful shutdown setup
  const shutdown = async (signal) => {
    console.log(chalk.yellow(`\n⚠️  Received ${signal}, shutting down gracefully...`));
    
    // Close server to new connections
    server.close(async () => {
      console.log(chalk.yellow('Closed all incoming connections'));
      
      // Close MongoDB connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log(chalk.yellow('MongoDB connection closed'));
      }
      
      console.log(chalk.green('✅ Server shutdown complete'));
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error(chalk.red('Could not close connections in time, forcing shutdown'));
      process.exit(1);
    }, 10000);
  };
  
  // Handle shutdown signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Handle uncaught errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  });
  
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught Exception:'), error);
    if (isProduction) {
      shutdown('UNCAUGHT_EXCEPTION');
    }
  });
  
  return server;
};

// Start the server
startServer().catch(error => {
  console.error(chalk.red('Failed to start server:'), error);
  process.exit(1);
});

export default app;