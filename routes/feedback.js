const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// POST - Submit feedback
router.post('/', async (req, res) => {
    try {
        const feedback = new Feedback(req.body);
        await feedback.save();
        
        // Ensure proper JSON response
        res.status(201).json({ 
            success: true, 
            message: 'Feedback submitted successfully',
            id: feedback._id 
        });
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message || 'Failed to submit feedback'
        });
    }
});

module.exports = router;