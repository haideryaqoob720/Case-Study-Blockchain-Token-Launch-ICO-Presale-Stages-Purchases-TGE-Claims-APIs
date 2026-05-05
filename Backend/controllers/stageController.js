const Stage = require('../models/Stage');
const Presale = require('../models/Presale');
const { ethers } = require('ethers');
const { PRODUCTION_CONFIG } = require('../constants');

exports.getAllStages = async (req, res) => {
  try {
    const stages = await Stage.find().sort({ stageId: 1 });

    // Find active stage
    const activeStage = stages.find(stage => stage.isActive);

    return res.status(200).json({
      success: true,
      count: stages.length,
      activeStage: activeStage ? activeStage._id : null,
      data: stages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve stages',
      error: error.message
    });
  }
};

exports.getActiveStage = async (req, res) => {
  try {
    const activeStage = await Stage.findOne({ isActive: true });

    if (!activeStage) {
      return res.status(404).json({
        success: false,
        message: 'No active stage found. The first stage you create will be automatically set as active.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Active stage retrieved successfully',
      data: activeStage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active stage',
      error: error.message
    });
  }
};

exports.getCurrentTokenPrice = async (req, res) => {
  try {
    const activeStage = await Stage.findOne({ isActive: true });

    if (!activeStage) {
      return res.status(404).json({
        success: false,
        message: 'No active stage found'
      });
    }

    // Use the token price from the active stage
    const tokenPrice = activeStage.pricePerToken;
    const currentStageId = activeStage.stageId;

    // Convert to wei for consistency with previous API
    const priceInWei = ethers.utils.parseEther(tokenPrice.toString());
    const priceInEth = tokenPrice.toString();

    return res.status(200).json({
      success: true,
      data: {
        currentStageId,
        priceInWei,
        priceInEth
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get current token price',
      error: error.message
    });
  }
};

exports.createStage = async (req, res) => {
  try {
    const { name, pricePerToken, supply, startTime, endTime } = req.body;

    // Validate required fields
    if (!name || !pricePerToken || !supply || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, pricePerToken, supply, startTime, endTime'
      });
    }

    // Validate times
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    // Get the next stage ID
    const lastStage = await Stage.findOne().sort({ stageId: -1 });
    const stageId = lastStage ? lastStage.stageId + 1 : 1;

    // Create the new stage
    const newStage = new Stage({
      stageId,
      name,
      pricePerToken: parseFloat(pricePerToken),
      supply: parseFloat(supply),
      sold: 0,
      startTime: startDate,
      endTime: endDate,
      isActive: false // Will be set to active if it's the first stage
    });

    // If this is the first stage, make it active
    if (stageId === 1) {
      newStage.isActive = true;
    }

    await newStage.save();

    return res.status(201).json({
      success: true,
      message: 'Stage created successfully',
      data: newStage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create stage',
      error: error.message
    });
  }
};

exports.updateStageSold = async (stageId, tokenAmount) => {
  try {
    const stage = await Stage.findOne({ stageId });
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    stage.sold += parseFloat(tokenAmount);

    // Check if stage is sold out
    if (stage.sold >= stage.supply) {
      stage.isActive = false;
      // Try to activate the next stage
      await this.activateNextStage(stageId);
    }

    await stage.save();
    return stage;
  } catch (error) {
    console.error('Error updating stage sold amount:', error);
    throw error;
  }
};

exports.activateNextStage = async currentStageId => {
  try {
    // Deactivate current stage
    await Stage.updateOne({ stageId: currentStageId }, { isActive: false });

    // Find and activate next stage - advance based on time, not supply
    const nextStage = await Stage.findOne({
      stageId: { $gt: currentStageId }
    }).sort({ stageId: 1 });

    if (nextStage) {
      // Check if next stage should be active based on time
      const now = new Date();
      if (now >= nextStage.startTime && now <= nextStage.endTime) {
        nextStage.isActive = true;
        await nextStage.save();
        console.log(`Activated stage ${nextStage.stageId}: ${nextStage.name} (time-based activation)`);
      } else if (now < nextStage.startTime) {
        console.log(`Next stage ${nextStage.stageId} hasn't started yet. Start time: ${nextStage.startTime}`);
      } else if (now > nextStage.endTime) {
        console.log(`Next stage ${nextStage.stageId} has already ended. End time: ${nextStage.endTime}`);
        // Try to activate the stage after this one
        await this.activateNextStage(nextStage.stageId);
      }
    } else {
      console.log('No next stage available to activate');
    }
  } catch (error) {
    console.error('Error activating next stage:', error);
    throw error;
  }
};

exports.activateStage = async (req, res) => {
  try {
    const { stageId } = req.params;

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found'
      });
    }

    // Deactivate all stages
    await Stage.updateMany({}, { isActive: false });

    // Activate the specified stage
    stage.isActive = true;
    await stage.save();

    return res.status(200).json({
      success: true,
      message: `Stage ${stageId} activated successfully`,
      data: stage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to activate stage',
      error: error.message
    });
  }
};

exports.getStageInfo = async (req, res) => {
  try {
    const { stageId } = req.params;

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found'
      });
    }

    // Convert to blockchain format
    const stageInfo = {
      stageId: stage.stageId,
      pricePerToken: ethers.utils.parseUnits(stage.pricePerToken.toString(), 8).toString(), // 8 decimals for price
      supply: ethers.utils.parseEther(stage.supply.toString()).toString(),
      sold: ethers.utils.parseEther(stage.sold.toString()).toString(),
      startTime: Math.floor(stage.startTime.getTime() / 1000),
      endTime: Math.floor(stage.endTime.getTime() / 1000),
      isActive: stage.isActive
    };

    return res.status(200).json({
      success: true,
      data: stageInfo
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get stage info',
      error: error.message
    });
  }
};

