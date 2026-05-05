/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const Stage = require('../models/Stage');
const WalletCustomer = require('../models/WalletCustomer');
const Purchase = require('../models/Purchase');

const demo = { message: 'Demo mode — feature removed' };

exports.getWidgetStats = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.getUserReferralStats = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.getReferralLeaderboard = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.getDashboardStats = async (_req, res) => {
  try {
    const stages = await Stage.find().sort({ stageId: 1 }).catch(() => []);
    const active = stages.find(s => s.isActive);
    const wallets = await WalletCustomer.countDocuments().catch(() => 0);
    const purchases = await Purchase.countDocuments({ status: 'confirmed' }).catch(() => 0);

    return res.status(200).json({
      success: true,
      data: {
        demo: true,
        note: 'Portfolio demo metrics — not production analytics.',
        activeStageName: active?.name || null,
        activeStagePrice: active?.pricePerToken ?? null,
        totalStages: stages.length,
        walletCustomers: wallets,
        confirmedPurchases: purchases
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Demo dashboard error',
      error: error.message
    });
  }
};
