const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

/**
 * @swagger
 * /api/customers/register:
 *   post:
 *     summary: Register a new customer (only one allowed in the system)
 *     description: Creates a new customer. The system only allows one customer.
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *       400:
 *         description: Customer already exists or invalid data
 *       500:
 *         description: Server error
 */
router.post('/register', customerController.createCustomer);

/**
 * @swagger
 * /api/customers/login:
 *   post:
 *     summary: Login a customer
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 customerId:
 *                   type: string
 *                 username:
 *                   type: string
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', customerController.loginCustomer);

/**
 * @swagger
 * /api/customers/current:
 *   get:
 *     summary: Get the current customer details
 *     description: Returns details of the current customer (only one exists in the system)
 *     tags: [Customers]
 *     responses:
 *       200:
 *         description: Customer details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: No customer found
 *       500:
 *         description: Server error
 */
router.get('/current', customerController.getCustomerDetails);

module.exports = router;
