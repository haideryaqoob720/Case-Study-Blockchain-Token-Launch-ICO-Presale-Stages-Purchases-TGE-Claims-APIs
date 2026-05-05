/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 *
 * Demo: listens on ETH_RPC for PaymentReceiver PurchaseEvent (single-chain simplification).
 */

require('dotenv').config();
const { ethers } = require('ethers');
const { contractAddresses, PRODUCTION_CONFIG } = require('../constants');
const Stage = require('../models/Stage');
const Purchase = require('../models/Purchase');
const WalletCustomer = require('../models/WalletCustomer');
const PaymentReceiverJSON = require('../abis/PaymentReceiver.json');

const ZERO = '0x0000000000000000000000000000000000000000';

function buildEthereumContract() {
  const rpc = process.env.ETH_RPC || PRODUCTION_CONFIG.RPC_URLS.ETH_RPC;
  const addr = contractAddresses.sepolia?.PaymentReceiverAddress;
  if (!rpc || !addr || addr === ZERO) {
    return null;
  }
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  return new ethers.Contract(addr, PaymentReceiverJSON.abi, provider);
}

const CONTRACT_ETHEREUM = buildEthereumContract();

async function findOrCreateWalletCustomer(walletAddress, chain) {
  let walletCustomer = await WalletCustomer.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (!walletCustomer) {
    walletCustomer = await WalletCustomer.create({
      walletAddress: walletAddress.toLowerCase(),
      chains: [chain],
      isWhitelisted: true,
      lastActive: new Date()
    });
  } else {
    if (!walletCustomer.chains.includes(chain)) walletCustomer.chains.push(chain);
    walletCustomer.lastActive = new Date();
    await walletCustomer.save();
  }
  return walletCustomer;
}

async function calculateValueInUSD(paymentDetails, chain) {
  if (!CONTRACT_ETHEREUM) return paymentDetails.paymentAmount || 0;
  if (paymentDetails.isTokenPurchase) {
    return paymentDetails.paymentAmount;
  }
  try {
    const usdValueWei = await CONTRACT_ETHEREUM.getNativeUsdValue(paymentDetails.rawAmount);
    return parseFloat(ethers.utils.formatUnits(usdValueWei, 18));
  } catch {
    return paymentDetails.paymentAmount || 0;
  }
}

async function determinePaymentDetails(event, chain) {
  const txHash = event.transactionHash;
  const provider = CONTRACT_ETHEREUM?.provider;
  if (!provider) {
    return {
      isTokenPurchase: false,
      paymentAmount: 0,
      paymentCurrency: 'ETH',
      rawAmount: event.args?.amount || ethers.constants.Zero,
      tokenAddress: null
    };
  }
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);

  const isNativePayment = tx.value && !tx.value.isZero();

  const TOKEN_ADDRESSES = {
    USDT: contractAddresses.sepolia?.USDTAddress?.toLowerCase(),
    USDC: contractAddresses.sepolia?.USDCAddress?.toLowerCase()
  };

  if (isNativePayment) {
    const nativeAmount = parseFloat(ethers.utils.formatEther(tx.value));
    return {
      isTokenPurchase: false,
      paymentAmount: nativeAmount,
      paymentCurrency: 'ETH',
      rawAmount: tx.value,
      tokenAddress: null
    };
  }

  for (const log of receipt.logs) {
    const tokenAddress = log.address.toLowerCase();
    if (tokenAddress === TOKEN_ADDRESSES.USDT) {
      const tokenAmount = parseFloat(ethers.utils.formatUnits(event.args.amount, 6));
      return {
        isTokenPurchase: true,
        paymentAmount: tokenAmount,
        paymentCurrency: 'USDT',
        rawAmount: event.args.amount,
        tokenAddress
      };
    }
    if (tokenAddress === TOKEN_ADDRESSES.USDC) {
      const tokenAmount = parseFloat(ethers.utils.formatUnits(event.args.amount, 6));
      return {
        isTokenPurchase: true,
        paymentAmount: tokenAmount,
        paymentCurrency: 'USDC',
        rawAmount: event.args.amount,
        tokenAddress
      };
    }
  }

  const tokenAmount = parseFloat(ethers.utils.formatUnits(event.args.amount, 6));
  return {
    isTokenPurchase: true,
    paymentAmount: tokenAmount,
    paymentCurrency: 'USDT',
    rawAmount: event.args.amount,
    tokenAddress: TOKEN_ADDRESSES.USDT
  };
}

async function processPurchaseEvent(event, chain) {
  const { buyer, tokenAmount } = event.args;
  const txHash = event.transactionHash;

  if (await Purchase.findOne({ paymentTxHash: txHash })) return;

  const walletCustomer = await findOrCreateWalletCustomer(buyer, chain);
  const activeStage = await Stage.findOne({ isActive: true });

  if (!activeStage) return console.log('[Demo] No active presale stage — skipping purchase record.');

  const tokensToReceive = parseFloat(ethers.utils.formatUnits(tokenAmount, 18));

  const paymentDetails = await determinePaymentDetails(event, chain);
  const valueInUSD = await calculateValueInUSD(paymentDetails, chain);

  let purchase;
  try {
    purchase = await Purchase.create({
      customerId: walletCustomer._id,
      stageId: activeStage._id,
      stageNumber: activeStage.stageId,
      tokenAmount: tokensToReceive,
      tokenPrice: activeStage.pricePerToken,
      paymentAmount: paymentDetails.paymentAmount,
      paymentCurrency: paymentDetails.paymentCurrency,
      paymentTxHash: txHash,
      walletAddress: buyer,
      purchaseDate: new Date(),
      status: 'confirmed',
      chain,
      blockNumber: event.blockNumber,
      fiatAmount: valueInUSD,
      fiatCurrency: 'USD',
      tokenSymbol: PRODUCTION_CONFIG.DEFAULT_TOKEN.SYMBOL,
      paymentAmountFormatted: String(paymentDetails.paymentAmount)
    });
  } catch (error) {
    if (error.code === 11000) {
      console.log(`[Demo] Duplicate purchase tx ${txHash}`);
      return;
    }
    throw error;
  }

  walletCustomer.totalTokensPurchased += tokensToReceive;
  walletCustomer.totalAmountPaid += valueInUSD;
  walletCustomer.purchases.push(purchase._id);
  await walletCustomer.save();

  activeStage.sold += tokensToReceive;
  await activeStage.save();

  console.log('[Demo] Indexed purchase', buyer, tokensToReceive);
}

function setupEventListeners() {
  if (!CONTRACT_ETHEREUM) {
    console.log('[Demo] Blockchain listener inactive — set ETH_RPC and DEMO_PAYMENT_RECEIVER_ADDRESS / deployment.');
    return;
  }
  CONTRACT_ETHEREUM.on('PurchaseEvent', (_buyer, _amount, _chainId, _stageId, _tokenAmount, event) => {
    processPurchaseEvent(event, 'ethereum');
  });
}

async function initBlockchainListeners() {
  console.log('[Demo] Initializing blockchain listener (ethereum only)…');
  setupEventListeners();
}

async function getTokenPrice() {
  return null;
}

module.exports = { initBlockchainListeners, getTokenPrice };
