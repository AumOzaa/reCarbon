const axios = require('axios');
const logger = require('../config/logger');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'embeddinggemma:latest';

/**
 * Generate an embedding vector using Ollama embeddinggemma:300m model
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - 768-dimensional embedding array
 * @throws {Error} - If embedding generation fails
 */
const generateEmbedding = async (text) => {
  try {
    logger.debug('Embedding generation started', {
      model: EMBEDDING_MODEL,
      textLength: text.length,
    });

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/embed`, {
      model: EMBEDDING_MODEL,
      input: text,
    });

    const embedding = response.data.embeddings?.[0];

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from Ollama');
    }

    logger.debug('Embedding generation completed', {
      model: EMBEDDING_MODEL,
      embeddingDimension: embedding.length,
    });

    return embedding;
  } catch (error) {
    logger.error('Embedding generation failed', {
      error: error.message,
      model: EMBEDDING_MODEL,
      ollamaUrl: OLLAMA_BASE_URL,
    });

    throw new Error(
      `Failed to generate embedding: ${error.message}. Ensure Ollama is running at ${OLLAMA_BASE_URL}`
    );
  }
};

module.exports = {
  generateEmbedding,
};
