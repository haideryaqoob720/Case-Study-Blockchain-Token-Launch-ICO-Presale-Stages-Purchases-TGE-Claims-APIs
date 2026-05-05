const mongoose = require('mongoose');

const twitterSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true
    },
    referralLink: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Twitter = mongoose.model('Twitter', twitterSchema, 'twitter');

module.exports = Twitter;
