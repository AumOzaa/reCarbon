const logger = require('../config/logger');
const Chemical = require('../models/Chemical');
const SellingMaterial = require('../models/SellingMaterial');
const { generateEmbedding } = require('../services/embedding.service');
const { upsertSellingMaterialVector, deleteSellingMaterialVector } = require('../services/pinecone.service');
const { buildEmbeddingText } = require('../services/embeddingText.service');

/**
 * Create a selling material listing for the authenticated manufacturing company
 * POST /api/selling-materials
 *
 * Includes embedding generation and Pinecone vector indexing
 */
const createSellingMaterial = async (req, res) => {
  let sellingMaterial = null;
  let resolvedChemical = null;
  let wasNewChemical = false;
  let vectorId = null;

  try {
    const { chemical, sourceLocation, cadence, state, data } = req.body;
    const manufacturingCompanyId = req.user.manufacturingCompanyId;

    logger.info('Selling material creation attempt', {
      manufacturingCompanyId,
      casNumber: chemical?.casNumber,
    });

    // Validate required fields
    if (!chemical || !sourceLocation || !cadence || !state || !data) {
      logger.warn('Selling material creation - missing required fields', {
        providedFields: Object.keys(req.body),
        manufacturingCompanyId,
      });
      return res.status(400).json({
        message:
          'All fields are required: chemical, sourceLocation, cadence, state, data',
      });
    }

    // Validate CAS number
    if (!chemical.casNumber) {
      logger.warn('Selling material creation - missing CAS number', {
        manufacturingCompanyId,
      });
      return res.status(400).json({
        message: 'chemical.casNumber is required',
      });
    }

    // Normalize CAS number (trim whitespace)
    const normalizedCasNumber = chemical.casNumber.trim();

    // Validate cadence
    const validCadences = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validCadences.includes(cadence)) {
      logger.warn('Selling material creation - invalid cadence', {
        providedCadence: cadence,
        manufacturingCompanyId,
      });
      return res.status(400).json({
        message: 'cadence must be one of: daily, weekly, monthly, quarterly, yearly',
      });
    }

    // Validate state
    const validStates = ['solid', 'liquid', 'gas'];
    if (!validStates.includes(state)) {
      logger.warn('Selling material creation - invalid state', {
        providedState: state,
        manufacturingCompanyId,
      });
      return res.status(400).json({
        message: 'state must be one of: solid, liquid, gas',
      });
    }

    // CAS resolution logic
    resolvedChemical = await Chemical.findOne({
      casNumber: normalizedCasNumber,
    });

    if (resolvedChemical) {
      // CAS number exists - use existing Chemical
      logger.info('Selling material - using existing chemical', {
        chemicalId: resolvedChemical._id,
        casNumber: normalizedCasNumber,
        manufacturingCompanyId,
      });
    } else {
      // CAS number does not exist - create new Chemical
      if (!chemical.name || !chemical.formula) {
        logger.warn(
          'Selling material creation - missing chemical name or formula for new CAS',
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
        wasNewChemical = true;

        logger.info('Selling material - new chemical created', {
          chemicalId: resolvedChemical._id,
          casNumber: normalizedCasNumber,
          name: resolvedChemical.name,
          manufacturingCompanyId,
        });
      } catch (createError) {
        // Handle race condition: another request created the same CAS
        if (createError.code === 11000) {
          logger.info(
            'Selling material - CAS race condition, re-querying existing chemical',
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
            logger.error('Selling material - CAS still not found after retry', {
              casNumber: normalizedCasNumber,
              manufacturingCompanyId,
            });
            return res.status(500).json({
              message: 'An error occurred while resolving the chemical',
            });
          }

          logger.info('Selling material - using chemical from race condition', {
            chemicalId: resolvedChemical._id,
            casNumber: normalizedCasNumber,
            manufacturingCompanyId,
          });
        } else {
          // Different error
          logger.error('Selling material - chemical creation error', {
            error: createError.message,
            manufacturingCompanyId,
          });
          return res.status(500).json({
            message: 'An error occurred while creating the chemical',
          });
        }
      }
    }

    // Create SellingMaterial
    sellingMaterial = new SellingMaterial({
      manufacturingCompanyId,
      chemicalId: resolvedChemical._id,
      sourceLocation: sourceLocation.trim(),
      cadence,
      state,
      data,
    });

    await sellingMaterial.save();

    logger.info('Selling material MongoDB document created', {
      sellingMaterialId: sellingMaterial._id,
      manufacturingCompanyId,
      chemicalId: resolvedChemical._id,
      casNumber: normalizedCasNumber,
    });

    // ========== EMBEDDING AND PINECONE INDEXING ==========

    try {
      // Build embedding text
      logger.debug('Building embedding text');
      const embeddingText = buildEmbeddingText(
        {
          name: chemical.name,
          formula: chemical.formula,
          casNumber: normalizedCasNumber,
        },
        sourceLocation.trim(),
        cadence,
        state,
        data
      );

      // Generate embedding using Ollama
      logger.info('Generating embedding with Ollama');
      const embedding = await generateEmbedding(embeddingText);

      logger.info('Embedding generated successfully', {
        embeddingDimension: embedding.length,
        sellingMaterialId: sellingMaterial._id,
      });

      // Upsert vector to Pinecone
      logger.info('Upserting vector to Pinecone');
      vectorId = await upsertSellingMaterialVector(
        sellingMaterial._id,
        embedding,
        {
          sellingMaterialId: sellingMaterial._id.toString(),
          chemicalId: resolvedChemical._id.toString(),
          casNumber: normalizedCasNumber,
        }
      );

      logger.info('Vector upserted to Pinecone', { vectorId });

      // Save embeddingId to SellingMaterial
      sellingMaterial.embeddingId = vectorId;
      await sellingMaterial.save();

      logger.info('Selling material indexed successfully', {
        sellingMaterialId: sellingMaterial._id,
        embeddingId: vectorId,
      });

      // Return created selling material
      return res.status(201).json({
        message: 'Selling material created successfully',
        sellingMaterial: {
          _id: sellingMaterial._id,
          manufacturingCompanyId: sellingMaterial.manufacturingCompanyId,
          chemicalId: sellingMaterial.chemicalId,
          sourceLocation: sellingMaterial.sourceLocation,
          cadence: sellingMaterial.cadence,
          state: sellingMaterial.state,
          data: sellingMaterial.data,
          embeddingId: sellingMaterial.embeddingId,
          createdAt: sellingMaterial.createdAt,
          updatedAt: sellingMaterial.updatedAt,
        },
      });
    } catch (embeddingError) {
      // Embedding or Pinecone upsert failed - cleanup MongoDB record
      logger.error('Embedding/indexing failed, cleaning up MongoDB', {
        error: embeddingError.message,
        sellingMaterialId: sellingMaterial._id,
      });

      try {
        // Delete the orphan SellingMaterial
        await SellingMaterial.deleteOne({ _id: sellingMaterial._id });
        logger.info('Orphan SellingMaterial deleted', {
          sellingMaterialId: sellingMaterial._id,
        });

        // Cleanup newly created Chemical if applicable
        if (wasNewChemical) {
          const chemicalCount = await SellingMaterial.countDocuments({
            chemicalId: resolvedChemical._id,
          });

          if (chemicalCount === 0) {
            await Chemical.deleteOne({ _id: resolvedChemical._id });
            logger.info('Unreferenced Chemical deleted', {
              chemicalId: resolvedChemical._id,
              casNumber: normalizedCasNumber,
            });
          }
        }

        // Attempt to delete Pinecone vector if it was created
        if (vectorId) {
          try {
            await deleteSellingMaterialVector(sellingMaterial._id);
            logger.info('Pinecone vector cleaned up', { vectorId });
          } catch (deleteError) {
            logger.error('Failed to delete Pinecone vector during cleanup', {
              error: deleteError.message,
              vectorId,
            });
          }
        }
      } catch (cleanupError) {
        logger.error('Cleanup failed, database may be in inconsistent state', {
          error: cleanupError.message,
          sellingMaterialId: sellingMaterial._id,
        });
      }

      return res.status(500).json({
        message: 'An error occurred while indexing the selling material. Please try again.',
      });
    }
  } catch (error) {
    logger.error('Selling material creation failed', {
      error: error.message,
      manufacturingCompanyId: req.user?.manufacturingCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while creating the selling material',
    });
  }
};

