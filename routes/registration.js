const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');

// POST registration
router.post('/', async (req, res) => {
    try {
        console.log('Registration data received:', req.body);
        
        // Ensure consent is boolean
        const registrationData = {
            ...req.body,
            consent: req.body.consent === true || req.body.consent === 'true'
        };
        
        const registration = new Registration(registrationData);
        await registration.save();
        
        console.log('Registration saved:', registration._id);
        
        res.status(201).json({ 
            success: true, 
            message: 'Registration successful',
            id: registration._id 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

module.exports = router;