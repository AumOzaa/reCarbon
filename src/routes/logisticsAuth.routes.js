const express = require('express');
const { login } = require('../controllers/logisticsAuth.controller');

const router = express.Router();

// POST /api/logistics-auth/login - Login for logistics company
router.post('/login', login);

module.exports = router;
