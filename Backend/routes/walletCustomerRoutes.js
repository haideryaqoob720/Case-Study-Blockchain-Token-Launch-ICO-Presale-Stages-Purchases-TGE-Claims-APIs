const express = require('express');
const router = express.Router();
const walletCustomerController = require('../controllers/walletCustomerController');

/**
 * @swagger
 * /api/wallet-customers/details/{address}:
 *   get:
 *     summary: Get wallet summary information
 *     description: Returns wallet information with summary statistics for purchases and staking
 *     tags: [Wallet Customers]
 *     parameters:
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum wallet address
 *     responses:
 *       200:
 *         description: Wallet summary information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                           description: Wallet address
 *                         isWhitelisted:
 *                           type: boolean
 *                           description: Whether the wallet is whitelisted
 *                         tokensPurchased:
 *                           type: number
 *                           description: Total tokens purchased
 *                         totalInvested:
 *                           type: number
 *                           description: Total USD value invested
 *                         availableTokens:
 *                           type: number
 *                           description: Tokens available for use (not staked)
 *                         totalStaked:
 *                           type: number
 *                           description: Total tokens staked
 *                         stakingPercentage:
 *                           type: number
 *                           description: Percentage of total staking pool owned (0-100)
 *                         chains:
 *                           type: array
 *                           description: Blockchains this wallet has interacted with
 *                           items:
 *                             type: string
 *                             enum: [ethereum, bsc, polygon]
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: When the wallet first interacted with the system
 *                         lastActive:
 *                           type: string
 *                           format: date-time
 *                           description: When the wallet last interacted with the system
 *                     purchases:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                           description: Total number of purchases
 *                         stats:
 *                           type: object
 *                           properties:
 *                             totalTokens:
 *                               type: number
 *                               description: Total confirmed tokens purchased
 *                             totalInvested:
 *                               type: number
 *                               description: Total confirmed USD amount invested
 *                     staking:
 *                       type: object
 *                       properties:
 *                         activeStakesCount:
 *                           type: integer
 *                           description: Number of active stakes
 *                         historicalStakesCount:
 *                           type: integer
 *                           description: Number of historical stakes
 *                         totalStaked:
 *                           type: number
 *                           description: Total tokens currently staked
 *                         percentageOfTotalPool:
 *                           type: number
 *                           description: Percentage of the total staking pool (0-100)
 *                         canClaimRewards:
 *                           type: boolean
 *                           description: Whether rewards can be claimed (TGE passed)
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/details/:address', walletCustomerController.getWalletDetails);

module.exports = router;
