const { Pinecone } = require('@pinecone-database/pinecone');
const logger = require('../config/logger');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

let pineconeClient = null;
let indexReady = false;

/**
 * Initialize Pinecone client and verify index
 */
const initializePinecone = async () => {
  try {
    if (!PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
      throw new Error(
        'Missing Pinecone configuration: PINECONE_API_KEY and PINECONE_INDEX_NAME required'
      );
    }

    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });

    // Verify index exists
    const indexes = await pineconeClient.listIndexes();
    const indexExists = indexes.indexes?.some(
      (idx) => idx.name === PINECONE_INDEX_NAME
    );

    if (!indexExists) {
      logger.warn('Pinecone index does not exist', {
        indexName: PINECONE_INDEX_NAME,
        availableIndexes: indexes.indexes?.map((idx) => idx.name) || [],
      });

      throw new Error(
        `Pinecone index '${PINECONE_INDEX_NAME}' does not exist. ` +
          `Create it with dimension 768 and cosine metric, or set PINECONE_INDEX_NAME to an existing index.`
      );
    }

    indexReady = true;
    logger.info('Pinecone initialized successfully', {
      indexName: PINECONE_INDEX_NAME,
    });
  } catch (error) {
    logger.error('Pinecone initialization failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Upsert a selling material vector to Pinecone
 * @param {string} sellingMaterialId - MongoDB SellingMaterial ID
 * @param {number[]} embedding - 768-dimensional embedding vector
 * @param {Object} metadata - Vector metadata
 * @throws {Error} - If upsert fails
 */
const upsertSellingMaterialVector = async (sellingMaterialId, embedding, metadata) => {
  try {
    if (!indexReady) {
      throw new Error('Pinecone index not ready');
    }

    const vectorId = `sellingMaterial:${sellingMaterialId}`;

    logger.debug('Pinecone upsert started', {
      vectorId,
      embeddingDimension: embedding.length,
    });

    const index = pineconeClient.Index(PINECONE_INDEX_NAME);

    await index.upsert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          sellingMaterialId: sellingMaterialId.toString(),
          chemicalId: metadata.chemicalId?.toString() || '',
          casNumber: metadata.casNumber || '',
          ...metadata,
        },
      },
    ]);

    logger.info('Pinecone upsert completed', {
      vectorId,
      indexName: PINECONE_INDEX_NAME,
    });

    return vectorId;
  } catch (error) {
    logger.error('Pinecone upsert failed', {
      error: error.message,
      sellingMaterialId,
    });
    throw error;
  }
};

/**
 * Delete a selling material vector from Pinecone
 * @param {string} sellingMaterialId - MongoDB SellingMaterial ID
 * @throws {Error} - If deletion fails
 */
const deleteSellingMaterialVector = async (sellingMaterialId) => {
  try {
    if (!indexReady) {
      throw new Error('Pinecone index not ready');
    }

    const vectorId = `sellingMaterial:${sellingMaterialId}`;

    logger.debug('Pinecone deletion started', { vectorId });

    const index = pineconeClient.Index(PINECONE_INDEX_NAME);

    await index.deleteOne(vectorId);

    logger.info('Pinecone deletion completed', {
      vectorId,
      indexName: PINECONE_INDEX_NAME,
    });
  } catch (error) {
    logger.error('Pinecone deletion failed', {
      error: error.message,
      sellingMaterialId,
    });
    throw error;
  }
};

/**
 * Search selling materials in Pinecone with CAS filter
 * @param {number[]} embedding - Query embedding vector (768-dimensional)
 * @param {string} casNumber - Chemical CAS number (hard filter)
 * @param {number} topK - Number of top results to return
 * @returns {Promise<Array>} - Array of Pinecone matches with scores
 * @throws {Error} - If search fails
 */
const searchSellingMaterials = async (embedding, casNumber, topK = 10) => {
  try {
    if (!indexReady) {
      throw new Error('Pinecone index not ready');
    }

    if (!Array.isArray(embedding) || embedding.length !== 768) {
      throw new Error('Invalid embedding: must be 768-dimensional array');
    }

    logger.debug('Pinecone search started', {
      embeddingDimension: embedding.length,
      casNumber,
      topK,
    });

    const index = pineconeClient.Index(PINECONE_INDEX_NAME);

    // Pinecone query with metadata filter for CAS number
    const queryResponse = await index.query({
      vector: embedding,
      topK,
      filter: {
        casNumber: {
          $eq: casNumber,
        },
      },
      includeMetadata: true,
    });

    const matches = queryResponse.matches || [];

    logger.info('Pinecone search completed', {
      casNumber,
      topK,
      matchCount: matches.length,
    });

    return matches;
  } catch (error) {
    logger.error('Pinecone search failed', {
      error: error.message,
      casNumber,
      topK,
    });
    throw error;
  }
};

/**
 * Check if Pinecone is ready
 */
const isPineconeReady = () => indexReady;

module.exports = {
  initializePinecone,
  upsertSellingMaterialVector,
  deleteSellingMaterialVector,
  searchSellingMaterials,
  isPineconeReady,
};
