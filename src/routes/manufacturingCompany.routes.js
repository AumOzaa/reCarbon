const express = require('express');
const { registerManufacturingCompany } = require('../controllers/manufacturingCompany.controller');

const router = express.Router();

router.post('/register', registerManufacturingCompany);

module.exports = router;
