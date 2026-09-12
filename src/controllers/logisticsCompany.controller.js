const bcrypt = require('bcrypt');
const logger = require('../config/logger');
const LogisticsCompany = require('../models/LogisticsCompany');
const LogisticsCompanyAccount = require('../models/LogisticsCompanyAccount');

/**
 * Register a new logistics company
 * POST /api/logistics-companies/register
 */
const registerLogisticsCompany = async (req, res) => {
  try {
    const { name, location, address, contactNum, email, password } = req.body;

    // Validate required fields
    if (!name || !location || !address || !contactNum || !email || !password) {
      logger.warn('Logistics company registration - missing fields', {
        providedFields: Object.keys(req.body),
      });
      return res.status(400).json({
        message: 'All fields are required: name, location, address, contactNum, email, password',
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    logger.info('Logistics company registration attempt', { email: normalizedEmail });

    // Check if account already exists
    const existingAccount = await LogisticsCompanyAccount.findOne({ email: normalizedEmail });
    if (existingAccount) {
      logger.warn('Logistics company registration - duplicate email', { email: normalizedEmail });
      return res.status(409).json({
        message: 'An account with this email already exists',
      });
    }

    // Create LogisticsCompany
    const company = new LogisticsCompany({
      name: name.trim(),
      location: location.trim(),
      address: address.trim(),
      contactNum,
    });

    const savedCompany = await company.save();
    logger.info('LogisticsCompany created', { companyId: savedCompany._id });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create LogisticsCompanyAccount
    const account = new LogisticsCompanyAccount({
      email: normalizedEmail,
      passwordHash: hashedPassword,
      logisticsCompanyId: savedCompany._id,
    });

    const savedAccount = await account.save();
    logger.info('LogisticsCompanyAccount created and registration successful', {
      accountId: savedAccount._id,
      companyId: savedCompany._id,
      email: normalizedEmail,
    });

    // Return success response (never return password or passwordHash)
    return res.status(201).json({
      message: 'Logistics company registered successfully',
      logisticsCompanyId: savedCompany._id,
    });
  } catch (error) {
    logger.error('Logistics company registration failed', {
      error: error.message,
    });

    // Return generic error to client (don't expose internal details)
    return res.status(500).json({
      message: 'An error occurred during registration. Please try again later.',
    });
  }
};

/**
 * Get authenticated logistics company profile
 * GET /api/logistics-companies/me
 */
const getLogisticsCompanyProfile = async (req, res) => {
  try {
    const logisticsCompanyId = req.user.logisticsCompanyId;

    logger.info('Logistics company profile request', { logisticsCompanyId });

    const company = await LogisticsCompany.findById(logisticsCompanyId);

    if (!company) {
      logger.warn('Logistics company not found', { logisticsCompanyId });
      return res.status(404).json({
        message: 'Logistics company not found',
      });
    }

    // Get company email from account
    let email = null;
    try {
      const account = await LogisticsCompanyAccount.findOne({
        logisticsCompanyId,
      }).select('email');
      email = account?.email || null;
    } catch (accountError) {
      logger.warn('Error fetching company email', {
        error: accountError.message,
        logisticsCompanyId,
      });
    }

    logger.info('Logistics company profile retrieved', { companyId: company._id });

    return res.status(200).json({
      _id: company._id,
      name: company.name,
      location: company.location,
      address: company.address,
      contactNum: company.contactNum,
      email,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    });
  } catch (error) {
    logger.error('Logistics company profile request failed', {
      error: error.message,
      logisticsCompanyId: req.user?.logisticsCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while retrieving company profile',
    });
  }
};

module.exports = {
  registerLogisticsCompany,
  getLogisticsCompanyProfile,
};
