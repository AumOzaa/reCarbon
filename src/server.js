require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const { initializePinecone } = require('./services/pinecone.service');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize Pinecone for vector indexing
    await initializePinecone();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server started successfully`, { port: PORT, env: process.env.NODE_ENV });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
