/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const demo = { message: 'Demo mode — feature removed' };

exports.generateWallet = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.getWalletInfo = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.getReferralReward = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.sendReferralRewardByOrderId = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.getTransactionsPlaceholder = async (_req, res) =>
  res.status(200).json({ success: true, data: demo });
