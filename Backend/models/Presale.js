const mongoose = require('mongoose');
const { PRODUCTION_CONFIG } = require('../constants');

const presaleSchema = new mongoose.Schema(
  {
    tokenName: {
      type: String,
      required: true,
      trim: true,
      default: PRODUCTION_CONFIG.DEFAULT_TOKEN.NAME
    },
    tokenSymbol: {
      type: String,
      required: true,
      trim: true,
      default: PRODUCTION_CONFIG.DEFAULT_TOKEN.SYMBOL
    },
    tokenAddress: {
      type: String,
      trim: true,
      default: PRODUCTION_CONFIG.ZERO_ADDRESS
    },
    masterWallet: {
      type: String,
      required: true,
      trim: true,
      default: PRODUCTION_CONFIG.ZERO_ADDRESS
    },
    TGETime: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + PRODUCTION_CONFIG.DEFAULT_TOKEN.TGE_TIME_OFFSET)
    },
    isLive: {
      type: Boolean,
      default: true
    },
    stakingEnabled: {
      type: Boolean,
      default: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true // Ensure one customer can have only one presale
    },
    total_tokens: {
      type: Number,
      default: 0
    },
    reward_per_block: {
      type: Number,
      default: 0
    },
    stakingContract: {
      type: String,
      trim: true,
      default: PRODUCTION_CONFIG.ZERO_ADDRESS
    },
    claimContract: {
      type: String,
      trim: true,
      default: PRODUCTION_CONFIG.ZERO_ADDRESS
    }
  },
  {
    timestamps: true
  }
);

presaleSchema.index({ customerId: 1 }, { unique: true });

const Presale = mongoose.model('Presale', presaleSchema);

module.exports = Presale;
