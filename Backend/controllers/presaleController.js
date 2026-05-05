const Presale = require('../models/Presale');
const stakingService = require('../services/stakingService');

/**
 * Get the presale details
 */
exports.getPresale = async (req, res) => {
  try {
    // Get the presale (we only have one in the system)
    const presale = await Presale.findOne().populate('customerId', '-password');

    if (!presale) {
      return res.status(404).json({
        success: false,
        message:
          'No presale found. Presales are created through blockchain events.'
      });
    }

    return res.status(200).json({
      success: true,
      data: presale
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get the allocated tokens information
 */
exports.getAllocatedTokens = async (req, res) => {
  try {
    // Get the presale (we only have one in the system)
    const presale = await Presale.findOne();

    if (!presale) {
      return res.status(404).json({
        success: false,
        message: 'No presale found.'
      });
    }

    // Get purchase stats to check total tokens sold
    const Purchase = require('../models/Purchase');
    const purchaseStats = await Purchase.aggregate([
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalTokensSold: { $sum: '$tokenAmount' }
        }
      }
    ]);

    const totalTokensSold =
      purchaseStats.length > 0 ? purchaseStats[0].totalTokensSold : 0;

    // Calculate remaining allocation
    const allocated = presale.total_tokens || 0;
    const remainingAllocation = Math.max(0, allocated - totalTokensSold);

    // Get the current active stage for token price
    const Stage = require('../models/Stage');
    const activeStage = await Stage.findOne({ isActive: true });
    const tokenPrice = activeStage ? activeStage.pricePerToken : 0;

    return res.status(200).json({
      success: true,
      data: {
        reward_per_block: presale.reward_per_block,
        allocated_tokens: allocated,
        total_tokens_sold: totalTokensSold,
        remaining_allocation: remainingAllocation,
        token_price: tokenPrice,
        allocation_value: remainingAllocation * tokenPrice
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Get reward per block from the smart contract
 */
exports.getRewardPerBlock = async (req, res) => {
  try {
    // Use the stakingService to get the reward per block
    const rewardPerBlock = await stakingService.getRewardPerBlock();

    return res.status(200).json({
      success: true,
      data: {
        rewardPerBlock: rewardPerBlock
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching reward per block from contract',
      error: error.message
    });
  }
};
