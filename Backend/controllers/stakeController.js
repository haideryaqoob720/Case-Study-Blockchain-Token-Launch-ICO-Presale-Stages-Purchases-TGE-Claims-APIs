/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const demo = { message: 'Demo mode — feature removed' };

exports.getStakingOverview = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.getWalletStakingInfo = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.getStakingHistory = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.generateStakeSignature = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.generateUnstakeSignature = async (_req, res) => res.status(200).json({ success: true, data: demo });
