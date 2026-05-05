const Customer = require('../models/User');
const jwt = require('jsonwebtoken');
const { PRODUCTION_CONFIG } = require('../constants');

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be set');
  }
  return secret;
}

/**
 * Register a new customer (only one allowed in the system)
 */
exports.createCustomer = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Check if any customer already exists (only one allowed)
    const customerCount = await Customer.countDocuments();
    if (customerCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'A customer already exists in the system. Only one customer is allowed.'
      });
    }

    // Check if username is already taken
    const existingCustomer = await Customer.findOne({ username });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }

    // Create new customer
    const customer = await Customer.create({
      username,
      password
    });

    const customerResponse = {
      _id: customer._id,
      username: customer.username,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    };

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: customerResponse
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to register customer',
      error: error.message
    });
  }
};

exports.loginCustomer = async (req, res) => {
  try {
    let secret;
    try {
      secret = requireJwtSecret();
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Server misconfigured: JWT_SECRET is not set'
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find the customer by username
    const customer = await Customer.findOne({ username });
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Verify password
    const isValidPassword = await customer.isValidPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const token = jwt.sign(
      { id: customer._id, username: customer.username },
      secret,
      { expiresIn: PRODUCTION_CONFIG.DEFAULTS.TOKEN_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      customerId: customer._id,
      username: customer.username,
      token
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

exports.getCustomerDetails = async (req, res) => {
  try {
    // Find the only customer in the system
    const customer = await Customer.findOne().select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'No customer found in the system'
      });
    }

    return res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
