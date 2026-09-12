const express = require('express');
const authenticateJWT = require('../middleware/auth');
const { createBuyingMaterial, deleteBuyingMaterial } = require('../controllers/buyingMaterial.controller');

const router = express.Router();

// POST /api/buying-materials - Create a buying material request
router.post('/', authenticateJWT, createBuyingMaterial);

// DELETE /api/buying-materials/:id - Delete a buying material request
router.delete('/:id', authenticateJWT, deleteBuyingMaterial);

module.exports = router;
