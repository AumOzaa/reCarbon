const logger = require('../config/logger');
const { buildPersonalizedFeed, getGeneralMarketplaceFeed } = require('../services/feed.service');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Get personalized marketplace feed
 * GET /api/feed?page=1&limit=20
 */
const getFeed = async (req, res) => {
  try {
    const manufacturingCompanyId = req.user.manufacturingCompanyId;
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;

    logger.info('Feed request received', {
      manufacturingCompanyId,
      page,
      limit,
    });

    // ========== VALIDATE PAGINATION ==========

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > MAX_LIMIT
    ) {
      logger.warn('Feed request - invalid pagination parameters', {
        page,
        limit,
        manufacturingCompanyId,
      });
      return res.status(400).json({
        message: `Invalid pagination. page must be >= 1, limit must be between 1 and ${MAX_LIMIT}`,
      });
    }

    // ========== BUILD FEED ==========

    let feedResults;
    try {
      // Try to build personalized feed
      feedResults = await buildPersonalizedFeed(manufacturingCompanyId);

      // If no results from personalized feed, use general marketplace feed
      if (feedResults.length === 0) {
        logger.info('Personalized feed empty, using general marketplace feed', {
          manufacturingCompanyId,
        });
        feedResults = await getGeneralMarketplaceFeed(manufacturingCompanyId);
      }
    } catch (feedError) {
      logger.error('Feed building failed', {
        error: feedError.message,
        manufacturingCompanyId,
      });
      return res.status(500).json({
        message: 'Unable to generate feed recommendations.',
      });
    }

    // ========== PAGINATE RESULTS ==========

    const startIndex = (parsedPage - 1) * parsedLimit;
    const endIndex = startIndex + parsedLimit;
    const paginatedResults = feedResults.slice(startIndex, endIndex);
    const hasMore = endIndex < feedResults.length;

    logger.info('Feed paginated', {
      manufacturingCompanyId,
      page: parsedPage,
      limit: parsedLimit,
      totalResults: feedResults.length,
      returnedResults: paginatedResults.length,
      hasMore,
    });

    // ========== FORMAT RESPONSE ==========

    const response = {
      page: parsedPage,
      limit: parsedLimit,
      hasMore,
      results: paginatedResults.map((result) => ({
        score: result.finalScore, // Alias for finalScore
        relevanceScore: result.relevanceScore,
        freshnessScore: result.freshnessScore,
        sellingMaterial: {
          _id: result.sellingMaterial._id,
          manufacturingCompanyId: result.sellingMaterial.manufacturingCompanyId,
          sourceLocation: result.sellingMaterial.sourceLocation,
          cadence: result.sellingMaterial.cadence,
          state: result.sellingMaterial.state,
          data: result.sellingMaterial.data,
          embeddingId: result.sellingMaterial.embeddingId,
          createdAt: result.sellingMaterial.createdAt,
          updatedAt: result.sellingMaterial.updatedAt,
          chemical: {
            _id: result.sellingMaterial.chemicalId._id,
            name: result.sellingMaterial.chemicalId.name,
            formula: result.sellingMaterial.chemicalId.formula,
            casNumber: result.sellingMaterial.chemicalId.casNumber,
          },
        },
        company: result.company,
      })),
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Feed request failed with unexpected error', {
      error: error.message,
      manufacturingCompanyId: req.user?.manufacturingCompanyId,
    });

    return res.status(500).json({
      message: 'Unable to generate feed recommendations.',
    });
  }
};

module.exports = {
  getFeed,
};
