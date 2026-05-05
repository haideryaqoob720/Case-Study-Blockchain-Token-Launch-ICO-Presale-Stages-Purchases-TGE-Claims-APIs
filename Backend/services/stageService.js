const Stage = require('../models/Stage');
const { ethers } = require('ethers');

async function createStage(stageData) {
  try {
    console.log(`Creating new stage: ${stageData.name}`);

    // Get the next stage ID
    const lastStage = await Stage.findOne().sort({ stageId: -1 });
    const stageId = lastStage ? lastStage.stageId + 1 : 1;

    // Create the new stage
    const newStage = new Stage({
      stageId,
      name: stageData.name,
      pricePerToken: parseFloat(stageData.pricePerToken),
      supply: parseFloat(stageData.supply),
      sold: 0,
      startTime: new Date(stageData.startTime),
      endTime: new Date(stageData.endTime),
      isActive: stageId === 1 // First stage is active by default
    });

    await newStage.save();
    console.log(`Stage ${stageId} created successfully`);

    return newStage;
  } catch (error) {
    console.log(`Error creating stage: ${error.message}`);
    throw error;
  }
}

// Get current active stage
async function getCurrentActiveStage() {
  try {
    console.log('Getting current active stage');

    const activeStage = await Stage.findOne({ isActive: true });

    if (!activeStage) {
      console.log('No active stage found');
      return null;
    }

    console.log(`Active stage found: ${activeStage.name} (ID: ${activeStage.stageId})`);
    return activeStage;
  } catch (error) {
    console.log(`Error getting active stage: ${error.message}`);
    throw error;
  }
}

// Get stage by ID
async function getStageById(stageId) {
  try {
    console.log(`Getting stage by ID: ${stageId}`);

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });

    if (!stage) {
      console.log(`Stage ${stageId} not found`);
      return null;
    }

    console.log(`Stage found: ${stage.name}`);
    return stage;
  } catch (error) {
    console.log(`Error getting stage by ID: ${error.message}`);
    throw error;
  }
}

// Get all stages
async function getAllStages() {
  try {
    console.log('Getting all stages');

    const stages = await Stage.find().sort({ stageId: 1 });

    console.log(`Found ${stages.length} stages`);
    return stages;
  } catch (error) {
    console.log(`Error getting all stages: ${error.message}`);
    throw error;
  }
}

// Update stage sold amount
async function updateStageSold(stageId, tokenAmount) {
  try {
    console.log(`Updating stage ${stageId} sold amount by ${tokenAmount}`);

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    stage.sold += parseFloat(tokenAmount);

    // Check if stage has ended (time-based instead of supply-based)
    const now = new Date();
    if (now > stage.endTime && stage.isActive) {
      console.log(`Stage ${stageId} has ended. Deactivating...`);
      stage.isActive = false;

      // Try to activate the next stage
      await activateNextStage(stageId);
    }

    await stage.save();
    console.log(`Stage ${stageId} sold amount updated to ${stage.sold}`);

    return stage;
  } catch (error) {
    console.log(`Error updating stage sold amount: ${error.message}`);
    throw error;
  }
}

// Activate next stage based on time (not supply)
async function activateNextStage(currentStageId) {
  try {
    console.log(`Attempting to activate next stage after ${currentStageId}`);

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
        await activateNextStage(nextStage.stageId);
      }
    }
  } catch (error) {
    console.log(`Error activating next stage: ${error.message}`);
    throw error;
  }
}

// New function to check and advance stages based on time
async function checkAndAdvanceStagesByTime() {
  try {
    const now = new Date();
    const activeStage = await Stage.findOne({ isActive: true });

    if (activeStage) {
      // Check if current active stage has ended
      if (now > activeStage.endTime) {
        console.log(`Active stage ${activeStage.stageId} has ended. Advancing to next stage...`);
        await activateNextStage(activeStage.stageId);
      } else if (now < activeStage.startTime) {
        console.log(`Active stage ${activeStage.stageId} hasn't started yet. Deactivating...`);
        activeStage.isActive = false;
        await activeStage.save();

        // Try to find a stage that should be active now
        await findAndActivateCurrentStage();
      }
    } else {
      // No active stage, try to find one that should be active now
      await findAndActivateCurrentStage();
    }
  } catch (error) {
    console.log(`Error checking and advancing stages by time: ${error.message}`);
    throw error;
  }
}

// Helper function to find and activate the stage that should be active now
async function findAndActivateCurrentStage() {
  try {
    const now = new Date();

    // Find a stage that should be active now (within start and end time)
    const currentStage = await Stage.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).sort({ stageId: 1 });

    if (currentStage) {
      currentStage.isActive = true;
      await currentStage.save();
      console.log(`Activated stage ${currentStage.stageId}: ${currentStage.name} (time-based activation)`);
    }
  } catch (error) {
    console.log(`Error finding and activating current stage: ${error.message}`);
    throw error;
  }
}

// Manually activate a stage
async function activateStage(stageId) {
  try {
    console.log(`Manually activating stage ${stageId}`);

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    // Deactivate all stages
    await Stage.updateMany({}, { isActive: false });

    // Activate the specified stage
    stage.isActive = true;
    await stage.save();

    console.log(`Stage ${stageId} activated successfully`);
    return stage;
  } catch (error) {
    console.log(`Error activating stage: ${error.message}`);
    throw error;
  }
}

