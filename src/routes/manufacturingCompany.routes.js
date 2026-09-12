const express = require('express');
const authenticateJWT = require('../middleware/auth');
const { registerManufacturingCompany, getCompanyProfile, checkHasListings } = require('../controllers/manufacturingCompany.controller');

const router = express.Router();

router.post('/register', registerManufacturingCompany);

// GET /api/manufacturing-companies/has-listings - Check if company has any listings
router.get('/has-listings', authenticateJWT, checkHasListings);

// GET /api/manufacturing-companies/me - Get authenticated company profile
router.get('/me', authenticateJWT, getCompanyProfile);

module.exports = router;
