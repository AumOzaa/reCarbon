const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token and attaches the decoded payload to req.user
 */
const authenticateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Unauthorized request - missing authorization header', {
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        message: 'Authorization header is required',
      });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      logger.warn('Unauthorized request - missing bearer token', {
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        message: 'Bearer token is required',
      });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your_secret_key'
      );

      // Attach decoded token to request object
      req.user = decoded;

      logger.debug('JWT token verified successfully', {
        accountId: decoded.accountId,
        manufacturingCompanyId: decoded.manufacturingCompanyId,
      });

      next();
    } catch (verifyError) {
      logger.warn('JWT verification failed', {
        error: verifyError.message,
        path: req.path,
      });

      return res.status(401).json({
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
    });

    return res.status(500).json({
      message: 'An error occurred during authentication',
    });
  }
};

module.exports = authenticateJWT;