// Update stage details
async function updateStage(stageId, updateData) {
  try {
    console.log(`Updating stage ${stageId}`);

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    // Update allowed fields
    if (updateData.name) stage.name = updateData.name;
    if (updateData.pricePerToken) stage.pricePerToken = parseFloat(updateData.pricePerToken);
    if (updateData.supply) stage.supply = parseFloat(updateData.supply);
    if (updateData.startTime) stage.startTime = new Date(updateData.startTime);
    if (updateData.endTime) stage.endTime = new Date(updateData.endTime);

    await stage.save();
    console.log(`Stage ${stageId} updated successfully`);

    return stage;
  } catch (error) {
    console.log(`Error updating stage: ${error.message}`);
    throw error;
  }
}

// Delete a stage
async function deleteStage(stageId) {
  try {
    console.log(`Deleting stage ${stageId}`);

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    if (stage.isActive) {
      throw new Error('Cannot delete active stage');
    }

    await Stage.deleteOne({ stageId: parseInt(stageId) });
    console.log(`Stage ${stageId} deleted successfully`);
  } catch (error) {
    console.log(`Error deleting stage: ${error.message}`);
    throw error;
  }
}

// Get stage information formatted for contract calls
async function getStageInfoForContract(stageId) {
  try {
    console.log(`Getting stage info for contract: ${stageId}`);

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    // Convert to blockchain format
    const stageInfo = {
      stageId: stage.stageId,
      pricePerToken: ethers.utils.parseUnits(stage.pricePerToken.toString(), 8), // 8 decimals for price
      supply: ethers.utils.parseEther(stage.supply.toString()),
      sold: ethers.utils.parseEther(stage.sold.toString()),
      startTime: Math.floor(stage.startTime.getTime() / 1000),
      endTime: Math.floor(stage.endTime.getTime() / 1000),
      isActive: stage.isActive
    };

    console.log(`Stage info formatted for contract`);
    return stageInfo;
  } catch (error) {
    console.log(`Error getting stage info for contract: ${error.message}`);
    throw error;
  }
}

// Get current active stage info for contract calls
async function getCurrentStageInfoForContract() {
  try {
    console.log('Getting current stage info for contract');

    const activeStage = await Stage.findOne({ isActive: true });

    if (!activeStage) {
      console.log('No active stage found');
      return null;
    }

    return await getStageInfoForContract(activeStage.stageId);
  } catch (error) {
    console.log(`Error getting current stage info for contract: ${error.message}`);
    throw error;
  }
}

// Check if a stage is currently active (within time window)
async function checkStageTimeValidity(stageId) {
  try {
    console.log(`Checking time validity for stage ${stageId}`);

    const stage = await Stage.findOne({ stageId: parseInt(stageId) });
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    const now = new Date();
    const isValid = now >= stage.startTime && now <= stage.endTime;

    console.log(`Stage ${stageId} time validity: ${isValid}`);
    return isValid;
  } catch (error) {
    console.log(`Error checking stage time validity: ${error.message}`);
    throw error;
  }
}

// Get stage statistics
async function getStageStats() {
  try {
    console.log('Getting stage statistics');

    const stages = await Stage.find().sort({ stageId: 1 });

    const stats = {
      totalStages: stages.length,
      activeStage: stages.find(s => s.isActive),
      completedStages: stages.filter(s => s.sold >= s.supply || new Date() > s.endTime),
      upcomingStages: stages.filter(s => new Date() < s.startTime),
      totalTokensSold: stages.reduce((sum, s) => sum + s.sold, 0),
      totalTokensSupply: stages.reduce((sum, s) => sum + s.supply, 0)
    };

    console.log(`Stage statistics calculated`);
    return stats;
  } catch (error) {
    console.log(`Error getting stage statistics: ${error.message}`);
    throw error;
  }
}

// Scheduled task to check and advance stages by time
async function startStageTimeScheduler() {
  console.log('[Demo] Stage auto-advance scheduler disabled for portfolio build.');
}

// Get stage status information including time-based details
async function getStageStatusInfo() {
  try {
    const now = new Date();
    const stages = await Stage.find().sort({ stageId: 1 });

    const statusInfo = stages.map(stage => {
      const isActive = stage.isActive;
      const hasStarted = now >= stage.startTime;
      const hasEnded = now > stage.endTime;
      const isCurrentTime = now >= stage.startTime && now <= stage.endTime;

      let status = 'upcoming';
      if (hasEnded) status = 'ended';
      else if (isActive && isCurrentTime) status = 'active';
      else if (hasStarted && !hasEnded) status = 'available';

      return {
        stageId: stage.stageId,
        name: stage.name,
        status: status,
        isActive: isActive,
        startTime: stage.startTime,
        endTime: stage.endTime,
        timeUntilStart: Math.max(0, stage.startTime.getTime() - now.getTime()),
        timeUntilEnd: Math.max(0, stage.endTime.getTime() - now.getTime()),
        pricePerToken: stage.pricePerToken,
        supply: stage.supply,
        sold: stage.sold,
        remaining: stage.supply - stage.sold
      };
    });

    return statusInfo;
  } catch (error) {
    console.log(`Error getting stage status info: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createStage,
  getCurrentActiveStage,
  getStageById,
  getAllStages,
  updateStageSold,
  activateNextStage,
  activateStage,
  updateStage,
  deleteStage,
  getStageInfoForContract,
  getCurrentStageInfoForContract,
  checkStageTimeValidity,
  getStageStats,
  checkAndAdvanceStagesByTime,
  startStageTimeScheduler,
  getStageStatusInfo
};
