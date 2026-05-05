const express = require('express');
const router = express.Router();
const vipReferralController = require('../controllers/vipReferralController');

/**
 * @swagger
 * /api/vip-referral/generate:
 *   post:
 *     summary: Generate VIP referral link (one time only)
 *     description: Generates a VIP referral link that is valid for 15 days. Can only be generated once.
 *     tags: [VIP Referral]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: VIP referral link generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "VIP referral link generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     vipCode:
 *                       type: string
 *                       example: "VIP2025"
 *                     shareableLink:
 *                       type: string
 *                       example: "https://yourapp.com/buy?ref=VIP2025"
 *                     validFrom:
 *                       type: string
 *                       format: date-time
 *                     validUntil:
 *                       type: string
 *                       format: date-time
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: VIP referral already exists or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "VIP referral link already exists"
 *       500:
 *         description: Server error
 */
router.post('/generate', vipReferralController.generateVipReferral);

/**
 * @swagger
 * /api/vip-referral/purchases:
 *   get:
 *     summary: Get all VIP referral purchases
 *     description: Fetch all VIP referral purchase records
 *     tags: [VIP Referral]
 *     responses:
 *       200:
 *         description: VIP referral purchases fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "VIP referral purchases fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     purchases:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           vipCode:
 *                             type: string
 *                             example: "vip2025"
 *                           bonusTokenAmount:
 *                             type: number
 *                             example: 308
 *                           buyerWallet:
 *                             type: string
 *                             example: "0x63bee5cf04ff4"
 *                           chain:
 *                             type: string
 *                             example: "bsc"
 *                     totalCount:
 *                       type: integer
 *                       example: 25
 *       500:
 *         description: Server error
 */
router.get('/purchases', vipReferralController.getAllVipReferralPurchases);

/**
 * @swagger
 * /api/vip-referral/wallet:
 *   post:
 *     summary: Add VIP wallet
 *     description: Register wallet with VIP code (expiry date auto-set from VIP referral)
 *     tags: [VIP Referral]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 example: "0x123..."
 *               vipCode:
 *                 type: string
 *                 example: "VIP2025"
 *     responses:
 *       201:
 *         description: VIP wallet registered successfully
 *       400:
 *         description: Invalid VIP code, expired, or wallet already exists
 *       500:
 *         description: Server error
 */
router.post('/wallet', vipReferralController.addVipWallet);

/**
 * @swagger
 * /api/vip-referral/wallet/{walletAddress}:
 *   get:
 *     summary: Get VIP wallet by address
 *     description: Fetch VIP wallet information using wallet address
 *     tags: [VIP Referral]
 *     parameters:
 *       - name: walletAddress
 *         in: path
 *         required: true
 *         description: Wallet address to search
 *         schema:
 *           type: string
 *           example: "0x123..."
 *     responses:
 *       200:
 *         description: VIP wallet found
 *       404:
 *         description: VIP wallet not found
 *       500:
 *         description: Server error
 */
router.get('/wallet/:walletAddress', vipReferralController.getVipWalletByAddress);

module.exports = router;
