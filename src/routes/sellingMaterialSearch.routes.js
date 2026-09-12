const express = require('express');
const { searchSellingMaterialsByQuery } = require('../controllers/sellingMaterialSearch.controller');

const router = express.Router();

// POST /api/search/selling-materials - Search selling materials by natural language query
router.post('/', searchSellingMaterialsByQuery);

module.exports = router;
