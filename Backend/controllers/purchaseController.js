const Purchase = require('../models/Purchase');
const Customer = require('../models/User');
const Stage = require('../models/Stage');
const Presale = require('../models/Presale');
const mongoose = require('mongoose');
const { createNativePurchaseSignature, createTokenPurchaseSignature } = require('../services/signingService');
const { ethers } = require('ethers');

exports.getAllPurchases = async (req, res) => {
  try {
    // Add query params for filtering
    const { customerId, stageId, status, startDate, endDate } = req.query;

    const query = {};

    // Apply filters if provided
    if (customerId) query.customerId = customerId;
    if (stageId) query.stageId = stageId;
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(query)
      .populate('customerId', 'name email walletAddress')
      .populate('stageId', 'name tokenPrice startDate endDate');

    return res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve purchases',
      error: error.message
    });
  }
};

// Get purchase by ID
exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('customerId', 'name email walletAddress')
      .populate('stageId', 'name tokenPrice startDate endDate');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve purchase',
      error: error.message
    });
  }
};

// Get purchase statistics
exports.getPurchaseStats = async (req, res) => {
  try {
    const stats = await Purchase.aggregate([
      {
        $match: { status: 'confirmed' }
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalTokensSold: { $sum: '$tokenAmount' },
          totalAmount: { $sum: '$paymentAmount' },
          averageTokensPerPurchase: { $avg: '$tokenAmount' },
          averageAmountPerPurchase: { $avg: '$paymentAmount' }
        }
      }
    ]);

    // Get stats by stage
    const stageStats = await Purchase.aggregate([
      {
        $match: { status: 'confirmed' }
      },
      {
        $group: {
          _id: '$stageId',
          totalPurchases: { $sum: 1 },
          totalTokensSold: { $sum: '$tokenAmount' },
          totalAmount: { $sum: '$paymentAmount' }
        }
      },
      {
        $lookup: {
          from: 'stages',
          localField: '_id',
          foreignField: '_id',
          as: 'stageInfo'
        }
      },
      {
        $unwind: '$stageInfo'
      },
      {
        $project: {
          _id: 1,
          stageName: '$stageInfo.name',
          totalPurchases: 1,
          totalTokensSold: 1,
          totalAmount: 1
        }
      }
    ]);

    // Format response
    const response = {
      totalStats:
        stats.length > 0
          ? stats[0]
          : {
              totalPurchases: 0,
              totalTokensSold: 0,
              totalAmount: 0,
              averageTokensPerPurchase: 0,
              averageAmountPerPurchase: 0
            },
      stageStats
    };

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve purchase statistics',
      error: error.message
    });
  }
};

// Get purchases by wallet address
exports.getPurchasesByWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const purchases = await Purchase.find({
      walletAddress: walletAddress.toLowerCase()
    })
      .populate('stageId', 'name pricePerToken startTime endTime')
      .sort({ purchaseDate: -1 });

    return res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve purchases',
      error: error.message
    });
  }
};

// Generate signature for native currency purchase
exports.generateNativePurchaseSignature = async (req, res) => {
  try {
    const { walletAddress, stageId, pricePerToken, nativeAmount, nonce } = req.body;

    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    if (!nativeAmount) {
      return res.status(400).json({
        success: false,
        message: 'nativeAmount (wei string) is required for portfolio demo signatures'
      });
    }

    if (!stageId) {
      return res.status(400).json({
        success: false,
        message: 'Stage ID is required'
      });
    }

    if (!pricePerToken) {
      return res.status(400).json({
        success: false,
        message: 'Price per token is required'
      });
    }

    // Find the stage to validate it exists
    const stage = await Stage.findOne({ stageId: stageId });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found'
      });
    }

    // Calculate deadline (25 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 25 * 60;

    // Log the nonce for debugging
    console.log(`Generating signature for ${walletAddress} with nonce: ${nonce || 'undefined (using 0)'}`);

    // Generate signature
    const signatureData = await createNativePurchaseSignature(
      walletAddress,
      stageId,
      pricePerToken,
      nativeAmount,
      deadline,
      nonce
    );

    return res.status(200).json({
      success: true,
      data: {
        ...signatureData,
        deadline
      }
    });
  } catch (error) {
    console.error('Error generating native purchase signature:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate signature',
      error: error.message
    });
  }
};

// Generate signature for token purchase
exports.generateTokenPurchaseSignature = async (req, res) => {
  try {
    const { walletAddress, token, amount, stageId, pricePerToken, nonce } = req.body;

    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    if (!token || !ethers.utils.isAddress(token)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token address'
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    if (!stageId) {
      return res.status(400).json({
        success: false,
        message: 'Stage ID is required'
      });
    }

    if (!pricePerToken) {
      return res.status(400).json({
        success: false,
        message: 'Price per token is required'
      });
    }

    // Find the stage to validate it exists
    const stage = await Stage.findOne({ stageId: stageId });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found'
      });
    }

    // Calculate deadline (25 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 25 * 60;

    // Log the nonce for debugging
    console.log(`Generating token signature for ${walletAddress} with nonce: ${nonce || 'undefined (using 0)'}`);

    // Generate signature
    const signatureData = await createTokenPurchaseSignature(
      walletAddress,
      token,
      amount,
      stageId,
      pricePerToken,
      deadline,
      nonce
    );

    return res.status(200).json({
      success: true,
      data: {
        ...signatureData,
        deadline
      }
    });
  } catch (error) {
    console.error('Error generating token purchase signature:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate signature',
      error: error.message
    });
  }
};
