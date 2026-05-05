const mongoose = require('mongoose');

const walletCustomerSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    totalTokensPurchased: {
      type: Number,
      default: 0
    },
    totalAmountPaid: {
      type: Number,
      default: 0
    },
    purchases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase'
      }
    ],
    isWhitelisted: {
      type: Boolean,
      default: true
    },
    maxPurchaseAmount: {
      type: Number
    },
    chains: [
      {
        type: String,
        enum: ['ethereum', 'bsc', 'polygon', 'solana']
      }
    ],
    lastActive: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String
    },
    // Staking fields
    totalStaked: {
      type: Number,
      default: 0
    },
    activeStakes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stake'
      }
    ],
    stakes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stake'
      }
    ],
    totalAmountStaked: {
      type: Number,
      default: 0
    },
    totalRewardsClaimed: {
      type: Number,
      default: 0
    },
    lastStakeDate: {
      type: Date
    },
    lastClaimDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Add indexes for performance
walletCustomerSchema.index({ walletAddress: 1 });
walletCustomerSchema.index({ isWhitelisted: 1 });

const WalletCustomer = mongoose.model('WalletCustomer', walletCustomerSchema);

module.exports = WalletCustomer;
