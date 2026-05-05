const express = require('express');
const router = express.Router();
const twitterController = require('../controllers/twitterController');

/**
 * @swagger
 * /api/twitter/tweet:
 *   post:
 *     summary: Save tweet with referral URL
 *     description: Saves a tweet with the provided referral URL
 *     tags: [Twitter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletAddress
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Wallet address of the user
 *     responses:
 *       201:
 *         description: Tweet saved successfully
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
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     walletAddress:
 *                       type: string
 *                     content:
 *                       type: string
 *                     referralLink:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/tweet', twitterController.postTweet);

/**
 * @swagger
 * /api/twitter/tweet/{tweetId}:
 *   get:
 *     summary: Get tweet data by tweetId
 *     description: Fetches tweet data from Twitter API and verifies it
 *     tags: [Twitter]
 *     parameters:
 *       - in: path
 *         name: tweetId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tweet to fetch
 *       - in: query
 *         name: walletAddress
 *         required: false
 *         schema:
 *           type: string
 *         description: Wallet address for verification
 *     responses:
 *       200:
 *         description: Tweet data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [verified, unverified]
 *                 tweetText:
 *                   type: string
 *                 verified:
 *                   type: boolean
 *       500:
 *         description: Server error
 */
router.get('/tweet/:tweetId', twitterController.getTweetData);

module.exports = router;
