const mongoose = require('mongoose');

const LogisticsCompanyAccountSchema = new mongoose.Schema(
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
    logisticsCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LogisticsCompany',
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LogisticsCompanyAccount', LogisticsCompanyAccountSchema);
