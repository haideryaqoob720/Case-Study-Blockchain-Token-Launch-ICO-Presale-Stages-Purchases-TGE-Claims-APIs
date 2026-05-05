const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer: { type: String, required: true, lowercase: true },
  buyer: { type: String, required: true, lowercase: true },
  token: { type: String, required: true, lowercase: true },
  amount: { type: Number, required: true },
  txHash: { type: String, required: true, unique: true },
  chain: { type: String, required: true },
  tokenType: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Referral', referralSchema);
