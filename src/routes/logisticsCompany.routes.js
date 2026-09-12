const express = require('express');
const authenticateJWT = require('../middleware/auth');
const { registerLogisticsCompany, getLogisticsCompanyProfile } = require('../controllers/logisticsCompany.controller');

const router = express.Router();

// POST /api/logistics-companies/register - Register new logistics company
router.post('/register', registerLogisticsCompany);

// GET /api/logistics-companies/me - Get authenticated logistics company profile
router.get('/me', authenticateJWT, getLogisticsCompanyProfile);

module.exports = router;
