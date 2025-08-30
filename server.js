const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files from 'public' folder

// In-memory storage (will persist to files)
let registrations = [];
let feedbacks = [];

// Helper function to save data to JSON files
async function saveToFile(filename, data) {
    try {
        await fs.writeFile(filename, JSON.stringify(data, null, 2));
        console.log(`✅ Data saved to ${filename}`);
    } catch (error) {
        console.error(`❌ Error saving to ${filename}:`, error);
    }
}

// Helper function to load data from JSON files
async function loadFromFile(filename) {
    try {
        const data = await fs.readFile(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(`📝 No existing ${filename} found, starting fresh`);
        return [];
    }
}

// Load existing data on startup
async function loadData() {
    registrations = await loadFromFile('registrations.json');
    feedbacks = await loadFromFile('feedbacks.json');
    console.log(`📊 Loaded ${registrations.length} registrations and ${feedbacks.length} feedbacks`);
}

// Routes

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        console.log('📝 Registration data received:', req.body);
        
        // Validate required fields
        const required = ['firstName', 'lastName', 'email', 'phone', 'location', 'gender', 'channel'];
        const missing = required.filter(field => !req.body[field]);
        
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missing.join(', ')}`
            });
        }

        // Validate interest limit (max 2)
        if (req.body.interests && req.body.interests.length > 2) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 2 areas of interest allowed'
            });
        }

        // Check if email already exists
        const existingRegistration = registrations.find(reg => reg.email === req.body.email);
        if (existingRegistration) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create registration object
        const registration = {
            id: Date.now(),
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            location: req.body.location, // Combined location field
            gender: req.body.gender,
            channel: req.body.channel,
            interests: req.body.interests || [],
            otherInterest: req.body.otherInterest || '',
            consent: req.body.consent || false,
            timestamp: new Date().toISOString()
        };

        // Save registration
        registrations.push(registration);
        await saveToFile('registrations.json', registrations);

        console.log(`✅ New registration: ${registration.firstName} ${registration.lastName}`);

        res.json({
            success: true,
            message: 'Registration successful',
            id: registration.id
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});

// Enhanced Feedback endpoint (supports new format with rating)
app.post('/api/feedback', async (req, res) => {
    try {
        console.log('💬 Feedback received:', req.body);

        // Validate feedback content
        const { feedback1, feedback2, rating } = req.body;
        
        if (!feedback1 && !feedback2) {
            return res.status(400).json({
                success: false,
                message: 'At least one feedback field is required'
            });
        }

        // Validate rating if provided
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        const feedback = {
            id: Date.now(),
            feedback1: feedback1 ? feedback1.trim() : '',
            feedback2: feedback2 ? feedback2.trim() : '',
            rating: rating ? parseInt(rating) : null,
            timestamp: new Date().toISOString()
        };

        feedbacks.push(feedback);
        await saveToFile('feedbacks.json', feedbacks);

        console.log('✅ New feedback saved with rating:', rating || 'No rating');

        res.json({
            success: true,
            message: 'Feedback submitted successfully'
        });

    } catch (error) {
        console.error('❌ Feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during feedback submission'
        });
    }
});

// Admin stats endpoint
app.get('/api/admin/stats', (req, res) => {
    try {
        const stats = {
            registrations: registrations.length,
            feedbacks: feedbacks.length,
            admins: 3 // Static number
        };

        console.log('📊 Stats requested:', stats);
        res.json(stats);
    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get registrations with search functionality
app.get('/api/admin/registrations', (req, res) => {
    try {
        const { search } = req.query;
        let results = [...registrations]; // Create a copy

        if (search && search.trim().length > 0) {
            const searchLower = search.toLowerCase().trim();
            results = registrations.filter(reg => 
                reg.firstName.toLowerCase().includes(searchLower) ||
                reg.lastName.toLowerCase().includes(searchLower) ||
                reg.email.toLowerCase().includes(searchLower) ||
                reg.location.toLowerCase().includes(searchLower)
            );
        }

        // Sort by newest first
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log(`📋 Returning ${results.length} registrations (search: "${search || 'none'}")`);
        res.json(results);
    } catch (error) {
        console.error('❌ Get registrations error:', error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

// Get all feedbacks (admin only)
app.get('/api/admin/feedbacks', (req, res) => {
    try {
        // Sort by newest first and format for display
        const sortedFeedbacks = [...feedbacks]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(feedback => ({
                ...feedback,
                name: 'Anonymous User', // Privacy protection
                text: [feedback.feedback1, feedback.feedback2]
                    .filter(text => text && text.trim())
                    .join(' | ')
            }));
        
        console.log(`💬 Returning ${sortedFeedbacks.length} feedbacks`);
        res.json(sortedFeedbacks);
    } catch (error) {
        console.error('❌ Get feedbacks error:', error);
        res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        registrations: registrations.length,
        feedbacks: feedbacks.length,
        message: 'MTN GITEX Nigeria API is running'
    });
});

// Admin authentication check (for production use)
app.post('/api/admin/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (username === 'admin@mtn.ng' && password === '1234') {
            res.json({
                success: true,
                message: 'Login successful',
                token: 'demo-token' // In production, use real JWT tokens
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('❌ Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Catch-all handler for frontend routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
loadData().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 MTN GITEX Nigeria Server running on http://localhost:${PORT}`);
        console.log(`📁 Serving frontend files from 'public' folder`);
        console.log(`🔗 API endpoints available at /api/*`);
        console.log(`👨‍💼 Admin login: admin@mtn.ng / 1234`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
}).catch(error => {
    console.error('💥 Failed to start server:', error);
});