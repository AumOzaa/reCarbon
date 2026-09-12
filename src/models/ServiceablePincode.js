const mongoose = require('mongoose');

const ServiceablePincodeSchema = new mongoose.Schema(
  {
    logisticsCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LogisticsCompany',
      required: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index on pincode for efficient lookup
ServiceablePincodeSchema.index({ pincode: 1 });

// Compound unique index to prevent duplicates
ServiceablePincodeSchema.index({ logisticsCompanyId: 1, pincode: 1 }, { unique: true });

module.exports = mongoose.model('ServiceablePincode', ServiceablePincodeSchema);
