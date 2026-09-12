const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const LogisticsCompanyAccount = require('../models/LogisticsCompanyAccount');

/**
 * Login with email and password for logistics company
 * POST /api/logistics-auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      logger.warn('Logistics login attempt with missing fields', {
        providedFields: Object.keys(req.body),
      });
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    logger.info('Logistics login attempt', { email: normalizedEmail });

    // Find account by email
    const account = await LogisticsCompanyAccount.findOne({ email: normalizedEmail });
    if (!account) {
      logger.warn('Logistics login failed - account not found', { email: normalizedEmail });
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, account.passwordHash);
    if (!isPasswordValid) {
      logger.warn('Logistics login failed - invalid password', { email: normalizedEmail });
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        accountId: account._id,
        logisticsCompanyId: account.logisticsCompanyId,
      },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('Logistics login successful', {
      accountId: account._id,
      logisticsCompanyId: account.logisticsCompanyId,
      email: normalizedEmail,
    });

    // Return success response (never return password or passwordHash)
    return res.status(200).json({
      message: 'Login successful',
      token,
      logisticsCompanyId: account.logisticsCompanyId,
    });
  } catch (error) {
    logger.error('Logistics login failed with error', {
      error: error.message,
    });

    // Return generic error to client (don't expose internal details)
    return res.status(500).json({
      message: 'An error occurred during login. Please try again later.',
    });
  }
};

module.exports = {
  login,
};