/**
 * Delete a selling material listing
 * DELETE /api/selling-materials/:id
 *
 * Authorized company may only delete its own selling materials.
 * Deletes from Pinecone first, then MongoDB (to avoid orphaned vectors).
 */
const deleteSellingMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const manufacturingCompanyId = req.user.manufacturingCompanyId;

    logger.info('Selling material deletion attempt', {
      sellingMaterialId: id,
      manufacturingCompanyId,
    });

    // Validate MongoDB ID format
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) {
      logger.warn('Selling material deletion - invalid ID format', {
        providedId: id,
        manufacturingCompanyId,
      });
      return res.status(400).json({
        message: 'Invalid selling material ID',
      });
    }

    // Find the SellingMaterial (with ownership check)
    const sellingMaterial = await SellingMaterial.findOne({
      _id: id,
      manufacturingCompanyId,
    });

    if (!sellingMaterial) {
      logger.warn('Selling material deletion - not found for authenticated company', {
        sellingMaterialId: id,
        manufacturingCompanyId,
      });
      return res.status(404).json({
        message: 'Selling material not found',
      });
    }

    logger.info('Selling material found', {
      sellingMaterialId: sellingMaterial._id,
      embeddingId: sellingMaterial.embeddingId || 'not set',
      manufacturingCompanyId,
    });

    // ========== PINECONE DELETION (BEFORE MongoDB) ==========

    try {
      if (!sellingMaterial.embeddingId) {
        logger.warn('Selling material - embeddingId not set, will use deterministic ID', {
          sellingMaterialId: sellingMaterial._id,
        });
      }

      logger.info('Attempting Pinecone vector deletion');
      await deleteSellingMaterialVector(sellingMaterial._id, sellingMaterial.embeddingId);

      logger.info('Pinecone vector deleted successfully', {
        sellingMaterialId: sellingMaterial._id,
        embeddingId: sellingMaterial.embeddingId || 'deterministic ID',
      });
    } catch (pineconeError) {
      // Pinecone failure is fatal - do NOT delete MongoDB record
      logger.error('Pinecone deletion failed, aborting MongoDB deletion', {
        error: pineconeError.message,
        sellingMaterialId: sellingMaterial._id,
        embeddingId: sellingMaterial.embeddingId,
      });

      return res.status(500).json({
        message: 'An error occurred while deleting the selling material',
      });
    }

    // ========== MONGODB DELETION (AFTER Pinecone) ==========

    try {
      const deleteResult = await SellingMaterial.deleteOne({
        _id: sellingMaterial._id,
        manufacturingCompanyId,
      });

      if (deleteResult.deletedCount === 0) {
        logger.error('MongoDB deletion reported 0 records deleted', {
          sellingMaterialId: sellingMaterial._id,
          manufacturingCompanyId,
        });

        return res.status(500).json({
          message: 'An error occurred while deleting the selling material',
        });
      }

      logger.info('Selling material deleted successfully', {
        sellingMaterialId: sellingMaterial._id,
        manufacturingCompanyId,
      });

      return res.status(200).json({
        message: 'Selling material deleted successfully',
        sellingMaterialId: sellingMaterial._id,
      });
    } catch (mongoError) {
      logger.error('MongoDB deletion failed', {
        error: mongoError.message,
        sellingMaterialId: sellingMaterial._id,
      });

      return res.status(500).json({
        message: 'An error occurred while deleting the selling material',
      });
    }
  } catch (error) {
    logger.error('Selling material deletion failed', {
      error: error.message,
      sellingMaterialId: req.params?.id,
      manufacturingCompanyId: req.user?.manufacturingCompanyId,
    });

    return res.status(500).json({
      message: 'An error occurred while deleting the selling material',
    });
  }
};

module.exports = {
  createSellingMaterial,
  deleteSellingMaterial,
};
