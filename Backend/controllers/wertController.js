/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const demo = { message: 'Demo mode — feature removed' };

exports.createSmartContractOrder = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.createSession = async (_req, res) => res.status(200).json({ success: true, data: demo });

exports.webhook = async (_req, res) => res.status(200).json({ success: true, data: demo });
