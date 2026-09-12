const logger = require('../config/logger');
const SellingMaterial = require('../models/SellingMaterial');
const BuyingMaterial = require('../models/BuyingMaterial');
const ManufacturingCompany = require('../models/ManufacturingCompany');
const CompanyAccount = require('../models/CompanyAccount');
const ServiceablePincode = require('../models/ServiceablePincode');
const LogisticsCompanyAccount = require('../models/LogisticsCompanyAccount');
const { generateEmbedding } = require('./embedding.service');
const { searchSellingMaterials } = require('./pinecone.service');

const PINECONE_TOP_K = 20; // Fixed for now
const FRESHNESS_DECAY_DAYS = parseInt(
  process.env.FEED_FRESHNESS_DECAY_DAYS || '30',
  10
);
const MAX_CONCURRENT_EMBEDDINGS = 5;

/**
 * Build interest representation text from a material
 */
const buildInterestRepresentation = (material, materialType) => {
  const chemical = material.chemicalId;
  const lines = [];

  lines.push(`Chemical: ${chemical.name}`);
  lines.push(`Formula: ${chemical.formula}`);
  lines.push(`CAS: ${chemical.casNumber}`);

  if (materialType === 'buying') {
    lines.push(`Required Location: ${material.reqLocation}`);
  } else {
    lines.push(`Source Location: ${material.sourceLocation}`);
    lines.push(`Cadence: ${material.cadence}`);
    lines.push(`State: ${material.state}`);
  }

  // Add flexible data fields
  if (material.data && Object.keys(material.data).length > 0) {
    Object.entries(material.data).forEach(([key, value]) => {
      lines.push(`${key}: ${value}`);
    });
  }

  return lines.join('\n');
};

/**
 * Generate embeddings for multiple interests with concurrency control
 */
