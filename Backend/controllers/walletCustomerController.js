/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const WalletCustomer = require('../models/WalletCustomer');
const Purchase = require('../models/Purchase');
const stakingService = require('../services/stakingService');

exports.getWalletDetails = async (req, res) => {
  try {
    const { address } = req.params;
    const wallet = await WalletCustomer.findOne({ walletAddress: address.toLowerCase() });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const purchases = await Purchase.find({ walletAddress: address.toLowerCase(), status: 'confirmed' });
    const totalTokens = purchases.reduce((s, p) => s + (p.tokenAmount || 0), 0);
    const totalInvested = purchases.reduce((s, p) => s + (p.fiatAmount || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        wallet: {
          address: wallet.walletAddress,
          isWhitelisted: wallet.isWhitelisted,
          tokensPurchased: wallet.totalTokensPurchased || totalTokens,
          totalInvested: wallet.totalAmountPaid || totalInvested,
          availableTokens: wallet.totalTokensPurchased || totalTokens,
          totalStaked: 0,
          stakingPercentage: 0,
          chains: wallet.chains || [],
          createdAt: wallet.createdAt,
          lastActive: wallet.lastActive
        },
        purchases: {
          count: purchases.length,
          stats: {
            totalTokens,
            totalInvested
          }
        },
        staking: {
          demo: true,
          activeStakesCount: 0,
          historicalStakesCount: 0,
          totalStaked: 0,
          percentageOfTotalPool: 0,
          canClaimRewards: await stakingService.hasTGEPassed()
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load wallet',
      error: error.message
    });
  }
};
