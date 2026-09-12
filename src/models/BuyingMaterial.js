const mongoose = require('mongoose');

const BuyingMaterialSchema = new mongoose.Schema(
  {
    manufacturingCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ManufacturingCompany',
      required: true,
    },
    chemicalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chemical',
      required: true,
    },
    reqLocation: {
      type: String,
      required: true,
      trim: true,
    },
    reqPincode: {
      type: String,
      trim: true,
      // reqPincode is required for new records but existing records may not have it
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one buying material per company/chemical
BuyingMaterialSchema.index(
  { manufacturingCompanyId: 1, chemicalId: 1 },
  { unique: true }
);

module.exports = mongoose.model('BuyingMaterial', BuyingMaterialSchema);
