const mongoose = require('mongoose');

const CompanyAccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    manufacturingCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ManufacturingCompany',
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CompanyAccount', CompanyAccountSchema);
