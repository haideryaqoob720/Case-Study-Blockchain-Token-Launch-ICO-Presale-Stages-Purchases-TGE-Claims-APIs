const express = require('express');
const router = express.Router();
const stageController = require('../controllers/stageController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/stages:
 *   get:
 *     summary: Get all presale stages
 *     tags: [Stages]
 *     responses:
 *       200:
 *         description: List of all stages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stage'
 *                 activeStage:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Stage'
 *                     - type: 'null'
 *       500:
 *         description: Server error
 */
router.get('/', stageController.getAllStages);

/**
 * @swagger
 * /api/stages:
 *   post:
 *     summary: Create a new stage
 *     tags: [Stages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - pricePerToken
 *               - supply
 *               - startTime
 *               - endTime
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Seed Round"
 *               pricePerToken:
 *                 type: number
 *                 example: 0.05
 *               supply:
 *                 type: number
 *                 example: 1000000
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-06-01T00:00:00.000Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-06-30T23:59:59.999Z"
 *     responses:
 *       201:
 *         description: Stage created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', protect, stageController.createStage);

/**
 * @swagger
 * /api/stages/active:
 *   get:
 *     summary: Get the currently active stage with all details
 *     description: Returns all details of the currently active stage including name, dates, token price, min/max purchase limits, etc.
 *     tags: [Stages]
 *     responses:
 *       200:
 *         description: Active stage details
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
 *                   example: "Active stage retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60d21b4667d0d8992e610c85"
 *                     name:
 *                       type: string
 *                       example: "Seed Round"
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-06-01T00:00:00.000Z"
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-06-30T23:59:59.999Z"
 *                     tokenPrice:
 *                       type: number
 *                       example: 0.05
 *                     minPurchase:
 *                       type: number
 *                       example: 100
 *                     maxPurchase:
 *                       type: number
 *                       example: 10000
 *                     totalTokens:
 *                       type: number
 *                       example: 5000000
 *                     totalTokensSold:
 *                       type: number
 *                       example: 1250000
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       404:
 *         description: No active stage found
 *       500:
 *         description: Server error
 */
router.get('/active', stageController.getActiveStage);

/**
 * @swagger
 * /api/stages/price:
 *   get:
 *     summary: Get current token price and stage details from active stage
 *     description: Returns the token price and other key information from the currently active stage
 *     tags: [Stages]
 *     responses:
 *       200:
 *         description: Current token price and stage details
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
 *                   example: "Current token price retrieved successfully"
 *                 tokenPrice:
 *                   type: number
 *                   example: 0.05
 *                 stageName:
 *                   type: string
 *                   example: "Seed Round"
 *                 stageId:
 *                   type: string
 *                   example: "60d21b4667d0d8992e610c85"
 *                 minPurchase:
 *                   type: number
 *                   example: 100
 *                 maxPurchase:
 *                   type: number
 *                   example: 10000
 *                 isActive:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: No active stage found
 *       500:
 *         description: Server error
 */
router.get('/price', stageController.getCurrentTokenPrice);

/**
 * @swagger
 * /api/stages/current/info:
 *   get:
 *     summary: Get current active stage info for contract calls
 *     description: Returns stage information formatted for blockchain contract calls
 *     tags: [Stages]
 *     responses:
 *       200:
 *         description: Current stage info in blockchain format
 *       404:
 *         description: No active stage found
 *       500:
 *         description: Server error
 */
router.get('/current/info', stageController.getCurrentStageInfo);

/**
 * @swagger
 * /api/stages/{stageId}:
 *   get:
 *     summary: Get stage information for contract calls
 *     description: Returns stage information formatted for blockchain contract calls
 *     tags: [Stages]
 *     parameters:
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stage ID
 *     responses:
 *       200:
 *         description: Stage info in blockchain format
 *       404:
 *         description: Stage not found
 *       500:
 *         description: Server error
 */
router.get('/:stageId/info', stageController.getStageInfo);

/**
 * @swagger
 * /api/stages/{stageId}:
 *   put:
 *     summary: Update stage details
 *     tags: [Stages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stage ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               pricePerToken:
 *                 type: number
 *               supply:
 *                 type: number
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Stage updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stage not found
 *       500:
 *         description: Server error
 */
router.put('/:stageId', protect, stageController.updateStage);

/**
 * @swagger
 * /api/stages/{stageId}/activate:
 *   post:
 *     summary: Activate a stage
 *     tags: [Stages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stage ID
 *     responses:
 *       200:
 *         description: Stage activated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stage not found
 *       500:
 *         description: Server error
 */
router.post('/:stageId/activate', protect, stageController.activateStage);

/**
 * @swagger
 * /api/stages/{stageId}:
 *   delete:
 *     summary: Delete a stage
 *     tags: [Stages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stage ID
 *     responses:
 *       200:
 *         description: Stage deleted successfully
 *       400:
 *         description: Cannot delete active stage
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Stage not found
 *       500:
 *         description: Server error
 */
router.delete('/:stageId', protect, stageController.deleteStage);

/**
 * @swagger
 * /api/stages/create-test-stages:
 *   post:
 *     summary: Create test stages
 *     tags: [Stages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test stages created successfully
 */
router.post('/create-test-stages', stageController.createTestStages);

/**
 * @swagger
 * /api/stages/status/info:
 *   get:
 *     summary: Get detailed stage status information
 *     tags: [Stages]
 *     responses:
 *       200:
 *         description: Stage status info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stageId:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [upcoming, active, available, ended]
 *                       isActive:
 *                         type: boolean
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       timeUntilStart:
 *                         type: number
 *                       timeUntilEnd:
 *                         type: number
 *                       pricePerToken:
 *                         type: number
 *                       supply:
 *                         type: number
 *                       sold:
 *                         type: number
 *                       remaining:
 *                         type: number
 *       500:
 *         description: Server error
 */
router.get('/status/info', stageController.getStageStatusInfo);

/**
 * @swagger
 * /api/stages/scheduler/start:
 *   post:
 *     summary: Start the stage time scheduler
 *     tags: [Stages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stage time scheduler started successfully
 *       500:
 *         description: Server error
 */
router.post('/scheduler/start', protect, stageController.startStageTimeScheduler);

module.exports = router;
