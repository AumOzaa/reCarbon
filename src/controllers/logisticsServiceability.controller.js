const logger = require('../config/logger');
const { validatePincode } = require('../utils/validation');
const LogisticsCompany = require('../models/LogisticsCompany');
const ServiceablePincode = require('../models/ServiceablePincode');

/**
 * Add serviceable pincodes (bulk support)
 * POST /api/logistics/serviceability/pincodes
 */
const addServiceablePincodes = async (req, res) => {
  try {
    const logisticsCompanyId = req.user.logisticsCompanyId;
    const { pincodes } = req.body;

    logger.info('Add serviceable pincodes request', {
      logisticsCompanyId,
      requestedCount: pincodes?.length || 0,
    });

    // Validate request
    if (!Array.isArray(pincodes)) {
      logger.warn('Add pincodes - pincodes is not an array', { logisticsCompanyId });
      return res.status(400).json({
        message: 'pincodes must be an array',
      });
    }

    if (pincodes.length === 0) {
      logger.warn('Add pincodes - empty array provided', { logisticsCompanyId });
      return res.status(400).json({
        message: 'pincodes array cannot be empty',
      });
    }

    // Verify company exists
    const company = await LogisticsCompany.findById(logisticsCompanyId);
    if (!company) {
      logger.warn('Add pincodes - company not found', { logisticsCompanyId });
      return res.status(404).json({
        message: 'Logistics company not found',
      });
    }

    // Validate and normalize pincodes
    const validatedPincodes = [];
    const invalidPincodes = [];

    pincodes.forEach((pincode) => {
      if (validatePincode(pincode)) {
        validatedPincodes.push(pincode.trim());
      } else {
        invalidPincodes.push(pincode);
      }
    });

    if (invalidPincodes.length > 0) {
      logger.warn('Add pincodes - invalid pincodes provided', {
        logisticsCompanyId,
        invalidCount: invalidPincodes.length,
        invalid: invalidPincodes,
      });
      return res.status(400).json({
        message: `Invalid pincodes: ${invalidPincodes.join(', ')}. Pincodes must be exactly 6 digits.`,
      });
    }

    // Remove duplicates from the input array
    const uniquePincodes = [...new Set(validatedPincodes)];

    logger.info('Pincodes validated', {
      logisticsCompanyId,
      validCount: uniquePincodes.length,
    });

    // Get already existing pincodes for this company
    const existingPincodes = await ServiceablePincode.find(
      { logisticsCompanyId },
      { pincode: 1 }
    );

    const existingSet = new Set(existingPincodes.map((p) => p.pincode));

    // Filter out duplicates (already added)
    const newPincodes = uniquePincodes.filter((pincode) => !existingSet.has(pincode));
    const duplicateCount = uniquePincodes.length - newPincodes.length;

    if (newPincodes.length === 0) {
      logger.info('Add pincodes - all pincodes already exist', {
        logisticsCompanyId,
        duplicateCount,
      });
      return res.status(200).json({
        message: 'All pincodes already exist for this company',
        added: 0,
        duplicates: duplicateCount,
        existedAlready: duplicateCount,
      });
    }

    // Bulk insert new pincodes
    const documents = newPincodes.map((pincode) => ({
      logisticsCompanyId,
      pincode,
    }));

    const insertedPincodes = await ServiceablePincode.insertMany(documents);

    logger.info('Serviceable pincodes added successfully', {
      logisticsCompanyId,
      addedCount: insertedPincodes.length,
      duplicateCount,
      totalRequested: pincodes.length,
    });

    return res.status(201).json({
      message: 'Serviceable pincodes added successfully',
      added: insertedPincodes.length,
      duplicates: duplicateCount,
      totalProcessed: pincodes.length,
    });
  } catch (error) {
    logger.error('Add serviceable pincodes failed', {
      error: error.message,
      logisticsCompanyId: req.user?.logisticsCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while adding pincodes',
    });
  }
};

/**
 * Get serviceable pincodes for authenticated company
 * GET /api/logistics/serviceability/pincodes
 */
