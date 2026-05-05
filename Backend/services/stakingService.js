/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const Presale = require('../models/Presale');

exports.initStakingService = () => {
  console.log('[Demo] Staking service disabled.');
};

exports.checkAndUpdateMaturedStakes = async () => 0;

exports.calculateTotalWalletRewards = async () => 0;

exports.getCurrentBlockNumber = async () => 0;

exports.updateTotalStakedAmount = async () => 0;

exports.getRewardPerBlock = async () => {
  const { PRODUCTION_CONFIG } = require('../constants');
  return PRODUCTION_CONFIG.DEFAULTS.DEFAULT_REWARD_PER_BLOCK;
};

exports.hasTGEPassed = async () => {
  if (process.env.DEMO_TGE_PASSED === 'true') return true;
  const presale = await Presale.findOne().catch(() => null);
  if (!presale?.TGETime) return false;
  return Date.now() >= new Date(presale.TGETime).getTime();
};

exports.getTimeUntilTGE = async () => {
  const presale = await Presale.findOne().catch(() => null);
  if (!presale?.TGETime) return { demo: true, note: 'No presale record' };
  const ms = new Date(presale.TGETime).getTime() - Date.now();
  return { milliseconds: Math.max(0, ms) };
};

exports.calculateRewards = async () => 0;
