const express = require('express');
const router = express.Router();
const wertController = require('../controllers/wertController');

router.post('/create-smart-contract-order', wertController.createSmartContractOrder);

/**
 * @swagger
 * /api/wert/create-session:
 *   post:
 *     summary: Create a Wert session for fiat-to-crypto purchase
 *     description: Initiates a Wert session for a user to purchase crypto with fiat. Returns a Wert session ID.
 *     tags: [Wert]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: string
 *                 description: Ethereum wallet address to receive purchased tokens
 *                 example: "0x1234abcd5678ef9012345678abcdef1234567890"
 *               commodity:
 *                 type: string
 *                 description: Asset to purchase (e.g., ETH, BNB, TT)
 *                 example: "ETH"
 *               currencyAmount:
 *                 type: number
 *                 description: "Amount in USD to purchase (defaults to 10 if not provided)"
 *                 example: 25
 *               network:
 *                 type: string
 *                 description: "Network name (e.g., sepolia, amoy, bsc - defaults to sepolia if not provided)"
 *                 example: "sepolia"
 *     responses:
 *       200:
 *         description: Wert session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   description: Wert session ID
 *                   example: "wert-session-123456"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Invalid request parameters
 *                   example: "Missing required parameter: address"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Server error
 *                   example: "Internal server error"
 */
router.post('/create-session', wertController.createSession);

router.post('/webhook', wertController.webhook);

module.exports = router;
