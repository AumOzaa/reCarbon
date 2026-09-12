const express = require('express');
const authenticateJWT = require('../middleware/auth');
const { createBuyingMaterial } = require('../controllers/buyingMaterial.controller');

const router = express.Router();

// POST /api/buying-materials - Create a buying material request
router.post('/', authenticateJWT, createBuyingMaterial);

module.exports = router;
