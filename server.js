// ====== Dependencies ======
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// ====== App Config ======
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ====== MongoDB Connection ======
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    // Don't exit, allow server to run for testing
    console.log('⚠️ Running without database connection');
  });

// ====== Schemas & Models ======
const registrationSchema = new mongoose.Schema({
  firstName: { type: String, trim: true, required: true },
  lastName: { type: String, trim: true, required: true },
  email: { 
    type: String, 
    trim: true, 
    lowercase: true, 
    required: true,
    // Remove unique constraint to avoid duplicate issues during testing
    index: true 
  },
  phone: String,
  location: String,
  gender: String,
  channel: String,
  interests: [String],
  otherInterest: String,
  consent: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const feedbackSchema = new mongoose.Schema({
  feedback1: String,
  feedback2: String,
  rating: { type: Number, min: 1, max: 5 },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
  timestamp: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', registrationSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

// ====== Routes ======

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    console.log('📥 Registration request:', req.body);
    
    const required = ['firstName', 'lastName', 'email', 'phone', 'location', 'gender', 'channel'];
    const missing = required.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missing.join(', ')}` 
      });
    }

    if (req.body.interests && req.body.interests.length > 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 2 interests allowed' 
      });
    }

    // Check for existing email (optional)
    const existingUser = await Registration.findOne({ email: req.body.email });
    if (existingUser) {
      console.log('⚠️ Email already registered:', req.body.email);
      // Still allow registration for testing
    }

    const registration = await Registration.create(req.body);
    console.log('✅ Registration created:', registration._id);
    
    res.json({ 
      success: true, 
      message: 'Registration successful', 
      id: registration._id 
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration: ' + err.message 
    });
  }
});

// Feedback endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    console.log('📥 Feedback request:', req.body);
    
    const { feedback1, feedback2, rating } = req.body;
    
    if (!feedback1 && !feedback2) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one feedback field required' 
      });
    }
    
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }

    const feedback = await Feedback.create({ 
      feedback1, 
      feedback2, 
      rating: rating ? parseInt(rating) : null 
    });
    
    console.log('✅ Feedback created:', feedback._id);
    
    res.json({ 
      success: true, 
      message: 'Feedback submitted successfully' 
    });
  } catch (err) {
    console.error('❌ Feedback error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during feedback submission: ' + err.message 
    });
  }
});

// Admin stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const registrations = await Registration.countDocuments();
    const feedbacks = await Feedback.countDocuments();
    
    console.log('📊 Stats:', { registrations, feedbacks });
    
    res.json({ 
      registrations: registrations || 0, 
      feedbacks: feedbacks || 0, 
      admins: 3 
    });
  } catch (err) {
    console.error('❌ Stats error:', err);
    res.status(500).json({ 
      registrations: 0, 
      feedbacks: 0, 
      admins: 3,
      error: 'Database connection issue' 
    });
  }
});

// Get registrations (with search)
app.get('/api/admin/registrations', async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    
    if (search) {
      const regex = new RegExp(search, 'i');
      filter = { 
        $or: [
          { firstName: regex }, 
          { lastName: regex }, 
          { email: regex }, 
          { location: regex }
        ] 
      };
    }
    
    const results = await Registration.find(filter)
      .sort({ timestamp: -1 })
      .limit(200)
      .lean(); // Use lean() for better performance
    
    console.log(`📋 Found ${results.length} registrations`);
    
    res.json(results);
  } catch (err) {
    console.error('❌ Get registrations error:', err);
    res.status(500).json([]);  // Return empty array instead of error
  }
});

// Get feedbacks
app.get('/api/admin/feedbacks', async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    
    const formatted = feedbacks.map(fb => ({
      name: 'Customer Feedback',
      text: fb.feedback1 || fb.feedback2 || 'No feedback text',
      rating: fb.rating,
      timestamp: fb.timestamp,
      _id: fb._id
    }));
    
    console.log(`💬 Found ${formatted.length} feedbacks`);
    
    res.json(formatted);
  } catch (err) {
    console.error('❌ Get feedbacks error:', err);
    res.status(500).json([]);  // Return empty array instead of error
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const registrations = dbStatus === 'connected' ? await Registration.countDocuments() : 0;
    const feedbacks = dbStatus === 'connected' ? await Feedback.countDocuments() : 0;
    
    res.json({
      status: 'healthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      registrations,
      feedbacks,
      message: 'MTN GITEX Nigeria API running'
    });
  } catch (err) {
    res.json({
      status: 'healthy',
      database: 'error',
      message: 'API running with database issues'
    });
  }
});

// Admin login (demo only)
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  console.log('🔐 Login attempt:', username);
  
  if (username === 'admin@mtn.ng' && password === '1234') {
    return res.json({ 
      success: true, 
      message: 'Login successful', 
      token: 'demo-token' 
    });
  }
  
  res.status(401).json({ 
    success: false, 
    message: 'Invalid credentials' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 for unknown API endpoints
app.use('/api/*', (req, res) => {
  console.log('❓ Unknown API endpoint:', req.originalUrl);
  res.status(404).json({ 
    error: 'API endpoint not found',
    endpoint: req.originalUrl 
  });
});

// Frontend catch-all (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`
🚀 Server running on http://localhost:${PORT}
📁 Serving frontend from 'public' directory
🔗 API endpoints available at /api/*
📊 Admin dashboard at /admin-dashboard.html

Test endpoints:
- GET  http://localhost:${PORT}/api/health
- GET  http://localhost:${PORT}/api/admin/stats
- GET  http://localhost:${PORT}/api/admin/registrations
- POST http://localhost:${PORT}/api/admin/login
  `);
});