/**
 * Portfolio demo configuration — no production URLs or secrets.
 * Use environment variables for RPC and addresses when running locally.
 */

const deploymentInfo = require('./deployment-info.json');

/** @typedef {typeof DEMO_CONFIG} DemoConfig */

const DEMO_CONFIG = {
  blocksPerDay: 7200,
  ethChainId: process.env.DEMO_CHAIN_ID || '11155111',
  bscChainId: '97',
  polygonChainId: '80002',

  RPC_URLS: {
    ETH_RPC: process.env.ETH_RPC || '',
    BSC_RPC: process.env.BSC_RPC || '',
    POLYGON_RPC: process.env.POLYGON_RPC || ''
  },

  API_URLS: {
    COINGECKO_API: 'https://api.example.com/api/v3',
    TWITTER_API: 'https://api.example.com',
    SOLANA_EXPLORER: 'https://explorer.example.com',
    SOLANA_FAUCET: 'https://example.com/'
  },

  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',

  DEFAULT_TOKEN: {
    NAME: 'DemoPresale',
    SYMBOL: 'DEMO',
    TGE_TIME_OFFSET: 365 * 24 * 60 * 60 * 1000
  },

  DEFAULTS: {
    TOKEN_EXPIRES_IN: '1d',
    SIGNATURE_DEADLINE_MINUTES: 25,
    POLYGON_POLLING_INTERVAL: 30000,
    CACHE_DURATION: 10 * 60 * 1000,
    DEFAULT_REWARD_PER_BLOCK: 0.01,
    AWS_REGION: 'your-region-here',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001'
  },

  STAGE_DEFAULTS: {
    STAGE_1_NAME: 'Stage 1',
    STAGE_2_NAME: 'Stage 2',
    STAGE_3_NAME: 'Stage 3',
    STAGE_1_PRICE: 0.001,
    STAGE_2_PRICE: 0.002,
    STAGE_3_PRICE: 0.003,
    STAGE_1_SUPPLY_PERCENTAGE: 0.3,
    STAGE_2_SUPPLY_PERCENTAGE: 0.3,
    STAGE_3_SUPPLY_PERCENTAGE: 0.4
  },

  CHAIN_CONFIG: {
    COINGECKO_IDS: {
      ethereum: 'ethereum',
      bsc: 'binancecoin',
      polygon: 'matic-network'
    }
  }
};

/** Compatibility alias — demo-only config */
const PRODUCTION_CONFIG = DEMO_CONFIG;

module.exports = {
  DEMO_CONFIG,
  PRODUCTION_CONFIG,
  contractAddresses: deploymentInfo
};
