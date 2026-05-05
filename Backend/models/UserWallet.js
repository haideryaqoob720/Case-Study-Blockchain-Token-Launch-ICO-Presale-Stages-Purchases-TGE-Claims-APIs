const mongoose = require('mongoose');

const userWalletSchema = new mongoose.Schema(
  {
    orderId: {
      type: Number, // Generated from timestamp
      required: true,
      unique: true
    },
    userWallet: {
      type: String,
      required: true
    },
    publicKey: {
      type: String,
      required: true,
      unique: true
    },
    privateKey: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true,
      unique: true
    },
    balance: {
      type: Number,
      default: 0
    },
    lastPaymentCheck: {
      type: Date,
      default: Date.now
    },
    transactionStatus: {
      type: String,
      default: 'pending'
    },
    referralCode: {
      type: String,
      default: null
    },
    referralReward: {
      type: Number,
      default: 0
    },
    referralRewardClaim: {
      type: String,
      default: null
    },
    referralRewardClaimedAmount: {
      type: Number,
      default: 0
    },
    confirmedTimestamp: {
      type: Date,
      default: null
    },
    fundsTransferred: {
      type: Boolean,
      default: false
    },
    purchaseProcessed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('UserWallet', userWalletSchema);
