// api.js - Production API Integration
// Add <script src="api.js"></script> to all HTML files

const API_BASE_URL = window.location.origin; // Automatically use current domain
// For local development: const API_BASE_URL = 'http://localhost:3000';

// API helper function
async function apiRequest(endpoint, options = {}) {
    try {
        console.log(`Making API request to: ${API_BASE_URL}/api${endpoint}`);
        
        const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        console.log('API response received:', data);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Registration API
async function submitRegistrationAPI(registrationData) {
    return apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify(registrationData)
    });
}

// Enhanced Feedback API with rating support
async function submitFeedbackAPI(feedbackData) {
    return apiRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify(feedbackData)
    });
}

// Admin APIs
async function adminLogin(username, password) {
    return apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
}

async function getAdminStats() {
    return apiRequest('/admin/stats');
}

async function getRegistrations(searchQuery = '') {
    const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
    return apiRequest(`/admin/registrations${params}`);
}

async function getFeedbacks() {
    return apiRequest('/admin/feedbacks');
}

// Production Registration Submission
function submitRegistrationProduction() {
    const registrationData = JSON.parse(localStorage.getItem('registrationData') || '{}');
    const interests = window.selectedInterests || [];
    const otherInterest = document.getElementById('otherInterest')?.value || '';
    
    if (interests.length === 0) {
        alert('Please select at least one area of interest');
        return;
    }

    if (interests.length > 2) {
        alert('Maximum 2 areas of interest allowed');
        return;
    }
    
    // Prepare final data
    registrationData.interests = interests;
    registrationData.otherInterest = otherInterest;
    registrationData.consent = true;
    
    console.log('Submitting registration:', registrationData);
    
    // Show loading state
    const submitBtn = document.querySelector('.btn-primary');
    if (submitBtn) {
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Submit to API
        submitRegistrationAPI(registrationData)
            .then(response => {
                console.log('Registration successful:', response);
                localStorage.removeItem('registrationData');
                alert('Registration successful!');
                window.location.href = 'success.html';
            })
            .catch(error => {
                console.error('Registration failed:', error);
                alert(`Registration failed: ${error.message}. Please try again.`);
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
    }
}

// Production Feedback Submission
function submitFeedbackProduction() {
    const feedback1 = document.getElementById('feedbackText1')?.value.trim() || '';
    const feedback2 = document.getElementById('feedbackText2')?.value.trim() || '';
    const rating = window.selectedRating;
    
    if (!feedback1 && !feedback2) {
        alert('Please provide some feedback');
        return;
    }
    
    const feedbackData = {
        feedback1: feedback1,
        feedback2: feedback2,
        rating: rating,
        timestamp: new Date().toISOString()
    };
    
    console.log('Submitting feedback:', feedbackData);
    
    // Show loading state
    const submitBtn = document.querySelector('.btn-primary');
    if (submitBtn) {
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Submit to API
        submitFeedbackAPI(feedbackData)
            .then(response => {
                console.log('Feedback successful:', response);
                alert('Thank you for your feedback!');
                window.location.href = 'sucess.html'; // fixed typo
            })
            .catch(error => {
                console.error('Feedback failed:', error);
                alert(`Failed to submit feedback: ${error.message}. Please try again.`);
                
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
    }
}

// Load admin dashboard data
function loadAdminData() {
    console.log('Loading admin dashboard data...');
    
    // Load stats
    getAdminStats()
        .then(stats => {
            const statNumbers = document.querySelectorAll('.stat-number');
            if (statNumbers[0]) statNumbers[0].textContent = stats.registrations;
            if (statNumbers[1]) statNumbers[1].textContent = stats.feedbacks;
            if (statNumbers[2]) statNumbers[2].textContent = stats.admins;
        })
        .catch(error => {
            console.error('Failed to load stats:', error);
        });
    
    // Load registrations
    loadRegistrations();
}

// Load registrations (works for both dashboard & admin.html table)
function loadRegistrations(searchQuery = '') {
    const tbody = document.getElementById('registrationTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>`;
    }

    getRegistrations(searchQuery)
        .then(registrations => {
            // Fill "userList" (dashboard)
            const userList = document.getElementById('userList');
            if (userList) {
                userList.innerHTML = '';
                if (registrations.length === 0) {
                    userList.innerHTML = '<div class="user-item">No registrations found</div>';
                } else {
                    registrations.slice(0, 10).forEach(reg => {
                        const userItem = document.createElement('div');
                        userItem.className = 'user-item';
                        userItem.innerHTML = `${reg.firstName} ${reg.lastName} - ${reg.email}`;
                        userList.appendChild(userItem);
                    });
                }
            }

            // Fill "registrationTableBody" (admin.html)
            if (tbody) {
                if (registrations.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No records found</td></tr>`;
                    return;
                }
                tbody.innerHTML = '';
                registrations.forEach(reg => {
                    const row = tbody.insertRow();
                    const interests = Array.isArray(reg.interests) ? reg.interests.join(', ') : reg.interests || '';
                    row.innerHTML = `
                        <td>${reg.firstName || ''} ${reg.lastName || ''}</td>
                        <td>${reg.gender || ''}</td>
                        <td>${reg.email || ''}</td>
                        <td>${reg.location || ''}</td>
                        <td>${reg.channel || ''}</td>
                        <td>${interests}</td>
                    `;
                });
            }
        })
        .catch(error => {
            console.error('Failed to load registrations:', error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Failed to load registrations</td></tr>`;
            }
        });
}

// Load feedbacks (admin-feedback.html)
function loadFeedbacks() {
    getFeedbacks()
        .then(feedbacks => {
            const feedbackCards = document.getElementById('feedbackCards');
            if (!feedbackCards) return;
            feedbackCards.innerHTML = '';
            
            if (feedbacks.length === 0) {
                feedbackCards.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">No feedback available</div>';
                return;
            }
            
            feedbacks.forEach(feedback => {
                const card = document.createElement('div');
                card.className = 'feedback-card';
                const date = new Date(feedback.timestamp).toLocaleDateString('en-GB');
                const rating = feedback.rating ? ` | Rating: ${feedback.rating}/5` : '';
                card.innerHTML = `
                    <div class="feedback-name">${feedback.name || 'Anonymous User'}</div>
                    <div class="feedback-text">${feedback.text || 'No feedback text'}</div>
                    <div class="feedback-date">${date}${rating}</div>
                `;
                feedbackCards.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Failed to load feedbacks:', error);
            const feedbackCards = document.getElementById('feedbackCards');
            if (feedbackCards) {
                feedbackCards.innerHTML = '<div style="text-align:center;color:red;padding:20px;">Failed to load feedback</div>';
            }
        });
}

// Search functionality with debounce
function setupSearch() {
    const adminSearch = document.getElementById('adminSearch');
    if (adminSearch) {
        let timeout;
        adminSearch.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => loadRegistrations(this.value), 300);
        });
    }
}

// Initialize admin pages
function initializeAdminPage() {
    const path = window.location.pathname;
    if (path.includes('admin-dashboard.html')) {
        loadAdminData();
        setupSearch();
    }
    if (path.includes('admin.html')) {
        loadRegistrations();
        setupSearch();
    }
    if (path.includes('admin-feedback.html')) {
        loadFeedbacks();
    }
}

// Test API connection
async function testAPIConnection() {
    try {
        const response = await apiRequest('/health');
        console.log('API health check passed:', response);
        return true;
    } catch (error) {
        console.warn('API connection failed:', error.message);
        return false;
    }
}

// Expose global functions
window.submitRegistrationProduction = submitRegistrationProduction;
window.submitFeedbackProduction = submitFeedbackProduction;
window.loadAdminData = loadAdminData;
window.loadRegistrations = loadRegistrations;
window.loadFeedbacks = loadFeedbacks;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    testAPIConnection();
    initializeAdminPage();
    console.log('MTN GITEX Nigeria website initialized with API integration');
});
