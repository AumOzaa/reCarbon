const logger = require('../config/logger');

/**
 * Build a normalized text representation of a selling material for embedding
 * Dynamically includes all fields without hardcoding specific attributes
 *
 * @param {Object} chemical - Chemical object with name, formula, casNumber
 * @param {string} sourceLocation - Source location
 * @param {string} cadence - Supply cadence
 * @param {string} state - Physical state
 * @param {Object} data - Flexible key-value data
 * @returns {string} - Normalized text for embedding
 */
const buildEmbeddingText = (chemical, sourceLocation, cadence, state, data = {}) => {
  const lines = [];

  // Chemical information
  if (chemical?.name) {
    lines.push(`Chemical: ${chemical.name}`);
  }
  if (chemical?.formula) {
    lines.push(`Formula: ${chemical.formula}`);
  }
  if (chemical?.casNumber) {
    lines.push(`CAS: ${chemical.casNumber}`);
  }

  // Location and supply info
  if (sourceLocation) {
    lines.push(`Source Location: ${sourceLocation}`);
  }
  if (cadence) {
    lines.push(`Cadence: ${cadence}`);
  }
  if (state) {
    lines.push(`State: ${state}`);
  }

  // Dynamic data fields
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    for (const [key, value] of Object.entries(data)) {
      // Convert key to title case for readability
      const titleCaseKey = key
        .split(/(?=[A-Z])/) // Split on uppercase letters
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      lines.push(`${titleCaseKey}: ${value}`);
    }
  }

  const embeddingText = lines.join('\n');

  logger.debug('Embedding text built', {
    textLength: embeddingText.length,
    fieldCount: lines.length,
  });

  return embeddingText;
};

module.exports = {
  buildEmbeddingText,
};