const getServiceablePincodes = async (req, res) => {
  try {
    const logisticsCompanyId = req.user.logisticsCompanyId;
    const { page = 1, limit = 100 } = req.query;

    logger.info('Get serviceable pincodes request', {
      logisticsCompanyId,
      page,
      limit,
    });

    // Validate pagination
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1) {
      logger.warn('Get pincodes - invalid pagination', { page, limit, logisticsCompanyId });
      return res.status(400).json({
        message: 'Invalid pagination parameters. page and limit must be positive integers.',
      });
    }

    if (parsedLimit > 500) {
      logger.warn('Get pincodes - limit too high', { limit: parsedLimit, logisticsCompanyId });
      return res.status(400).json({
        message: 'limit must be <= 500',
      });
    }

    // Verify company exists
    const company = await LogisticsCompany.findById(logisticsCompanyId);
    if (!company) {
      logger.warn('Get pincodes - company not found', { logisticsCompanyId });
      return res.status(404).json({
        message: 'Logistics company not found',
      });
    }

    // Get total count
    const totalCount = await ServiceablePincode.countDocuments({ logisticsCompanyId });

    // Get pincodes with pagination
    const skip = (parsedPage - 1) * parsedLimit;
    const pincodes = await ServiceablePincode.find({ logisticsCompanyId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .select('pincode createdAt');

    const hasMore = skip + pincodes.length < totalCount;

    logger.info('Serviceable pincodes retrieved', {
      logisticsCompanyId,
      returned: pincodes.length,
      total: totalCount,
    });

    return res.status(200).json({
      page: parsedPage,
      limit: parsedLimit,
      total: totalCount,
      hasMore,
      pincodes: pincodes.map((p) => ({
        pincode: p.pincode,
        addedAt: p.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Get serviceable pincodes failed', {
      error: error.message,
      logisticsCompanyId: req.user?.logisticsCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while retrieving pincodes',
    });
  }
};

/**
 * Remove a serviceable pincode
 * DELETE /api/logistics/serviceability/pincodes/:pincode
 */
const removeServiceablePincode = async (req, res) => {
  try {
    const logisticsCompanyId = req.user.logisticsCompanyId;
    const { pincode } = req.params;

    logger.info('Remove serviceable pincode request', {
      logisticsCompanyId,
      pincode,
    });

    // Validate pincode format
    if (!validatePincode(pincode)) {
      logger.warn('Remove pincode - invalid format', { pincode, logisticsCompanyId });
      return res.status(400).json({
        message: 'Invalid pincode format. Pincode must be exactly 6 digits.',
      });
    }

    // Verify company exists
    const company = await LogisticsCompany.findById(logisticsCompanyId);
    if (!company) {
      logger.warn('Remove pincode - company not found', { logisticsCompanyId });
      return res.status(404).json({
        message: 'Logistics company not found',
      });
    }

    // Remove pincode
    const deleteResult = await ServiceablePincode.deleteOne({
      logisticsCompanyId,
      pincode: pincode.trim(),
    });

    if (deleteResult.deletedCount === 0) {
      logger.warn('Remove pincode - pincode not found for company', {
        logisticsCompanyId,
        pincode,
      });
      return res.status(404).json({
        message: 'Pincode not found for this company',
      });
    }

    logger.info('Serviceable pincode removed', {
      logisticsCompanyId,
      pincode,
    });

    return res.status(200).json({
      message: 'Pincode removed successfully',
      pincode,
    });
  } catch (error) {
    logger.error('Remove serviceable pincode failed', {
      error: error.message,
      logisticsCompanyId: req.user?.logisticsCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while removing the pincode',
    });
  }
};

/**
 * Lookup logistics companies serving a pincode (PUBLIC - no auth required)
 * GET /api/logistics/serviceability/lookup?pincode=380001
 */
const lookupLogisticsCompanies = async (req, res) => {
  try {
    const { pincode } = req.query;

    logger.info('Logistics company lookup request', { pincode });

    // Validate pincode
    if (!pincode || !validatePincode(pincode)) {
      logger.warn('Lookup - invalid pincode', { pincode });
      return res.status(400).json({
        message: 'Invalid pincode. Pincode must be exactly 6 digits.',
      });
    }

    const normalizedPincode = pincode.trim();

    // Find serviceable pincodes matching this pincode
    const serviceablePincodes = await ServiceablePincode.find({
      pincode: normalizedPincode,
    }).populate('logisticsCompanyId');

    if (serviceablePincodes.length === 0) {
      logger.info('Lookup - no logistics companies found', { pincode: normalizedPincode });
      return res.status(200).json({
        pincode: normalizedPincode,
        availableLogisticsCompanies: [],
      });
    }

    // Extract company details (exclude account info)
    const companies = serviceablePincodes.map((sp) => ({
      _id: sp.logisticsCompanyId._id,
      name: sp.logisticsCompanyId.name,
      location: sp.logisticsCompanyId.location,
      address: sp.logisticsCompanyId.address,
      contactNum: sp.logisticsCompanyId.contactNum,
    }));

    logger.info('Lookup completed', {
      pincode: normalizedPincode,
      companiesFound: companies.length,
    });

    return res.status(200).json({
      pincode: normalizedPincode,
      availableLogisticsCompanies: companies,
    });
  } catch (error) {
    logger.error('Logistics company lookup failed', {
      error: error.message,
    });

    return res.status(500).json({
      message: 'An error occurred while looking up logistics companies',
    });
  }
};

module.exports = {
  addServiceablePincodes,
  getServiceablePincodes,
  removeServiceablePincode,
  lookupLogisticsCompanies,
};
