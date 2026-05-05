const express = require('express');
const router = express.Router();
const stakeController = require('../controllers/stakeController');

/**
 * @swagger
 * /api/staking:
 *   get:
 *     summary: Get staking overview
 *     description: Returns information about the total staked amount, reward rate, and TGE status
 *     tags: [Staking]
 *     parameters:
 *       - in: query
 *         name: walletAddress
 *         schema:
 *           type: string
 *         required: false
 *         description: Ethereum wallet address
 *         example: 0x1234567890123456789012345678901234567890
 *     responses:
 *       200:
 *         description: Staking overview
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
 *                     walletAddress:
 *                       type: string
 *                       description: Wallet address of the user
 *                     totalStaked:
 *                       type: number
 *                       description: Total tokens staked by all users
 *                     yourStakedAmount:
 *                       type: number
 *                       description: Total tokens staked by the user
 *                     yourShareOfThePool:
 *                       type: number
 *                       description: Percentage of the total staking pool staked by the user
 *                     totalRewardEarned:
 *                       type: number
 *                       description: Total rewards earned by the user
 *                     totalRewardsClaimed:
 *                       type: number
 *                       description: Total rewards claimed by the user
 *                     rewardPerBlock:
 *                       type: number
 *                       description: Tokens rewarded per Ethereum block
 *                     currentBlock:
 *                       type: number
 *                       description: Current Ethereum block number
 *                     tgeStatus:
 *                       type: object
 *                       properties:
 *                         hasPassed:
 *                           type: boolean
 *                           description: Whether the TGE date has passed
 *                         remainingTime:
 *                           type: object
 *                           description: Time remaining until TGE
 *                     activeStage:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           description: Name of the active stage
 *                         number:
 *                           type: number
 *                           description: Stage number of the active stage
 *                         tokenPrice:
 *                           type: number
 *                           description: Price per token of the active stage
 *       500:
 *         description: Server error
 */
router.get('/', stakeController.getStakingOverview);

/**
 * @swagger
 * /api/staking/{address}:
 *   get:
 *     summary: Get wallet staking information
 *     description: Returns staking details for a specific wallet address
 *     tags: [Staking]
 *     parameters:
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum wallet address
 *     responses:
 *       200:
 *         description: Wallet staking details
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
 *                     availableToStake:
 *                       type: number
 *                       description: Tokens available for staking
 *                     currentlyStaked:
 *                       type: number
 *                       description: Total tokens currently staked
 *                     percentageOfTotalPool:
 *                       type: number
 *                       description: Percentage of the total staking pool
 *                     canClaim:
 *                       type: boolean
 *                       description: Whether rewards can be claimed
 *                     activeStakes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     historicalStakes:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/:address', stakeController.getWalletStakingInfo);

/**
 * @swagger
 * /api/staking/history/{address}:
 *   get:
 *     summary: Get staking history
 *     description: Returns paginated staking history for a specific wallet address
 *     tags: [Staking]
 *     parameters:
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum wallet address
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Number of records per page (max 50)
 *     responses:
 *       200:
 *         description: Staking history with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stakes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Stake ID
 *                           amount:
 *                             type: number
 *                             description: Staked amount
 *                           stageId:
 *                             type: string
 *                             description: Stage ID
 *                           stageName:
 *                             type: string
 *                             description: Stage name
 *                           stageNumber:
 *                             type: number
 *                             description: Stage number
 *                           tokenPrice:
 *                             type: number
 *                             description: Token price at staking time
 *                           startBlock:
 *                             type: number
 *                             description: Starting block number
 *                           endBlock:
 *                             type: number
 *                             description: Ending block number
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                             description: Staking start date
 *                           endDate:
 *                             type: string
 *                             format: date-time
 *                             description: Staking end date
 *                           claimDate:
 *                             type: string
 *                             format: date-time
 *                             description: Reward claim date
 *                           percentageOfPool:
 *                             type: number
 *                             description: Percentage of total pool
 *                           rewardEarned:
 *                             type: number
 *                             description: Total rewards earned
 *                           status:
 *                             type: string
 *                             enum: [active, claimed, unstaked]
 *                             description: Stake status
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: Creation timestamp
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             description: Last update timestamp
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           description: Current page number
 *                         totalPages:
 *                           type: integer
 *                           description: Total number of pages
 *                         totalStakes:
 *                           type: integer
 *                           description: Total number of stakes
 *                         hasNextPage:
 *                           type: boolean
 *                           description: Whether there is a next page
 *                         hasPrevPage:
 *                           type: boolean
 *                           description: Whether there is a previous page
 *                         limit:
 *                           type: integer
 *                           description: Number of records per page
 *       400:
 *         description: Bad request - Invalid parameters
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/history/:address', stakeController.getStakingHistory);

/**
 * @swagger
 * /api/staking/signature/stake:
 *   post:
 *     summary: Generate a signature for staking tokens
 *     description: Creates a cryptographic signature required for staking tokens
 *     tags: [Staking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *               - amount
 *               - durationMonths
 *               - chainId
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Ethereum wallet address of the user
 *               amount:
 *                 type: string
 *                 description: Amount of tokens to stake
 *               durationMonths:
 *                 type: number
 *                 enum: [3, 6]
 *                 description: Duration of the stake in months (3 or 6)
 *               chainId:
 *                 type: string
 *                 description: Chain ID as a string
 *     responses:
 *       200:
 *         description: Signature generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userAddress:
 *                       type: string
 *                       description: Normalized user address
 *                     amount:
 *                       type: string
 *                       description: Amount in wei
 *                     durationMonths:
 *                       type: number
 *                       description: Duration in months
 *                     nonce:
 *                       type: string
 *                       description: Unique nonce for this transaction
 *                     chainId:
 *                       type: string
 *                       description: Chain ID
 *                     signature:
 *                       type: string
 *                       description: Cryptographic signature
 *                     signerAddress:
 *                       type: string
 *                       description: Address of the signer
 *       400:
 *         description: Bad request - Invalid parameters
 *       500:
 *         description: Server error
 */
router.post('/signature/stake', stakeController.generateStakeSignature);

/**
 * @swagger
 * /api/staking/signature/unstake:
 *   post:
 *     summary: Generate a signature for unstaking tokens
 *     description: Creates a cryptographic signature required for unstaking tokens
 *     tags: [Staking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *               - stakeIndex
 *               - chainId
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Ethereum wallet address of the user
 *               stakeIndex:
 *                 type: number
 *                 description: Index of the stake to unstake
 *               chainId:
 *                 type: string
 *                 description: Chain ID as a string
 *     responses:
 *       200:
 *         description: Signature generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userAddress:
 *                       type: string
 *                       description: Normalized user address
 *                     stakeIndex:
 *                       type: number
 *                       description: Index of the stake
 *                     nonce:
 *                       type: string
 *                       description: Unique nonce for this transaction
 *                     chainId:
 *                       type: string
 *                       description: Chain ID
 *                     signature:
 *                       type: string
 *                       description: Cryptographic signature
 *                     signerAddress:
 *                       type: string
 *                       description: Address of the signer
 *       400:
 *         description: Bad request - Invalid parameters
 *       500:
 *         description: Server error
 */
router.post('/signature/unstake', stakeController.generateUnstakeSignature);

module.exports = router;