const generateInterestEmbeddings = async (interests) => {
  const embeddings = [];
  const errors = [];

  for (let i = 0; i < interests.length; i += MAX_CONCURRENT_EMBEDDINGS) {
    const batch = interests.slice(i, i + MAX_CONCURRENT_EMBEDDINGS);

    const batchPromises = batch.map(async (interest) => {
      try {
        const embedding = await generateEmbedding(interest.representation);
        return {
          interestId: interest.id,
          materialType: interest.materialType,
          materialId: interest.materialId,
          embedding,
        };
      } catch (error) {
        logger.error('Interest embedding generation failed', {
          error: error.message,
          interestId: interest.id,
        });
        errors.push(error);
        return null;
      }
    });

    const results = await Promise.all(batchPromises);
    embeddings.push(...results.filter((r) => r !== null));
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to generate ${errors.length} interest embeddings`
    );
  }

  return embeddings;
};

/**
 * Fetch available logistics companies for a given pincode
 */
const fetchAvailableLogisticsForFeed = async (pincode) => {
  if (!pincode) {
    return [];
  }

  try {
    // Find all serviceable pincodes matching this pincode
    const serviceablePincodes = await ServiceablePincode.find({
      pincode,
    }).populate('logisticsCompanyId');

    if (serviceablePincodes.length === 0) {
      return [];
    }

    // Extract unique logistics companies and fetch their account details
    const logisticsIds = [
      ...new Set(
        serviceablePincodes.map((sp) => sp.logisticsCompanyId._id.toString())
      ),
    ];

    // Fetch account details for all logistics companies
    const accountsMap = new Map();
    const accounts = await LogisticsCompanyAccount.find({
      logisticsCompanyId: { $in: logisticsIds },
    }).select('email logisticsCompanyId');

    accounts.forEach((acc) => {
      accountsMap.set(acc.logisticsCompanyId.toString(), acc.email);
    });

    // Build logistics company details
    const logisticsCompanies = serviceablePincodes.map((sp) => ({
      _id: sp.logisticsCompanyId._id,
      name: sp.logisticsCompanyId.name,
      location: sp.logisticsCompanyId.location,
      address: sp.logisticsCompanyId.address,
      contactNum: sp.logisticsCompanyId.contactNum,
      email: accountsMap.get(sp.logisticsCompanyId._id.toString()) || null,
      createdAt: sp.logisticsCompanyId.createdAt,
      updatedAt: sp.logisticsCompanyId.updatedAt,
    }));

    // Remove duplicates based on _id
    const uniqueLogistics = Array.from(
      new Map(logisticsCompanies.map((lc) => [lc._id.toString(), lc])).values()
    );

    return uniqueLogistics;
  } catch (error) {
    logger.warn('Error fetching available logistics for feed', {
      error: error.message,
      pincode,
    });
    return [];
  }
};

/**
 * Fetch company details for a selling material
 */
const fetchCompanyDetails = async (manufacturingCompanyId) => {
  try {
    const [company, account] = await Promise.all([
      ManufacturingCompany.findById(manufacturingCompanyId),
      CompanyAccount.findOne({ manufacturingCompanyId }).select('email createdAt updatedAt'),
    ]);

    if (!company) {
      return null;
    }

    // Fetch available logistics companies for this pincode
    let availableLogistics = [];
    if (company.pincode) {
      availableLogistics = await fetchAvailableLogisticsForFeed(company.pincode);
    }

    return {
      _id: company._id,
      name: company.name,
      location: company.location,
      address: company.address,
      pincode: company.pincode || null,
      contactNum: company.contactNum,
      email: account?.email || null,
      availableLogistics,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      accountCreatedAt: account?.createdAt || null,
      accountUpdatedAt: account?.updatedAt || null,
    };
  } catch (error) {
    logger.warn('Error fetching company details', {
      error: error.message,
      manufacturingCompanyId,
    });
    return null;
  }
};

/**
 * Calculate freshness score using exponential decay
 */
const calculateFreshnessScore = (createdAt) => {
  const ageInMilliseconds = Date.now() - new Date(createdAt).getTime();
  const ageInDays = ageInMilliseconds / (1000 * 60 * 60 * 24);
  const freshnessScore = Math.exp(-ageInDays / FRESHNESS_DECAY_DAYS);
  return Math.max(0, Math.min(1, freshnessScore)); // Clamp to [0, 1]
};

/**
 * Query Pinecone for each interest embedding
 */
const queryPineconeForInterests = async (interestEmbeddings) => {
  const allCandidates = [];

  for (const interestData of interestEmbeddings) {
    try {
      const matches = await searchSellingMaterials(
        interestData.embedding,
        null, // No CAS filter for general feed
        PINECONE_TOP_K
      );

      // Add interest info to each match
      matches.forEach((match) => {
        allCandidates.push({
          sellingMaterialId: match.metadata?.sellingMaterialId,
          pinceconeScore: match.score,
          interestType: interestData.materialType,
          interestId: interestData.interestId,
        });
      });

      logger.debug('Pinecone search completed for interest', {
        interestId: interestData.interestId,
        matchCount: matches.length,
      });
    } catch (error) {
      logger.error('Pinecone search failed for interest', {
        error: error.message,
        interestId: interestData.interestId,
      });
      throw error;
    }
  }

  return allCandidates;
};

/**
 * Deduplicate candidates by sellingMaterialId, keeping max score
 */
const deduplicateCandidates = (candidates) => {
  const deduped = new Map();

  candidates.forEach((candidate) => {
    const key = candidate.sellingMaterialId;
    const existing = deduped.get(key);

    if (!existing || candidate.pinceconeScore > existing.pinceconeScore) {
      deduped.set(key, candidate);
    }
  });

  return Array.from(deduped.values());
};

/**
 * Build the personalized feed for an authenticated company
 */
const buildPersonalizedFeed = async (manufacturingCompanyId) => {
  logger.info('Building personalized feed', { manufacturingCompanyId });

  // ========== FETCH COMPANY INTERESTS ==========

  const [buyingMaterials, sellingMaterials] = await Promise.all([
    BuyingMaterial.find({ manufacturingCompanyId }).populate('chemicalId'),
    SellingMaterial.find({ manufacturingCompanyId }).populate('chemicalId'),
  ]);

  const interestCount = buyingMaterials.length + sellingMaterials.length;
  logger.info('Company interests found', {
    manufacturingCompanyId,
    buyingCount: buyingMaterials.length,
    sellingCount: sellingMaterials.length,
    totalInterests: interestCount,
  });

  // ========== BUILD INTEREST REPRESENTATIONS ==========

  const interests = [];

  buyingMaterials.forEach((bm, idx) => {
    interests.push({
      id: `buying_${bm._id}`,
      materialType: 'buying',
      materialId: bm._id,
      representation: buildInterestRepresentation(bm, 'buying'),
    });
  });

  sellingMaterials.forEach((sm, idx) => {
    interests.push({
      id: `selling_${sm._id}`,
      materialType: 'selling',
      materialId: sm._id,
      representation: buildInterestRepresentation(sm, 'selling'),
    });
  });

  // ========== GENERATE EMBEDDINGS & QUERY PINECONE ==========

  let candidates = [];

  if (interests.length > 0) {
    logger.info('Generating interest embeddings', {
      interestCount: interests.length,
    });

    const interestEmbeddings = await generateInterestEmbeddings(interests);
    logger.info('Interest embeddings generated', {
      embeddingCount: interestEmbeddings.length,
    });

    logger.info('Querying Pinecone for interests', {
      interestCount: interestEmbeddings.length,
    });

    candidates = await queryPineconeForInterests(interestEmbeddings);
    logger.info('Pinecone search results collected', {
      candidateCount: candidates.length,
    });
  } else {
    // New company with no interests - will use general marketplace feed
    logger.info('Company has no interests, will use general feed', {
      manufacturingCompanyId,
    });
  }

  // ========== DEDUPLICATE CANDIDATES ==========

  const dedupedCandidates = deduplicateCandidates(candidates);
  logger.info('Candidates deduplicated', {
    before: candidates.length,
    after: dedupedCandidates.length,
  });

  // ========== FETCH FROM MONGODB & EXCLUDE OWN COMPANY ==========

  const candidateIds = dedupedCandidates.map((c) => c.sellingMaterialId);
  let fetchedMaterials = [];

  if (candidateIds.length > 0) {
    fetchedMaterials = await SellingMaterial.find({
      _id: { $in: candidateIds },
      manufacturingCompanyId: { $ne: manufacturingCompanyId }, // Exclude own company
    }).populate('chemicalId');

    logger.info('SellingMaterials fetched from MongoDB', {
      candidateCount: candidateIds.length,
      fetchedCount: fetchedMaterials.length,
    });
  }

  // ========== ENRICHMENT: ADD SCORES AND COMPANY DETAILS TO RESULTS ==========

  // Create a map of candidate info for quick lookup
  const candidateMap = new Map();
  dedupedCandidates.forEach((c) => {
    if (!candidateMap.has(c.sellingMaterialId)) {
      candidateMap.set(c.sellingMaterialId, c);
    }
  });

  // Fetch company details for each unique seller (with caching to avoid duplicates)
  const companyCache = new Map();
  const resultsWithScores = [];

  for (const material of fetchedMaterials) {
    const candidateInfo = candidateMap.get(material._id.toString());
    const relevanceScore = candidateInfo?.pinceconeScore || 0;
    const freshnessScore = calculateFreshnessScore(material.createdAt);

    // 80% relevance, 20% freshness
    const finalScore = 0.8 * relevanceScore + 0.2 * freshnessScore;

    // Get or fetch company details
    const companyId = material.manufacturingCompanyId.toString();
    let companyDetails = companyCache.get(companyId);
    if (!companyDetails) {
      companyDetails = await fetchCompanyDetails(material.manufacturingCompanyId);
      companyCache.set(companyId, companyDetails);
    }

    resultsWithScores.push({
      _id: material._id,
      sellingMaterial: material,
      company: companyDetails,
      relevanceScore: parseFloat(relevanceScore.toFixed(4)),
      freshnessScore: parseFloat(freshnessScore.toFixed(4)),
      finalScore: parseFloat(finalScore.toFixed(4)),
    });
  }

  // ========== SORT BY FINAL SCORE ==========

  resultsWithScores.sort((a, b) => {
    // Primary: final score descending
    if (Math.abs(a.finalScore - b.finalScore) > 0.001) {
      return b.finalScore - a.finalScore;
    }
    // Tiebreaker: createdAt descending
    return (
      new Date(b.sellingMaterial.createdAt) -
      new Date(a.sellingMaterial.createdAt)
    );
  });

  logger.info('Feed ready for pagination', {
    manufacturingCompanyId,
    resultCount: resultsWithScores.length,
  });

  return resultsWithScores;
};

/**
 * Get general marketplace feed (newest SellingMaterials)
 */
const getGeneralMarketplaceFeed = async (manufacturingCompanyId) => {
  logger.info('Getting general marketplace feed', { manufacturingCompanyId });

  const materials = await SellingMaterial.find({
    manufacturingCompanyId: { $ne: manufacturingCompanyId }, // Exclude own company
  })
    .populate('chemicalId')
    .sort({ createdAt: -1 });

  // Fetch company details for each unique seller (with caching to avoid duplicates)
  const companyCache = new Map();
  const resultsWithScores = [];

  for (const material of materials) {
    const freshnessScore = calculateFreshnessScore(material.createdAt);

    // Get or fetch company details
    const companyId = material.manufacturingCompanyId.toString();
    let companyDetails = companyCache.get(companyId);
    if (!companyDetails) {
      companyDetails = await fetchCompanyDetails(material.manufacturingCompanyId);
      companyCache.set(companyId, companyDetails);
    }

    resultsWithScores.push({
      _id: material._id,
      sellingMaterial: material,
      company: companyDetails,
      relevanceScore: 0, // No relevance for general feed
      freshnessScore: parseFloat(freshnessScore.toFixed(4)),
      finalScore: parseFloat(freshnessScore.toFixed(4)), // Use only freshness for sorting
    });
  }

  logger.info('General marketplace feed ready', {
    manufacturingCompanyId,
    resultCount: resultsWithScores.length,
  });

  return resultsWithScores;
};

module.exports = {
  buildPersonalizedFeed,
  getGeneralMarketplaceFeed,
  calculateFreshnessScore,
};
