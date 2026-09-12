const bcrypt = require('bcrypt');
const logger = require('../config/logger');
const ManufacturingCompany = require('../models/ManufacturingCompany');
const CompanyAccount = require('../models/CompanyAccount');

/**
 * Register a new manufacturing company
 * POST /api/manufacturing-companies/register
 */
const registerManufacturingCompany = async (req, res) => {
  try {
    const { name, location, address, contactNum, email, password } = req.body;

    // Validate required fields
    if (!name || !location || !address || !contactNum || !email || !password) {
      logger.warn('Registration attempt with missing fields', {
        providedFields: Object.keys(req.body),
      });
      return res.status(400).json({
        message: 'All fields are required: name, location, address, contactNum, email, password',
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    logger.info('Registration attempt', { email: normalizedEmail });

    // Check if account already exists
    const existingAccount = await CompanyAccount.findOne({ email: normalizedEmail });
    if (existingAccount) {
      logger.warn('Registration rejected - duplicate email', { email: normalizedEmail });
      return res.status(409).json({
        message: 'An account with this email already exists',
      });
    }

    // Create ManufacturingCompany
    const company = new ManufacturingCompany({
      name: name.trim(),
      location: location.trim(),
      address: address.trim(),
      contactNum,
    });

    const savedCompany = await company.save();
    logger.info('ManufacturingCompany created', { companyId: savedCompany._id });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create CompanyAccount
    const account = new CompanyAccount({
      email: normalizedEmail,
      passwordHash: hashedPassword,
      manufacturingCompanyId: savedCompany._id,
    });

    const savedAccount = await account.save();
    logger.info('CompanyAccount created and registration successful', {
      accountId: savedAccount._id,
      companyId: savedCompany._id,
      email: normalizedEmail,
    });

    // Return success response (never return password or passwordHash)
    return res.status(201).json({
      message: 'Company registered successfully',
      companyId: savedCompany._id,
    });
  } catch (error) {
    logger.error('Company registration failed', {
      error: error.message,
    });

    // Return generic error to client (don't expose internal details)
    return res.status(500).json({
      message: 'An error occurred during registration. Please try again later.',
    });
  }
};

module.exports = {
  registerManufacturingCompany,
};
