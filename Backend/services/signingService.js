/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 *
 * Demo: purchase signatures match PaymentReceiver.sol packed hashes (with chainId + contract).
 * Set TRUSTED_SIGNER_PRIVATE_KEY in .env (Hardhat/Anvil test key only — never mainnet).
 */

require('dotenv').config();
const { ethers } = require('ethers');

const pk = process.env.TRUSTED_SIGNER_PRIVATE_KEY;

let signerWallet;
try {
  if (pk) signerWallet = new ethers.Wallet(pk);
} catch {
  signerWallet = null;
}

function requireSigner() {
  if (!signerWallet) {
    throw new Error('Set TRUSTED_SIGNER_PRIVATE_KEY in environment (demo local key only).');
  }
}

function paymentReceiverAddress() {
  const addr = process.env.DEMO_PAYMENT_RECEIVER_ADDRESS;
  if (!addr || !ethers.utils.isAddress(addr)) {
    throw new Error('Set DEMO_PAYMENT_RECEIVER_ADDRESS to your deployed PaymentReceiver.');
  }
  return ethers.utils.getAddress(addr);
}

function demoChainIdNum() {
  const raw = process.env.DEMO_CHAIN_ID || '31337';
  return parseInt(raw, 10);
}

/**
 * Matches PaymentReceiver.buyWithNative hash:
 * keccak256(abi.encodePacked(msg.sender, stageId, pricePerToken, nativeAmount, deadline, chainid, address(this)))
 */
async function createNativePurchaseSignature(
  userAddress,
  stageId,
  pricePerToken,
  nativeAmountWei,
  deadline,
  userNonce
) {
  requireSigner();
  userAddress = ethers.utils.getAddress(userAddress);
  const receiver = paymentReceiverAddress();
  const chainId = demoChainIdNum();
  const nonce = userNonce !== undefined && userNonce !== null ? BigInt(userNonce) : BigInt(0);

  const stageIdBn = ethers.BigNumber.from(stageId);
  const priceBn = ethers.BigNumber.from(pricePerToken);
  const nativeBn = ethers.BigNumber.from(nativeAmountWei);
  const deadlineBn = ethers.BigNumber.from(deadline);

  const baseHash = ethers.utils.solidityKeccak256(
    ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
    [userAddress, stageIdBn, priceBn, nativeBn, deadlineBn, chainId, receiver]
  );

  const messageHash = ethers.utils.solidityKeccak256(['bytes32', 'uint256'], [baseHash, nonce]);
  const signature = await signerWallet.signMessage(ethers.utils.arrayify(messageHash));

  return {
    userAddress,
    stageId,
    pricePerToken,
    deadline,
    nativeAmount: nativeAmountWei.toString(),
    nonce: nonce.toString(),
    signature,
    signerAddress: signerWallet.address
  };
}

/**
 * Matches PaymentReceiver.buyWithToken hash (includes chainId + contract).
 */
async function createTokenPurchaseSignature(
  userAddress,
  token,
  amount,
  stageId,
  pricePerToken,
  deadline,
  userNonce
) {
  requireSigner();
  userAddress = ethers.utils.getAddress(userAddress);
  token = ethers.utils.getAddress(token);
  const receiver = paymentReceiverAddress();
  const chainId = demoChainIdNum();
  const nonce = userNonce !== undefined && userNonce !== null ? BigInt(userNonce) : BigInt(0);

  const baseHash = ethers.utils.solidityKeccak256(
    ['address', 'address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
    [userAddress, token, amount, stageId, pricePerToken, deadline, chainId, receiver]
  );

  const messageHash = ethers.utils.solidityKeccak256(['bytes32', 'uint256'], [baseHash, nonce]);
  const signature = await signerWallet.signMessage(ethers.utils.arrayify(messageHash));

  return {
    userAddress,
    token,
    amount,
    stageId,
    pricePerToken,
    deadline,
    nonce: nonce.toString(),
    signature,
    signerAddress: signerWallet.address
  };
}

async function createNativePurchaseSignatureForWert() {
  return { message: 'Demo mode — feature removed' };
}

async function createClaimSignature() {
  return { message: 'Demo mode — feature removed' };
}

async function createAllocationSignature() {
  return { message: 'Demo mode — feature removed' };
}

async function createStakeSignature() {
  return { message: 'Demo mode — feature removed' };
}

async function createUnstakeSignature() {
  return { message: 'Demo mode — feature removed' };
}

function getSignerAddress() {
  requireSigner();
  return signerWallet.address;
}

function verifySignature() {
  return false;
}

async function signMessage(messageHashBinary) {
  requireSigner();
  return signerWallet.signMessage(messageHashBinary);
}

module.exports = {
  createNativePurchaseSignature,
  createNativePurchaseSignatureForWert,
  createTokenPurchaseSignature,
  createClaimSignature,
  createAllocationSignature,
  createStakeSignature,
  createUnstakeSignature,
  getSignerAddress,
  verifySignature,
  signMessage
};
