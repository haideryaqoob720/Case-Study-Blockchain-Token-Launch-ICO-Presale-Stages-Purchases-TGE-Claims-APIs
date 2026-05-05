/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.post('/generate', walletController.generateWallet);
router.get('/referral-reward/:walletAddress', walletController.getReferralReward);
router.post('/send-referral-reward', walletController.sendReferralRewardByOrderId);
router.get('/:orderId/transactions', walletController.getTransactionsPlaceholder);
router.get('/:orderId', walletController.getWalletInfo);

module.exports = router;
