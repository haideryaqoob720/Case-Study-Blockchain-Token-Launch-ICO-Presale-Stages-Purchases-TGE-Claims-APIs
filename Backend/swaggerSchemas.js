/**
 * Swagger Schema Definitions
 * This file contains all the schema definitions used in the API documentation
 */

const schemas = {
  ClaimSignature: {
    type: 'object',
    properties: {
      signature: {
        type: 'string',
        description: 'The signature for claiming tokens'
      },
      purchaseAmount: {
        type: 'string',
        description: 'Amount of tokens purchased'
      },
      stakingReward: {
        type: 'string',
        description: 'Amount of staking rewards'
      },
      deadline: {
        type: 'number',
        description: 'Deadline timestamp for the signature'
      }
    },
    required: ['signature', 'purchaseAmount', 'stakingReward', 'deadline']
  },

  Presale: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description: 'Presale ID'
      },
      tokenName: {
        type: 'string',
        description: 'Name of the token'
      },
      tokenSymbol: {
        type: 'string',
        description: 'Symbol of the token'
      },
      tokenAddress: {
        type: 'string',
        description: 'Contract address of the token'
      },
      masterWallet: {
        type: 'string',
        description: 'Master wallet address'
      },
      TGETime: {
        type: 'string',
        format: 'date-time',
        description: 'Token Generation Event time'
      },
      isLive: {
        type: 'boolean',
        description: 'Whether the presale is live'
      },
      stakingEnabled: {
        type: 'boolean',
        description: 'Whether staking is enabled'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      }
    }
  },

  Stage: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description: 'Stage ID'
      },
      name: {
        type: 'string',
        description: 'Name of the stage'
      },
      stageNumber: {
        type: 'number',
        description: 'Stage number'
      },
      pricePerToken: {
        type: 'number',
        description: 'Price per token in USD'
      },
      supply: {
        type: 'number',
        description: 'Token supply for this stage'
      },
      startTime: {
        type: 'string',
        format: 'date-time',
        description: 'Stage start time'
      },
      endTime: {
        type: 'string',
        format: 'date-time',
        description: 'Stage end time'
      },
      isActive: {
        type: 'boolean',
        description: 'Whether the stage is active'
      },
      isCompleted: {
        type: 'boolean',
        description: 'Whether the stage is completed'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      }
    }
  },

  Purchase: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description: 'Purchase ID'
      },
      walletAddress: {
        type: 'string',
        description: 'Wallet address of the buyer'
      },
      amount: {
        type: 'number',
        description: 'Purchase amount in USD'
      },
      tokens: {
        type: 'number',
        description: 'Number of tokens purchased'
      },
      stage: {
        type: 'string',
        description: 'Stage ID'
      },
      transactionHash: {
        type: 'string',
        description: 'Blockchain transaction hash'
      },
      chain: {
        type: 'string',
        description: 'Blockchain network'
      },
      status: {
        type: 'string',
        description: 'Purchase status'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      }
    }
  },

  ChainPrice: {
    type: 'object',
    properties: {
      price: {
        type: 'number',
        description: 'Price in USD'
      },
      cachedAt: {
        type: 'string',
        format: 'date-time',
        description: 'When the price was cached'
      },
      isExpired: {
        type: 'boolean',
        description: 'Whether the cached price is expired'
      },
      ageInSeconds: {
        type: 'integer',
        description: 'Age of the cached price in seconds'
      }
    }
  },

  ExportType: {
    type: 'string',
    enum: ['purchases', 'wallets', 'staking'],
    description: 'Type of data to export'
  },

  Customer: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description: 'Customer ID'
      },
      username: {
        type: 'string',
        description: 'Customer username'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      }
    }
  },

  WalletCustomer: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description: 'Wallet customer ID'
      },
      walletAddress: {
        type: 'string',
        description: 'Wallet address'
      },
      totalPurchased: {
        type: 'number',
        description: 'Total amount purchased'
      },
      totalTokens: {
        type: 'number',
        description: 'Total tokens purchased'
      },
      purchaseCount: {
        type: 'number',
        description: 'Number of purchases'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      }
    }
  },

  Stake: {
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        description: 'Stake ID'
      },
      walletAddress: {
        type: 'string',
        description: 'Wallet address of the staker'
      },
      amount: {
        type: 'number',
        description: 'Amount staked'
      },
      startTime: {
        type: 'string',
        format: 'date-time',
        description: 'Staking start time'
      },
      lockDuration: {
        type: 'number',
        description: 'Lock duration in seconds'
      },
      active: {
        type: 'boolean',
        description: 'Whether the stake is active'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp'
      }
    }
  }
};

module.exports = schemas;
