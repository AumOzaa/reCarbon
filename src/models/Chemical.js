const mongoose = require('mongoose');

const ChemicalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    formula: {
      type: String,
      required: true,
      trim: true,
    },
    casNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Chemical', ChemicalSchema);
