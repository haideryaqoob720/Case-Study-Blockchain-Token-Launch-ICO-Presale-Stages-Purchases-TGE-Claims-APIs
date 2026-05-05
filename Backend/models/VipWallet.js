const mongoose = require('mongoose');

const vipWalletSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },
    vipCode: {
      type: String,
      required: true,
      lowercase: true
    },
    badgeName: {
      type: String,
      default: 'VIP'
    },
    expireDate: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('VipWallet', vipWalletSchema);
