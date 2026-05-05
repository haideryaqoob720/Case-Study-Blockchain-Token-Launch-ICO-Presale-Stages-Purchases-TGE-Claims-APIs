const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletCustomer',
      required: true
    },
    stageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stage',
      required: true
    },
    stageNumber: {
      type: Number,
      required: true,
      index: true
    },
    tokenAmount: {
      type: Number,
      required: true
    },
    tokenPrice: {
      type: Number,
      required: true
    },
    paymentAmount: {
      type: Number,
      required: true
    },
    paymentAmountFormatted: {
      type: String,
      required: true
    },
    paymentCurrency: {
      type: String,
      required: true,
      default: 'USDT'
    },
    paymentTxHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'rejected'],
      default: 'pending'
    },
    notes: {
      type: String
    },
    // New fields for blockchain integration
    chain: {
      type: String,
      enum: ['ethereum', 'bsc', 'polygon', 'solana'],
      required: true
    },
    blockNumber: {
      type: Number
    },
    txDetails: {
      type: Object
    },
    eventData: {
      type: Object
    },
    fiatAmount: {
      type: Number
    },
    fiatCurrency: {
      type: String,
      default: 'USD'
    },
    tokenSymbol: {
      type: String
    },
    conversionRate: {
      type: Number
    },
    orderId: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;
