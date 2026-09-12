const logger = require('../config/logger');
const Chemical = require('../models/Chemical');
const BuyingMaterial = require('../models/BuyingMaterial');

/**
 * Create a buying material request for the authenticated manufacturing company
 * POST /api/buying-materials
 */
const createBuyingMaterial = async (req, res) => {
  try {
    const { chemical, reqLocation, data } = req.body;
    const manufacturingCompanyId = req.user.manufacturingCompanyId;

    logger.info('Buying material creation attempt', {
      manufacturingCompanyId,
      casNumber: chemical?.casNumber,
    });

    // Validate required top-level fields
    if (!chemical || !reqLocation) {
      logger.warn('Buying material creation - missing required fields', {
        providedFields: Object.keys(req.body),
        manufacturingCompanyId,
      });
      return res.status(400).json({
        message: 'All fields are required: chemical, reqLocation',
      });
    }

    // Validate CAS number
    if (!chemical.casNumber) {
      logger.warn('Buying material creation - missing CAS number', {
        manufacturingCompanyId,
      });
      return res.status(400).json({
        message: 'chemical.casNumber is required',
      });
    }

    // Normalize CAS number (trim whitespace)
    const normalizedCasNumber = chemical.casNumber.trim();

    // CAS resolution logic
    let resolvedChemical = await Chemical.findOne({
      casNumber: normalizedCasNumber,
    });

    if (resolvedChemical) {
      // CAS number exists - use existing Chemical
      logger.info('Buying material - using existing chemical', {
        chemicalId: resolvedChemical._id,
        casNumber: normalizedCasNumber,
        manufacturingCompanyId,
      });
    } else {
      // CAS number does not exist - create new Chemical
      if (!chemical.name || !chemical.formula) {
        logger.warn(
          'Buying material creation - missing chemical name or formula for new CAS',
          {
            casNumber: normalizedCasNumber,
            manufacturingCompanyId,
          }
        );
        return res.status(400).json({
          message:
            'For a new chemical, chemical.name and chemical.formula are required',
        });
      }

      try {
        // Attempt to create new Chemical
        resolvedChemical = new Chemical({
          name: chemical.name.trim(),
          formula: chemical.formula.trim(),
          casNumber: normalizedCasNumber,
        });

        await resolvedChemical.save();

        logger.info('Buying material - new chemical created', {
          chemicalId: resolvedChemical._id,
          casNumber: normalizedCasNumber,
          name: resolvedChemical.name,
          manufacturingCompanyId,
        });
      } catch (createError) {
        // Handle race condition: another request created the same CAS
        if (createError.code === 11000) {
          logger.info(
            'Buying material - CAS race condition, re-querying existing chemical',
            {
              casNumber: normalizedCasNumber,
              manufacturingCompanyId,
            }
          );

          // Re-query to get the existing Chemical that was just created
          resolvedChemical = await Chemical.findOne({
            casNumber: normalizedCasNumber,
          });

          if (!resolvedChemical) {
            logger.error('Buying material - CAS still not found after retry', {
              casNumber: normalizedCasNumber,
              manufacturingCompanyId,
            });
            return res.status(500).json({
              message: 'An error occurred while resolving the chemical',
            });
          }

          logger.info('Buying material - using chemical from race condition', {
            chemicalId: resolvedChemical._id,
            casNumber: normalizedCasNumber,
            manufacturingCompanyId,
          });
        } else {
          // Different error
          logger.error('Buying material - chemical creation error', {
            error: createError.message,
            manufacturingCompanyId,
          });
          return res.status(500).json({
            message: 'An error occurred while creating the chemical',
          });
        }
      }
    }

    // Check for duplicate buying material (same company + chemical)
    const existingBuyingMaterial = await BuyingMaterial.findOne({
      manufacturingCompanyId,
      chemicalId: resolvedChemical._id,
    });

    if (existingBuyingMaterial) {
      logger.warn('Buying material creation - duplicate found', {
        buyingMaterialId: existingBuyingMaterial._id,
        manufacturingCompanyId,
        chemicalId: resolvedChemical._id,
        casNumber: normalizedCasNumber,
      });
      return res.status(409).json({
        message:
          'A buying material for this chemical already exists. Delete the existing request before creating a new one.',
      });
    }

    // Create BuyingMaterial
    const buyingMaterial = new BuyingMaterial({
      manufacturingCompanyId,
      chemicalId: resolvedChemical._id,
      reqLocation: reqLocation.trim(),
      data: data || {},
    });

    await buyingMaterial.save();

    logger.info('Buying material created successfully', {
      buyingMaterialId: buyingMaterial._id,
      manufacturingCompanyId,
      chemicalId: resolvedChemical._id,
      casNumber: normalizedCasNumber,
    });

    // Return created buying material
    return res.status(201).json({
      message: 'Buying material created successfully',
      buyingMaterial: {
        _id: buyingMaterial._id,
        manufacturingCompanyId: buyingMaterial.manufacturingCompanyId,
        chemicalId: buyingMaterial.chemicalId,
        reqLocation: buyingMaterial.reqLocation,
        data: buyingMaterial.data,
        createdAt: buyingMaterial.createdAt,
        updatedAt: buyingMaterial.updatedAt,
      },
    });
  } catch (error) {
    // Handle duplicate-key error from database constraint
    if (error.code === 11000) {
      logger.warn('Buying material creation - database duplicate key error', {
        manufacturingCompanyId: req.user?.manufacturingCompanyId,
        error: error.message,
      });
      return res.status(409).json({
        message:
          'A buying material for this chemical already exists. Delete the existing request before creating a new one.',
      });
    }

    logger.error('Buying material creation failed', {
      error: error.message,
      manufacturingCompanyId: req.user?.manufacturingCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while creating the buying material',
    });
  }
};

module.exports = {
  createBuyingMaterial,
};
