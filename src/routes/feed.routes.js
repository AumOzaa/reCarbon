const express = require('express');
const authenticateJWT = require('../middleware/auth');
const { getFeed } = require('../controllers/feed.controller');

const router = express.Router();

// GET /api/feed - Get personalized marketplace feed
router.get('/', authenticateJWT, getFeed);

module.exports = router;
