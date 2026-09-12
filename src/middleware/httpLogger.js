const logger = require('../config/logger');

const httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 500) {
      logger.error(logMessage, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    } else if (res.statusCode >= 400) {
      logger.warn(logMessage, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    } else {
      logger.http(logMessage, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    }
  });

  next();
};

module.exports = httpLogger;
