const express = require('express');
const authenticateJWT = require('../middleware/auth');
const { createSellingMaterial, deleteSellingMaterial } = require('../controllers/sellingMaterial.controller');

const router = express.Router();

// POST /api/selling-materials - Create a selling material listing
router.post('/', authenticateJWT, createSellingMaterial);

// DELETE /api/selling-materials/:id - Delete a selling material listing
router.delete('/:id', authenticateJWT, deleteSellingMaterial);

module.exports = router;
