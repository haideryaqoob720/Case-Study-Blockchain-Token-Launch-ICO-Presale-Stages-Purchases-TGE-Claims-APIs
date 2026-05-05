const express = require('express');
const router = express.Router();
const presaleController = require('../controllers/presaleController');

/**
 * @swagger
 * /api/presales:
 *   get:
 *     summary: Get presale details
 *     tags: [Presale]
 *     responses:
 *       200:
 *         description: Presale details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Presale'
 *       404:
 *         description: Presale not found
 *       500:
 *         description: Server error
 */
router.get('/', presaleController.getPresale);

/**
 * @swagger
 * /api/presales/allocation:
 *   get:
 *     summary: Get presale allocation details
 *     description: Returns information about the presale's allocated tokens, total reward, and token sales
 *     tags: [Presale]
 *     responses:
 *       200:
 *         description: Allocation details
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
 *                     total_reward:
 *                       type: number
 *                       description: Total calculated reward
 *                     allocated_tokens:
 *                       type: number
 *                       description: Current allocated tokens
 *                     total_tokens_sold:
 *                       type: number
 *                       description: Total tokens already sold
 *                     remaining_allocation:
 *                       type: number
 *                       description: Remaining allocated tokens available for purchase
 *                     token_price:
 *                       type: number
 *                       description: Current token price in USD
 *                     allocation_value:
 *                       type: number
 *                       description: Total value of remaining allocated tokens in USD
 *       404:
 *         description: Presale not found
 *       500:
 *         description: Server error
 */
router.get('/allocation', presaleController.getAllocatedTokens);

/**
 * @swagger
 * /api/presales/reward-per-block:
 *   get:
 *     summary: Get reward per block from the smart contract
 *     description: Fetches the current reward per block setting directly from the PresaleManager contract
 *     tags: [Presale]
 *     responses:
 *       200:
 *         description: Reward per block retrieved successfully
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
 *                     rewardPerBlock:
 *                       type: string
 *                       description: Reward per block in token units
 *       404:
 *         description: PresaleManager address not configured
 *       500:
 *         description: Server error
 */
router.get('/reward-per-block', presaleController.getRewardPerBlock);

module.exports = router;
