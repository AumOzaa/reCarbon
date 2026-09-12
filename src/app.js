const express = require('express');
const cors = require('cors');
const httpLogger = require('./middleware/httpLogger');
const manufacturingCompanyRoutes = require('./routes/manufacturingCompany.routes');
const authRoutes = require('./routes/auth.routes');
const sellingMaterialRoutes = require('./routes/sellingMaterial.routes');
const buyingMaterialRoutes = require('./routes/buyingMaterial.routes');
const sellingMaterialSearchRoutes = require('./routes/sellingMaterialSearch.routes');
const feedRoutes = require('./routes/feed.routes');
const logisticsCompanyRoutes = require('./routes/logisticsCompany.routes');
const logisticsAuthRoutes = require('./routes/logisticsAuth.routes');
const logisticsServiceabilityRoutes = require('./routes/logisticsServiceability.routes');

const app = express();

// Middleware
app.use(cors()); // Allow all origins
app.use(express.json());
app.use(httpLogger);

// Routes
app.use('/api/manufacturing-companies', manufacturingCompanyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/selling-materials', sellingMaterialRoutes);
app.use('/api/buying-materials', buyingMaterialRoutes);
app.use('/api/search/selling-materials', sellingMaterialSearchRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/logistics-companies', logisticsCompanyRoutes);
app.use('/api/logistics-auth', logisticsAuthRoutes);
app.use('/api/logistics/serviceability', logisticsServiceabilityRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
