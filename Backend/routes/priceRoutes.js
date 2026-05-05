const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');

/**
 * @swagger
 * /api/prices:
 *   get:
 *     summary: Get cached token prices for all chains
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: Current cached prices for all chains
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
 *                     ethereum:
 *                       type: object
 *                       properties:
 *                         price:
 *                           type: number
 *                           description: Price in USD
 *                         cachedAt:
 *                           type: string
 *                           format: date-time
 *                         isExpired:
 *                           type: boolean
 *                         ageInSeconds:
 *                           type: integer
 *                     bsc:
 *                       type: object
 *                       properties:
 *                         price:
 *                           type: number
 *                         cachedAt:
 *                           type: string
 *                           format: date-time
 *                         isExpired:
 *                           type: boolean
 *                         ageInSeconds:
 *                           type: integer
 *                     polygon:
 *                       type: object
 *                       properties:
 *                         price:
 *                           type: number
 *                         cachedAt:
 *                           type: string
 *                           format: date-time
 *                         isExpired:
 *                           type: boolean
 *                         ageInSeconds:
 *                           type: integer
 *       500:
 *         description: Server error
 */
router.get('/', priceController.getCachedPrices);

/**
 * @swagger
 * /api/prices/{chain}:
 *   get:
 *     summary: Get fresh token price for a specific chain
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: chain
 *         schema:
 *           type: string
 *           enum: [ethereum, bsc, polygon]
 *         required: true
 *         description: Blockchain identifier
 *     responses:
 *       200:
 *         description: Current price for the specified chain
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ChainPrice'
 *       400:
 *         description: Invalid chain parameter
 *       500:
 *         description: Server error
 */
router.get('/:chain', priceController.getChainPrice);

module.exports = router;
