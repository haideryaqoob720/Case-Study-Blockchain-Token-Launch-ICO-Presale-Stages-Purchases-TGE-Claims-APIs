const mongoose = require('mongoose');

const stakeSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    walletCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletCustomer',
      required: true,
      index: true
    },
    stageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stage',
      required: true,
      index: true
    },
    stageNumber: {
      type: Number,
      required: true,
      index: true
    },
    stakeIndex: {
      type: Number,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    previousWalletBalance: {
      type: Number,
      required: true,
      min: 0
    },
    currentStakingBalance: {
      type: Number,
      default: 0
    },
    startBlock: {
      type: Number,
      required: true
    },
    lastRewardBlock: {
      type: Number,
      default: null
    },
    endBlock: {
      type: Number,
      default: null
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    claimDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'claimed', 'unstaked', 'pending_met_confirmation', 'pending_unstake_confirmation', 'matured'],
      default: 'active'
    },
    percentageOfPool: {
      type: Number,
      default: 0
    },
    rewardEarned: {
      type: Number,
      default: 0
    },
    chain: {
      type: String,
      required: true
    },
    sourceChain: {
      type: String,
      required: true
    },
    durationMonths: {
      type: Number,
      enum: [3, 6],
      required: true
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
    // Source chain transaction details
    sourceTxHash: {
      type: String,
      index: true
    },
    sourceBlockNumber: {
      type: Number
    },
    // MET chain transaction details
    metTxHash: {
      type: String,
      index: true
    },
    metBlockNumber: {
      type: Number
    },
    metConfirmationDate: {
      type: Date
    },
    // Unstake transaction details
    unstakeSourceTxHash: {
      type: String,
      index: true
    },
    unstakeSourceBlockNumber: {
      type: Number
    },
    unstakeMetTxHash: {
      type: String,
      index: true
    },
    unstakeMetBlockNumber: {
      type: Number
    },
    txDetails: {
      type: Object
    },
    eventData: {
      type: Object
    }
  },
  {
    timestamps: true
  }
);

stakeSchema.index({ walletAddress: 1, status: 1 });
stakeSchema.index({ stageNumber: 1, status: 1 });
stakeSchema.index({ walletAddress: 1, stakeIndex: 1, status: 1 });
stakeSchema.index({ sourceChain: 1, status: 1 });
stakeSchema.index({ metBlockNumber: 1 });
stakeSchema.index({ lastRewardBlock: 1 });
stakeSchema.index({ claimDate: 1, status: 1 });

const Stake = mongoose.models.Stake || mongoose.model('Stake', stakeSchema);
module.exports = Stake;
