require('dotenv').config();
const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/emailRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const subdomainRequestRoutes = require('./routes/subdomainRequestRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { analyticsMiddleware } = require('./middleware/analytics');
const authService = require('./utils/authService');
const dbConfig = require('./config/dbConfig');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:5173', 'https://equussystems.co', 'https://www.equussystems.co'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy to get real IP addresses
app.set('trust proxy', true);

// Apply general rate limiting to all routes
// app.use(apiLimiter); // COMMENTED OUT FOR TESTING

// Apply analytics middleware (after auth setup, before routes)
app.use(analyticsMiddleware);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Equus Website API is running!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await dbConfig.checkConnection();
    const authStatus = authService.getServiceStatus();
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        auth: authStatus
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/email', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/subdomain-requests', subdomainRequestRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Create initial admin user if needed
async function createInitialAdmin() {
  try {
    const User = require('./models/User');
    
    // Check if any admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists && process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD) {
      const hashedPassword = await authService.hashPassword(process.env.INITIAL_ADMIN_PASSWORD);
      
      const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: process.env.INITIAL_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        emailVerified: true,
        isActive: true
      });
      
      await admin.save();
      console.log('✅ Initial admin user created');
    }
  } catch (error) {
    console.error('❌ Failed to create initial admin user:', error.message);
    // Don't exit server if admin creation fails
  }
}

// Initialize database and start server
async function startServer() {
  try {
    await dbConfig.connect();
    
    // Create initial admin user if needed
    await createInitialAdmin();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 Auth service configured: ${authService.isConfigured() ? 'Yes' : 'No'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();