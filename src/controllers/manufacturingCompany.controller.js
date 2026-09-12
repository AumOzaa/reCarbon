const bcrypt = require('bcrypt');
const logger = require('../config/logger');
const ManufacturingCompany = require('../models/ManufacturingCompany');
const CompanyAccount = require('../models/CompanyAccount');
const SellingMaterial = require('../models/SellingMaterial');
const BuyingMaterial = require('../models/BuyingMaterial');

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

/**
 * Get authenticated company profile with all details and listings
 * GET /api/manufacturing-companies/me
 *
 * Returns company information, email, and all selling/buying materials
 */
const getCompanyProfile = async (req, res) => {
  try {
    const manufacturingCompanyId = req.user.manufacturingCompanyId;

    logger.info('Company profile request', { manufacturingCompanyId });

    // ========== FETCH COMPANY DETAILS ==========

    const company = await ManufacturingCompany.findById(manufacturingCompanyId);

    if (!company) {
      logger.warn('Company not found', { manufacturingCompanyId });
      return res.status(404).json({
        message: 'Company not found',
      });
    }

    logger.info('Company found', { companyId: company._id });

    // ========== FETCH COMPANY EMAIL ==========

    let companyEmail = null;
    try {
      const account = await CompanyAccount.findOne({
        manufacturingCompanyId,
      }).select('email');
      companyEmail = account?.email || null;
    } catch (accountError) {
      logger.warn('Error fetching company email', {
        error: accountError.message,
        manufacturingCompanyId,
      });
    }

    // ========== FETCH SELLING MATERIALS ==========

    let sellingMaterials = [];
    try {
      sellingMaterials = await SellingMaterial.find({
        manufacturingCompanyId,
      }).populate('chemicalId');

      logger.info('Selling materials fetched', {
        count: sellingMaterials.length,
        manufacturingCompanyId,
      });
    } catch (sellingError) {
      logger.error('Error fetching selling materials', {
        error: sellingError.message,
        manufacturingCompanyId,
      });
    }

    // ========== FETCH BUYING MATERIALS ==========

    let buyingMaterials = [];
    try {
      buyingMaterials = await BuyingMaterial.find({
        manufacturingCompanyId,
      }).populate('chemicalId');

      logger.info('Buying materials fetched', {
        count: buyingMaterials.length,
        manufacturingCompanyId,
      });
    } catch (buyingError) {
      logger.error('Error fetching buying materials', {
        error: buyingError.message,
        manufacturingCompanyId,
      });
    }

    // ========== BUILD RESPONSE ==========

    const response = {
      _id: company._id,
      name: company.name,
      location: company.location,
      address: company.address,
      contactNum: company.contactNum,
      email: companyEmail,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      sellingMaterials: sellingMaterials.map((sm) => ({
        _id: sm._id,
        sourceLocation: sm.sourceLocation,
        cadence: sm.cadence,
        state: sm.state,
        data: sm.data,
        embeddingId: sm.embeddingId,
        createdAt: sm.createdAt,
        updatedAt: sm.updatedAt,
        chemical: {
          _id: sm.chemicalId._id,
          name: sm.chemicalId.name,
          formula: sm.chemicalId.formula,
          casNumber: sm.chemicalId.casNumber,
          createdAt: sm.chemicalId.createdAt,
          updatedAt: sm.chemicalId.updatedAt,
        },
      })),
      buyingMaterials: buyingMaterials.map((bm) => ({
        _id: bm._id,
        reqLocation: bm.reqLocation,
        data: bm.data,
        createdAt: bm.createdAt,
        updatedAt: bm.updatedAt,
        chemical: {
          _id: bm.chemicalId._id,
          name: bm.chemicalId.name,
          formula: bm.chemicalId.formula,
          casNumber: bm.chemicalId.casNumber,
          createdAt: bm.chemicalId.createdAt,
          updatedAt: bm.chemicalId.updatedAt,
        },
      })),
    };

    logger.info('Company profile retrieved successfully', {
      companyId: company._id,
      sellingMaterialsCount: sellingMaterials.length,
      buyingMaterialsCount: buyingMaterials.length,
    });

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Company profile request failed', {
      error: error.message,
      manufacturingCompanyId: req.user?.manufacturingCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while retrieving company profile',
    });
  }
};

/**
 * Check if authenticated company has at least one listing
 * GET /api/manufacturing-companies/has-listings
 *
 * Returns a boolean indicating if the company has any selling or buying materials
 */
const checkHasListings = async (req, res) => {
  try {
    const manufacturingCompanyId = req.user.manufacturingCompanyId;

    logger.info('Checking if company has listings', { manufacturingCompanyId });

    // Check if company has at least one selling material
    const sellingCount = await SellingMaterial.countDocuments({
      manufacturingCompanyId,
    });

    if (sellingCount > 0) {
      logger.info('Company has listings', {
        manufacturingCompanyId,
        hasListings: true,
      });
      return res.status(200).json({ hasListings: true });
    }

    // Check if company has at least one buying material
    const buyingCount = await BuyingMaterial.countDocuments({
      manufacturingCompanyId,
    });

    const hasListings = buyingCount > 0;

    logger.info('Company listings check completed', {
      manufacturingCompanyId,
      hasListings,
    });

    return res.status(200).json({ hasListings });
  } catch (error) {
    logger.error('Check listings request failed', {
      error: error.message,
      manufacturingCompanyId: req.user?.manufacturingCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while checking listings',
    });
  }
};

module.exports = {
  registerManufacturingCompany,
  getCompanyProfile,
  checkHasListings,
};
