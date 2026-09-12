/**
 * Validation utilities for the reCarbon API
 */

const PINCODE_REGEX = /^\d{6}$/;

/**
 * Validate Indian pincode format (exactly 6 digits)
 * @param {string} pincode - The pincode to validate
 * @returns {boolean} - true if valid, false otherwise
 */
const validatePincode = (pincode) => {
  if (typeof pincode !== 'string') return false;
  return PINCODE_REGEX.test(pincode.trim());
};

module.exports = {
  validatePincode,
};
