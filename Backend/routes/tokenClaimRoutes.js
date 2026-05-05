const express = require('express');
const router = express.Router();
const tokenClaimController = require('../controllers/tokenClaimController');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * /api/token-claim/claim-signature/{walletAddress}:
 *   get:
 *     summary: Get signature for claiming tokens
 *     description: Returns a signature that can be used to claim tokens on the smart contract
 *     tags: [Token Claim]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: Ethereum wallet address
 *     responses:
 *       200:
 *         description: Claim signature generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ClaimSignature'
 *       400:
 *         description: Cannot claim tokens (invalid address, tokens already claimed, or before TGE)
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/claim-signature/:walletAddress', protect, tokenClaimController.getClaimSignature);

/**
 * @swagger
 * /api/token-claim/status/{walletAddress}:
 *   get:
 *     summary: Get token claim status for a wallet
 *     description: Returns the claim status for the specified wallet address
 *     tags: [Token Claim]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The wallet address to check
 *     responses:
 *       200:
 *         description: Claim status retrieved successfully
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
 *                     hasClaimed:
 *                       type: boolean
 *                       example: false
 *                     totalClaimed:
 *                       type: number
 *                       example: 0
 *                     stakingRewards:
 *                       type: number
 *                       example: 0
 *                     latestClaimDate:
 *                       type: string
 *                       format: date-time
 *                       example: null
 *       500:
 *         description: Server error
 */
router.get('/status/:walletAddress', protect, tokenClaimController.getClaimStatus);

/**
 * @swagger
 * /api/token-claim/claims:
 *   get:
 *     summary: Get all token claims with pagination
 *     description: Returns all token claims with pagination
 *     tags: [Token Claim]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Claims retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/claims', protect, tokenClaimController.getClaims);

module.exports = router;
