const mongoose = require('mongoose');

const SellingMaterialSchema = new mongoose.Schema(
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
    sourceLocation: {
      type: String,
      required: true,
      trim: true,
    },
    cadence: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    state: {
      type: String,
      enum: ['solid', 'liquid', 'gas'],
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    embeddingId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SellingMaterial', SellingMaterialSchema);
