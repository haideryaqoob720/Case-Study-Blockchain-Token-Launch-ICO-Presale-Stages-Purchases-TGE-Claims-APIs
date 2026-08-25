const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get all dashboard statistics in a single call
 *     description: Returns comprehensive stats for the dashboard including stage info, user counts, and staking data
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard statistics
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
 *                     currentPhaseNumber:
 *                       type: number
 *                       description: Current active phase number
 *                     tokenPrice:
 *                       type: number
 *                       description: Current token price in USD
 *                     nextPhasePrice:
 *                       type: number
 *                       description: Next phase token price in USD
 *                     userStats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: number
 *                           description: Total number of users
 *                         totalTokensSold:
 *                           type: number
 *                           description: Total tokens sold across all stages
 *                     stageStats:
 *                       type: array
 *                       description: Statistics for all stages
 *                       items:
 *                         type: object
 *                         properties:
 *                           number:
 *                             type: number
 *                             description: Stage number
 *                           price:
 *                             type: number
 *                             description: Token price for this stage
 *                     stakingStats:
 *                       type: object
 *                       properties:
 *                         totalStakedTokens:
 *                           type: number
 *                           description: Total tokens staked across all users
 *                         numberOfStakers:
 *                           type: number
 *                           description: Number of unique wallets with active stakes
 *       500:
 *         description: Server error
 */
router.get('/stats', dashboardController.getDashboardStats);

/**
 * @swagger
 * /api/dashboard/widget:
 *   get:
 *     summary: Get widget statistics
 *     description: Returns statistics for the presale widget
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Widget statistics
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
 *                     presaleProgress:
 *                       type: object
 *                       properties:
 *                         currentStage:
 *                           type: number
 *                           description: Current stage number
 *                         totalStages:
 *                           type: number
 *                           description: Total number of stages
 *                         display:
 *                           type: string
 *                           description: Display string for current stage
 *                     currentStageEndDate:
 *                       type: string
 *                       description: Current stage end date
 *                     totalAmountRaised:
 *                       type: number
 *                       description: Total amount raised
 *                     tokenMetrics:
 *                       type: object
 *                       properties:
 *                         totalTokensSold:
 *                           type: number
 *                           description: Total tokens sold
 *                         totalSupply:
 *                           type: number
 *                           description: Total supply
 *                         remainingSupply:
 *                           type: number
 *                           description: Remaining supply
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         currentPrice:
 *                           type: number
 *                           description: Current token price
 *                         displayPrice:
 *                           type: string
 *                           description: Display price string
 *                         nextStagePrice:
 *                           type: number
 *                           description: Next stage token price
 *                         minPurchaseAmount:
 *                           type: number
 *                           description: Minimum purchase amount
 *       500:
 *         description: Server error
 */
router.get('/widget', dashboardController.getWidgetStats);

/**
 * @swagger
 * /api/dashboard/user-referral-stats/{walletAddress}:
 *   get:
 *     summary: Get user referral statistics
 *     description: Returns statistics for a specific user's referrals
 *     tags: [Dashboard]
 *     parameters:
 *       - name: walletAddress
 *         in: path
 *         required: true
 *         description: The wallet address to get referral statistics for
 *     responses:
 *       200:
 *         description: User referral statistics
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
 *                     totalReferrals:
 *                       type: number
 *                       description: Total number of referrals
 *                     totalSales:
 *                       type: number
 *                       description: Total sales amount
 *                     totalEarnings:
 *                       type: number
 *                       description: Total earnings from referrals
 *       500:
 *         description: Server error
 */
router.get('/user-referral-stats/:walletAddress', dashboardController.getUserReferralStats);

/**
 * @swagger
 * /api/dashboard/referral-leaderboard:
 *   get:
 *     summary: Get referral leaderboard
 *     description: Returns top 30 referrers and user's position if wallet address provided
 *     tags: [Dashboard]
 *     parameters:
 *       - name: timeFilter
 *         in: query
 *         required: false
 *         description: Filter for time period (daily or all-time)
 *         schema:
 *           type: string
 *           enum: [daily, all-time]
 *           default: all-time
 *       - name: walletAddress
 *         in: query
 *         required: false
 *         description: User's wallet address to get their position
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Referral leaderboard data
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
 *                     leaderboard:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: number
 *                           walletAddress:
 *                             type: string
 *                           usersReferred:
 *                             type: number
 *                           totalBought:
 *                             type: number
 *                           totalEarned:
 *                             type: number
 *                     userPosition:
 *                       type: object
 *                       properties:
 *                         walletAddress:
 *                           type: string
 *                         usersReferred:
 *                           type: number
 *                         totalBought:
 *                           type: number
 *                         totalEarned:
 *                           type: number
 *                         isInTop30:
 *                           type: boolean
 *       500:
 *         description: Server error
 */
router.get('/referral-leaderboard', dashboardController.getReferralLeaderboard);

module.exports = router;
