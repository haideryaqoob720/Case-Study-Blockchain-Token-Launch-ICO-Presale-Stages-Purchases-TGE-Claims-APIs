const mongoose = require('mongoose');

const solanaTokenPurchaseSchema = new mongoose.Schema(
  {
    orderId: {
      type: Number,
      required: true
    },
    solAmount: {
      type: Number,
      required: true
    },
    metTokensAllocated: {
      type: Number,
      required: true
    },
    transactionHash: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      default: 'confirmed'
    },
    stageId: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'solanatokenpurchases'
  }
);

module.exports = mongoose.model('SolanaTokenPurchase', solanaTokenPurchaseSchema);
