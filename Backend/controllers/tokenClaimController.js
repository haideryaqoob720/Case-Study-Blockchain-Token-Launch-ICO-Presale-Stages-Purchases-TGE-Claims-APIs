/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const { ethers } = require('ethers');
const TokenClaim = require('../models/TokenClaim');
const WalletCustomer = require('../models/WalletCustomer');
const signingService = require('../services/signingService');
const stakingService = require('../services/stakingService');
const { contractAddresses, PRODUCTION_CONFIG } = require('../constants');

function tokenClaimAddress() {
  const envAddr = process.env.DEMO_TOKEN_CLAIM_ADDRESS;
  if (envAddr && ethers.utils.isAddress(envAddr)) return ethers.utils.getAddress(envAddr);
  const fromJson = contractAddresses.sepolia?.TokenClaimAddress;
  if (fromJson && fromJson !== ethers.constants.AddressZero) return ethers.utils.getAddress(fromJson);
  throw new Error('Set DEMO_TOKEN_CLAIM_ADDRESS to deployed TokenClaim.');
}

exports.getClaimSignature = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Valid wallet address is required'
      });
    }

    const tgePassed = await stakingService.hasTGEPassed();
    if (!tgePassed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot claim tokens before TGE date',
        timeUntilTGE: await stakingService.getTimeUntilTGE()
      });
    }

    const walletCustomer = await WalletCustomer.findOne({
      walletAddress: walletAddress.toLowerCase()
    });

    if (!walletCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found or no tokens allocated'
      });
    }

    const purchaseAmount = walletCustomer.totalTokensPurchased || 0;
    if (purchaseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No tokens available to claim for this wallet'
      });
    }

    const stakingReward = 0;

    const MAX_DEADLINE_DURATION = 30 * 24 * 60 * 60;
    const deadline = Math.floor(Date.now() / 1000) + MAX_DEADLINE_DURATION;

    const purchaseAmountWei = ethers.utils.parseUnits(purchaseAmount.toString(), 18);
    const stakingRewardWei = ethers.utils.parseUnits(String(stakingReward), 18);

    const claimContract = tokenClaimAddress();
    const chainIdNumber = parseInt(process.env.DEMO_CHAIN_ID || PRODUCTION_CONFIG.ethChainId, 10);

    const messageHash = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
      [walletAddress, purchaseAmountWei, stakingRewardWei, deadline, chainIdNumber, claimContract]
    );

    const signer = signingService.getSignerAddress();
    const signature = await signingService.signMessage(ethers.utils.arrayify(messageHash));

    return res.status(200).json({
      success: true,
      message: 'Claim signature generated successfully',
      data: {
        walletAddress,
        purchaseAmount: ethers.utils.formatUnits(purchaseAmountWei, 18),
        purchaseAmountWei: purchaseAmountWei.toString(),
        stakingReward: '0',
        stakingRewardWei: stakingRewardWei.toString(),
        deadline,
        deadlineDate: new Date(deadline * 1000).toISOString(),
        signature,
        signerAddress: signer,
        blockNumber: 0,
        contractAddress: claimContract,
        instructions: `tokenClaim.claimTokens(${purchaseAmountWei.toString()}, ${stakingRewardWei.toString()}, ${deadline}, "${signature}")`
      }
    });
  } catch (error) {
    console.error(`Error generating claim signature: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate claim signature',
      error: error.message
    });
  }
};

exports.getClaimStatus = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const claims = await TokenClaim.find({
      walletAddress: walletAddress.toLowerCase()
    });

    let totalClaimed = 0;
    let stakingRewards = 0;
    let latestClaimDate = null;

    claims.forEach(claim => {
      totalClaimed += claim.amount || 0;
      stakingRewards += claim.stakingRewards || 0;

      if (claim.claimTimestamp) {
        if (!latestClaimDate || new Date(claim.claimTimestamp) > new Date(latestClaimDate)) {
          latestClaimDate = claim.claimTimestamp;
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        hasClaimed: claims.length > 0,
        totalClaimed,
        stakingRewards,
        latestClaimDate,
        totalClaims: claims.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve claim status',
      error: error.message
    });
  }
};

exports.getClaims = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Demo mode — feature removed'
  });
};
