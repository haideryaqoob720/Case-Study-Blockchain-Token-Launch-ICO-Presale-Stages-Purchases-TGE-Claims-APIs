const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * /api/purchases:
 *   get:
 *     summary: Get all purchases
 *     tags: [Purchases]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, rejected]
 *         description: Filter purchases by status
 *       - in: query
 *         name: stageId
 *         schema:
 *           type: string
 *         description: Filter purchases by stage
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter purchases from this date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter purchases until this date
 *     responses:
 *       200:
 *         description: List of all purchases
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Purchase'
 *       500:
 *         description: Server error
 */
router.get('/', purchaseController.getAllPurchases);

/**
 * @swagger
 * /api/purchases/statistics:
 *   get:
 *     summary: Get purchase statistics
 *     tags: [Purchases]
 *     parameters:
 *       - in: query
 *         name: stageId
 *         schema:
 *           type: string
 *         description: Get statistics for a specific stage
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter statistics from this date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter statistics until this date
 *     responses:
 *       200:
 *         description: Purchase statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPurchases:
 *                   type: number
 *                 totalConfirmed:
 *                   type: number
 *                 totalTokensSold:
 *                   type: number
 *                 totalAmountRaised:
 *                   type: number
 *                 averagePurchaseSize:
 *                   type: number
 *                 purchasesByStage:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get('/statistics', purchaseController.getPurchaseStats);

/**
 * @swagger
 * /api/purchases/wallet/{walletAddress}:
 *   get:
 *     summary: Get purchases by wallet address
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         schema:
 *           type: string
 *         required: true
 *         description: Wallet address
 *     responses:
 *       200:
 *         description: List of purchases for the wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Purchase'
 *       500:
 *         description: Server error
 */
router.get('/wallet/:walletAddress', purchaseController.getPurchasesByWallet);

/**
 * @swagger
 * /api/purchases/{id}:
 *   get:
 *     summary: Get a purchase by ID
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Purchase ID
 *     responses:
 *       200:
 *         description: Purchase details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Purchase'
 *       404:
 *         description: Purchase not found
 *       500:
 *         description: Server error
 */
router.get('/:id', purchaseController.getPurchaseById);

/**
 * @swagger
 * /api/purchases/signature/native:
 *   post:
 *     summary: Generate signature for native currency purchase
 *     tags: [Purchases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *               - stageId
 *               - pricePerToken
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: User's wallet address
 *               stageId:
 *                 type: string
 *                 description: ID of the presale stage
 *               pricePerToken:
 *                 type: string
 *                 description: Price per token in USD (18 decimals)
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     userAddress:
 *                       type: string
 *                     stageId:
 *                       type: string
 *                     pricePerToken:
 *                       type: string
 *                     deadline:
 *                       type: number
 *                     nonce:
 *                       type: string
 *                     signature:
 *                       type: string
 *                     signerAddress:
 *                       type: string
 *       400:
 *         description: Invalid input parameters
 *       404:
 *         description: Stage not found
 *       500:
 *         description: Server error
 */
router.post('/signature/native', protect, purchaseController.generateNativePurchaseSignature);

/**
 * @swagger
 * /api/purchases/signature/token:
 *   post:
 *     summary: Generate signature for token purchase
 *     tags: [Purchases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *               - token
 *               - amount
 *               - stageId
 *               - pricePerToken
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: User's wallet address
 *               token:
 *                 type: string
 *                 description: Address of the token being used for payment
 *               amount:
 *                 type: string
 *                 description: Amount of tokens to spend
 *               stageId:
 *                 type: string
 *                 description: ID of the presale stage
 *               pricePerToken:
 *                 type: string
 *                 description: Price per token in USD (18 decimals)
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     userAddress:
 *                       type: string
 *                     token:
 *                       type: string
 *                     amount:
 *                       type: string
 *                     stageId:
 *                       type: string
 *                     pricePerToken:
 *                       type: string
 *                     deadline:
 *                       type: number
 *                     nonce:
 *                       type: string
 *                     signature:
 *                       type: string
 *                     signerAddress:
 *                       type: string
 *       400:
 *         description: Invalid input parameters
 *       404:
 *         description: Stage not found
 *       500:
 *         description: Server error
 */
router.post('/signature/token', protect, purchaseController.generateTokenPurchaseSignature);

module.exports = router;
