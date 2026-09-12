const logger = require('../config/logger');
const Chemical = require('../models/Chemical');
const SellingMaterial = require('../models/SellingMaterial');
const CompanyAccount = require('../models/CompanyAccount');
const { extractCasNumber } = require('../services/llm.service');
const { generateEmbedding } = require('../services/embedding.service');
const { searchSellingMaterials } = require('../services/pinecone.service');

const MAX_TOP_K = 50;

/**
 * Search selling materials by natural language query
 * POST /api/search/selling-materials
 */
const searchSellingMaterialsByQuery = async (req, res) => {
  try {
    const { query, topK = 10 } = req.body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      logger.warn('Search request - missing or invalid query');
      return res.status(400).json({
        message: 'Search query is required',
      });
    }

    // Validate topK
    if (topK && (!Number.isInteger(topK) || topK < 1)) {
      logger.warn('Search request - invalid topK', { topK });
      return res.status(400).json({
        message: 'topK must be a positive integer',
      });
    }

    const normalizedTopK = Math.min(topK || 10, MAX_TOP_K);

    logger.info('Search request received', {
      queryLength: query.length,
      requestedTopK: topK,
      normalizedTopK,
    });

    // ========== EXTRACT CAS NUMBER ==========

    let extractedCasNumber;
    try {
      logger.debug('Extracting CAS number from query');
      const llmResult = await extractCasNumber(query);
      extractedCasNumber = llmResult.casNumber;
    } catch (llmError) {
      logger.error('LLM CAS extraction failed', {
        error: llmError.message,
      });
      return res.status(500).json({
        message: 'Unable to process the search query.',
      });
    }

    // Validate CAS was extracted
    if (!extractedCasNumber) {
      logger.info('Search - CAS number not extracted from query');
      return res.status(400).json({
        message:
          'Please provide the CAS number of the chemical you want to search for.',
      });
    }

    // Normalize CAS number
    const normalizedCasNumber = extractedCasNumber.trim();

    logger.info('CAS number extracted', {
      casNumber: normalizedCasNumber,
    });

    // ========== VERIFY CHEMICAL EXISTS ==========

    let chemical;
    try {
      chemical = await Chemical.findOne({
        casNumber: normalizedCasNumber,
      });
    } catch (dbError) {
      logger.error('Chemical lookup failed', {
        error: dbError.message,
        casNumber: normalizedCasNumber,
      });
      return res.status(500).json({
        message: 'Unable to search seller listings.',
      });
    }

    if (!chemical) {
      logger.info('Chemical not found for CAS number', {
        casNumber: normalizedCasNumber,
      });
      return res.status(404).json({
        message: 'No chemical with this CAS number exists in the marketplace.',
      });
    }

    logger.info('Chemical found', {
      chemicalId: chemical._id,
      casNumber: normalizedCasNumber,
      chemicalName: chemical.name,
    });

    // ========== GENERATE BUYER QUERY EMBEDDING ==========

    let queryEmbedding;
    try {
      logger.debug('Generating embedding for buyer query');
      queryEmbedding = await generateEmbedding(query);
      logger.info('Query embedding generated', {
        embeddingDimension: queryEmbedding.length,
      });
    } catch (embeddingError) {
      logger.error('Query embedding generation failed', {
        error: embeddingError.message,
      });
      return res.status(500).json({
        message: 'Unable to process the search query.',
      });
    }

    // ========== SEARCH PINECONE ==========

    let pineconeMatches;
    try {
      logger.debug('Searching Pinecone', {
        casNumber: normalizedCasNumber,
        topK: normalizedTopK,
      });
      pineconeMatches = await searchSellingMaterials(
        queryEmbedding,
        normalizedCasNumber,
        normalizedTopK
      );
      logger.info('Pinecone search returned matches', {
        matchCount: pineconeMatches.length,
      });
    } catch (pineconeError) {
      logger.error('Pinecone search failed', {
        error: pineconeError.message,
      });
      return res.status(500).json({
        message: 'Unable to search seller listings.',
      });
    }

    // ========== FETCH MONGODB RECORDS ==========

    const results = [];

    for (const match of pineconeMatches) {
      try {
        const sellingMaterialId = match.metadata?.sellingMaterialId;

        if (!sellingMaterialId) {
          logger.warn('Pinecone match missing sellingMaterialId', {
            vectorId: match.id,
          });
          continue;
        }

        // Fetch from MongoDB with company details
        const sellingMaterial = await SellingMaterial.findById(
          sellingMaterialId
        ).populate('chemicalId').populate('manufacturingCompanyId');

        if (!sellingMaterial) {
          logger.warn('Stale Pinecone vector - SellingMaterial not found', {
            sellingMaterialId,
            vectorId: match.id,
          });
          continue;
        }

        // Verify CAS still matches (sanity check)
        if (
          sellingMaterial.chemicalId &&
          sellingMaterial.chemicalId.casNumber !== normalizedCasNumber
        ) {
          logger.warn('CAS mismatch for Pinecone result', {
            sellingMaterialId,
            expectedCas: normalizedCasNumber,
            actualCas: sellingMaterial.chemicalId.casNumber,
          });
          continue;
        }

        // Fetch company email from CompanyAccount
        let companyEmail = null;
        try {
          const companyAccount = await CompanyAccount.findOne({
            manufacturingCompanyId: sellingMaterial.manufacturingCompanyId._id,
          }).select('email');
          companyEmail = companyAccount?.email || null;
        } catch (accountError) {
          logger.warn('Error fetching company email', {
            error: accountError.message,
            manufacturingCompanyId: sellingMaterial.manufacturingCompanyId._id,
          });
        }

        results.push({
          score: match.score,
          sellingMaterial: {
            _id: sellingMaterial._id,
            manufacturingCompanyId: sellingMaterial.manufacturingCompanyId._id,
            sourceLocation: sellingMaterial.sourceLocation,
            cadence: sellingMaterial.cadence,
            state: sellingMaterial.state,
            data: sellingMaterial.data,
            embeddingId: sellingMaterial.embeddingId,
            createdAt: sellingMaterial.createdAt,
            updatedAt: sellingMaterial.updatedAt,
            chemical: {
              _id: sellingMaterial.chemicalId._id,
              name: sellingMaterial.chemicalId.name,
              formula: sellingMaterial.chemicalId.formula,
              casNumber: sellingMaterial.chemicalId.casNumber,
            },
            company: {
              _id: sellingMaterial.manufacturingCompanyId._id,
              name: sellingMaterial.manufacturingCompanyId.name,
              location: sellingMaterial.manufacturingCompanyId.location,
              address: sellingMaterial.manufacturingCompanyId.address,
              contactNum: sellingMaterial.manufacturingCompanyId.contactNum,
              email: companyEmail,
            },
          },
        });
      } catch (mongoError) {
        logger.error('Error fetching SellingMaterial from MongoDB', {
          error: mongoError.message,
          vectorId: match.id,
          sellingMaterialId: match.metadata?.sellingMaterialId,
        });
        // Continue to next result
        continue;
      }
    }

    logger.info('Search completed successfully', {
      casNumber: normalizedCasNumber,
      resultsCount: results.length,
    });

    // Return results (preserving Pinecone order)
    return res.status(200).json({
      query,
      casNumber: normalizedCasNumber,
      topK: normalizedTopK,
      results,
    });
  } catch (error) {
    logger.error('Search request failed with unexpected error', {
      error: error.message,
    });

    return res.status(500).json({
      message: 'An error occurred while searching.',
    });
  }
};

module.exports = {
  searchSellingMaterialsByQuery,
};
