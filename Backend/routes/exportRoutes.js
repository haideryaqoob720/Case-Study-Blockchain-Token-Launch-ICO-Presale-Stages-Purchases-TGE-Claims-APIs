const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

/**
 * @swagger
 * /api/export:
 *   get:
 *     summary: Export data as CSV
 *     description: Export staking, purchase, or wallet customer data as a CSV file
 *     tags: [Export]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/ExportType'
 *         description: Type of data to export (staking, purchase, or wallet)
 *     responses:
 *       200:
 *         description: CSV file containing the requested data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing or invalid export type
 *       404:
 *         description: No data found
 *       500:
 *         description: Server error
 */
router.get('/', exportController.exportData);

module.exports = router;