exports.getCurrentStageInfo = async (req, res) => {
  try {
    const activeStage = await Stage.findOne({ isActive: true });

    if (!activeStage) {
      return res.status(404).json({
        success: false,
        message: 'No active stage found'
      });
    }

    // Convert to blockchain format
    const stageInfo = {
      stageId: activeStage.stageId,
      pricePerToken: ethers.utils.parseUnits(activeStage.pricePerToken.toString(), 8).toString(), // 8 decimals for price
      supply: ethers.utils.parseEther(activeStage.supply.toString()).toString(),
      sold: ethers.utils.parseEther(activeStage.sold.toString()).toString(),
      startTime: Math.floor(activeStage.startTime.getTime() / 1000),
      endTime: Math.floor(activeStage.endTime.getTime() / 1000),
      isActive: activeStage.isActive
    };

    return res.status(200).json({
      success: true,
      data: stageInfo
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get current stage info',
      error: error.message
    });
  }
};

exports.updateStage = async (req, res) => {
  try {
    const { stageId } = req.params;
    const updateData = req.body;

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found'
      });
    }

    // Update allowed fields
    if (updateData.name) stage.name = updateData.name;
    if (updateData.pricePerToken) stage.pricePerToken = parseFloat(updateData.pricePerToken);
    if (updateData.supply) stage.supply = parseFloat(updateData.supply);
    if (updateData.startTime) stage.startTime = new Date(updateData.startTime);
    if (updateData.endTime) stage.endTime = new Date(updateData.endTime);

    await stage.save();

    return res.status(200).json({
      success: true,
      message: 'Stage updated successfully',
      data: stage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update stage',
      error: error.message
    });
  }
};

exports.deleteStage = async (req, res) => {
  try {
    const { stageId } = req.params;

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found'
      });
    }

    if (stage.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active stage'
      });
    }

    await Stage.deleteOne({ stageId: parseInt(stageId) });

    return res.status(200).json({
      success: true,
      message: 'Stage deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete stage',
      error: error.message
    });
  }
};

exports.createTestStages = async (req, res) => {
  try {
    const presale = await Presale.findOne({ isLive: true });
    if (!presale) {
      return res.status(404).json({
        success: false,
        message: 'No active presale found'
      });
    }
    const totalTokens = presale.total_tokens;
    const presaleEndTime = new Date(presale.TGETime);

    // Divide total tokens to 3 stages
    const stage1Supply = totalTokens * PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_1_SUPPLY_PERCENTAGE;
    const stage2Supply = totalTokens * PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_2_SUPPLY_PERCENTAGE;
    const stage3Supply = totalTokens * PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_3_SUPPLY_PERCENTAGE;

    const now = new Date();
    const nowTime = now.getTime();
    const endTime = presaleEndTime.getTime();

    // Calculate total duration and split into 3 equal parts
    const totalDuration = endTime - nowTime;
    if (totalDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Presale end time must be in the future'
      });
    }
    const stageDuration = Math.floor(totalDuration / 3);

    const distribution = [
      {
        stageId: 1,
        name: PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_1_NAME,
        pricePerToken: PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_1_PRICE,
        supply: stage1Supply,
        startTime: new Date(nowTime),
        endTime: new Date(nowTime + stageDuration)
      },
      {
        stageId: 2,
        name: PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_2_NAME,
        pricePerToken: PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_2_PRICE,
        supply: stage2Supply,
        startTime: new Date(nowTime + stageDuration),
        endTime: new Date(nowTime + 2 * stageDuration)
      },
      {
        stageId: 3,
        name: PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_3_NAME,
        pricePerToken: PRODUCTION_CONFIG.STAGE_DEFAULTS.STAGE_3_PRICE,
        supply: stage3Supply,
        startTime: new Date(nowTime + 2 * stageDuration),
        endTime: new Date(endTime) // Ensure last stage ends exactly at presaleEndTime
      }
    ];

    for (const stage of distribution) {
      const newStage = new Stage({
        stageId: stage.stageId,
        name: stage.name,
        pricePerToken: stage.pricePerToken,
        supply: stage.supply,
        sold: 0,
        startTime: stage.startTime,
        endTime: stage.endTime,
        isActive: false
      });

      await newStage.save();
    }

    // Activate the first stage
    const firstStage = await Stage.findOne({ stageId: 1 });
    firstStage.isActive = true;
    await firstStage.save();

    return res.status(200).json({
      success: true,
      message: 'Test stages created successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create test stages',
      error: error.message
    });
  }
};

// Get detailed stage status information
exports.getStageStatusInfo = async (req, res) => {
  try {
    const stageService = require('../services/stageService');
    const statusInfo = await stageService.getStageStatusInfo();

    return res.status(200).json({
      success: true,
      data: statusInfo
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get stage status info',
      error: error.message
    });
  }
};

// Start the stage time scheduler
exports.startStageTimeScheduler = async (req, res) => {
  try {
    const stageService = require('../services/stageService');
    await stageService.startStageTimeScheduler();

    return res.status(200).json({
      success: true,
      message: 'Stage time scheduler started successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to start stage time scheduler',
      error: error.message
    });
  }
};
