const mongoose = require('mongoose');

const vipReferralPurchaseSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      required: true
    },
    vipReferralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VipReferral',
      required: true
    },
    vipCode: {
      type: String,
      required: true,
      lowercase: true
    },
    buyerWallet: {
      type: String,
      required: true,
      lowercase: true
    },
    originalTokenAmount: {
      type: Number,
      required: true
    },
    bonusTokenAmount: {
      type: Number,
      required: true
    },
    totalTokenAmount: {
      type: Number,
      required: true
    },
    purchaseAmount: {
      type: Number,
      required: true
    },
    purchaseCurrency: {
      type: String,
      default: 'USDT'
    },
    paymentTxHash: {
      type: String,
      required: true,
      unique: true
    },
    chain: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed'
    },
    bonusPaid: {
      type: Boolean,
      default: false
    },
    bonusPaidAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('VipReferralPurchase', vipReferralPurchaseSchema);
