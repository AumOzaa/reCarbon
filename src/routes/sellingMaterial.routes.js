const express = require('express');
const authenticateJWT = require('../middleware/auth');
const { createSellingMaterial } = require('../controllers/sellingMaterial.controller');

const router = express.Router();

// POST /api/selling-materials - Create a selling material listing
router.post('/', authenticateJWT, createSellingMaterial);

module.exports = router;
