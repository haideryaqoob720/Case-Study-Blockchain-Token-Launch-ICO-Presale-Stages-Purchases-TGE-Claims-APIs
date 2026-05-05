const mongoose = require('mongoose');

const vipReferralSchema = new mongoose.Schema(
  {
    vipCode: {
      type: String,
      required: true,
      unique: true,
      default: 'VIP2025'
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    shareableLink: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('VipReferral', vipReferralSchema);
