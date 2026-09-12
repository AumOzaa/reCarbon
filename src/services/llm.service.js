const axios = require('axios');
const logger = require('../config/logger');

// For local Ollama that supports chat completions
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-oss:120b-cloud';

/**
 * Extract CAS number from natural language query using LLM
 * @param {string} query - Natural language search query
 * @returns {Promise<{casNumber: string | null}>} - Extracted CAS number or null
 * @throws {Error} - If LLM call fails or response is invalid
 */
const extractCasNumber = async (query) => {
  try {
    logger.debug('CAS extraction started', {
      model: LLM_MODEL,
      queryLength: query.length,
    });

    const systemPrompt = `You extract chemical CAS numbers from user search queries.

Return ONLY valid JSON with this exact shape:

{
  "casNumber": string | null
}

If a CAS number is explicitly present or can be confidently identified from the query, return it.

If the query does not contain a CAS number and you cannot confidently determine one, return null.

Do not guess a CAS number.

Do not return chemical names as casNumber.

Do not return explanations.`;

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      stream: false,
    });

    const responseText = response.data.message?.content || response.data.response;

    if (!responseText) {
      throw new Error('Empty response from LLM');
    }

    logger.debug('LLM response received', {
      responseLength: responseText.length,
    });

    // Extract JSON from response (may contain extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      logger.warn('No JSON found in LLM response', {
        response: responseText.substring(0, 200),
      });
      throw new Error('LLM response does not contain valid JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (!result.hasOwnProperty('casNumber')) {
      throw new Error('LLM response missing casNumber field');
    }

    logger.info('CAS extraction completed', {
      casNumber: result.casNumber,
    });

    return {
      casNumber: result.casNumber,
    };
  } catch (error) {
    logger.error('CAS extraction failed', {
      error: error.message,
      model: LLM_MODEL,
      ollamaUrl: OLLAMA_BASE_URL,
    });

    throw new Error(
      `Failed to extract CAS number from query: ${error.message}. Ensure Ollama is running at ${OLLAMA_BASE_URL} with model ${LLM_MODEL}`
    );
  }
};

module.exports = {
  extractCasNumber,
};
