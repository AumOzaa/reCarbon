const express = require('express');
const authenticateJWT = require('../middleware/auth');
const {
  addServiceablePincodes,
  getServiceablePincodes,
  removeServiceablePincode,
  lookupLogisticsCompanies,
} = require('../controllers/logisticsServiceability.controller');

const router = express.Router();

// POST /api/logistics/serviceability/pincodes - Add serviceable pincodes (bulk)
router.post('/pincodes', authenticateJWT, addServiceablePincodes);

// GET /api/logistics/serviceability/pincodes - Get serviceable pincodes for authenticated company
router.get('/pincodes', authenticateJWT, getServiceablePincodes);

// DELETE /api/logistics/serviceability/pincodes/:pincode - Remove a serviceable pincode
router.delete('/pincodes/:pincode', authenticateJWT, removeServiceablePincode);

// GET /api/logistics/serviceability/lookup - Lookup logistics companies by pincode (PUBLIC)
router.get('/lookup', lookupLogisticsCompanies);

module.exports = router;
