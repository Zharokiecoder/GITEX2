const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Feedback = require('../models/Feedback');

// Admin login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin@mtn.ng' && password === '1234') {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Get statistics
router.get('/stats', async (req, res) => {
    try {
        const registrations = await Registration.countDocuments();
        const feedbacks = await Feedback.countDocuments();
        
        res.json({
            registrations: registrations || 0,
            feedbacks: feedbacks || 0,
            admins: 1
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all registrations with search
router.get('/registrations', async (req, res) => {
    try {
        const search = req.query.search || '';
        let query = {};
        
        if (search) {
            query = {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        const registrations = await Registration.find(query)
            .sort({ createdAt: -1 })
            .limit(100); // Limit for performance
        
        console.log(`Found ${registrations.length} registrations`);
        res.json(registrations);
    } catch (error) {
        console.error('Registration fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all feedbacks
router.get('/feedbacks', async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .sort({ createdAt: -1 })
            .limit(100);
        
        const formatted = feedbacks.map(f => ({
            name: 'Customer',
            text: f.feedback1 || f.feedback2 || 'No feedback text',
            rating: f.rating,
            timestamp: f.createdAt
        }));
        
        res.json(formatted);
    } catch (error) {
        console.error('Feedback fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;