const mongoose = require('mongoose');

const WertPurchaseSchema = new mongoose.Schema(
  {
    click_id: { type: String },
    order_id: { type: String },
    base: { type: String }, // e.g. ETH, BNB, etc.
    base_amount: { type: Number },
    quote: { type: String }, // e.g. USD
    quote_amount: { type: Number },
    address: { type: String },
    transaction_id: { type: String },
    status: { type: String, enum: ['order_canceled', 'order_complete', 'order_failed'] },
    user_id: { type: String }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WertPurchase', WertPurchaseSchema);
