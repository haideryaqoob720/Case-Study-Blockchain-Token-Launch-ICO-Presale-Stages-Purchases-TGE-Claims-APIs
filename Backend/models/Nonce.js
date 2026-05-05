const mongoose = require('mongoose');

const nonceSchema = new mongoose.Schema({
  nonce: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  purpose: {
    type: String,
    enum: ['claim', 'allocation', 'stake', 'unstake'],
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // automatically delete documents after 30 days
  }
});

// Create compound index for faster lookups
nonceSchema.index({ nonce: 1, walletAddress: 1 });

module.exports = mongoose.model('Nonce', nonceSchema);
