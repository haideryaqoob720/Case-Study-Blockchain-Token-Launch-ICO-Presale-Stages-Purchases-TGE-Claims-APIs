const mongoose = require('mongoose');

const tokenClaimSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    stakingRewards: {
      type: Number,
      default: 0
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    blockNumber: {
      type: Number
    },
    claimTimestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const TokenClaim = mongoose.model('TokenClaim', tokenClaimSchema);

module.exports = TokenClaim;
