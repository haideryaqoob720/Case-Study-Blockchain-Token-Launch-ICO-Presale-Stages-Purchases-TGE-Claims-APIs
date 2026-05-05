# MetaNews Smart Contracts - Audit Documentation

## Overview

This repository contains the smart contracts for the MetaNews ecosystem, a cross-chain token presale and staking platform built on LayerZero. The system enables users to purchase tokens during presale phases and stake them across multiple blockchain networks.

## System Architecture

The MetaNews ecosystem consists of 5 main smart contracts that work together to provide a comprehensive token presale and staking solution:

### Core Contracts

1. **PresaleManager** - Manages presale configurations
2. **PaymentReceiver** - Handles token purchases with multiple payment methods
3. **TokenClaim** - Manages token distribution after TGE
4. **TokenStaking** - Cross-chain staking functionality (sending side)
5. **MetUserState** - Cross-chain staking state management (receiving side)

### Supporting Contracts

- **Mock ERC20 Token** for testing purposes
- **Mock contracts** for testing purposes
- **LayerZero OApp** integration for cross-chain functionality

## Contract Details

### 1. PresaleManager.sol

**Purpose**: Central management contract for presale phases and configurations

**Key Features**:

- Presale state management (NotCreated, Active, Paused, Ended)
- TGE (Token Generation Event) timestamp management
- Trusted signer configuration for backend integration
- Reward per block configuration for staking
- Integration with staking and claim contracts

**State Variables**:

- `presaleState`: Current state of the presale
- `token`: Address of the token being sold
- `tgeTimestamp`: When tokens become transferable
- `trustedSigner`: Backend signer for secure operations
- `rewardPerBlock`: Staking rewards configuration
- `presaleStartTime`/`presaleEndTime`: Presale duration
- `presaleTokenSupply`: Total tokens allocated for presale

**Critical Functions**:

- `createPresale()`: Initialize presale with all parameters
- `setTgeTimestamp()`: Update TGE timing (only before TGE)
- `endPresale()`: Manually end presale
- `isPresaleActive()`: Check if presale is currently active

**Security Considerations**:

- Owner-only critical functions
- Time-based restrictions for TGE updates
- Reentrancy protection on state-changing functions
- Pausable functionality for emergency stops

### 2. PaymentReceiver.sol

**Purpose**: Handles all token purchases with multiple payment methods and referral system

**Key Features**:

- Native currency purchases (ETH, BNB, POL.)
- ERC20 token purchases (USDT, USDC.)
- Chainlink price feed integration for USD pricing
- Referral system with 10% rewards
- Extra Bones bonus system (5% bonus tokens)
- Wert relayer integration for fiat payments
- Bonus token distribution cap management

**State Variables**:

- `masterWallet`: Receives all payments
- `chainId`: Current blockchain identifier
- `minPurchaseAmount`: Minimum purchase threshold
- `nativePriceFeed`: Chainlink price feed for native currency
- `supportedTokens`: Whitelist of accepted ERC20 tokens
- `userExtraBones`: User bonus eligibility mapping
- `wertRelayer`: Authorized fiat payment relayers

**Critical Functions**:

- `buyWithNative()`: Purchase with native currency
- `buyWithToken()`: Purchase with ERC20 tokens
- `buyWithNativeForWert()`: Fiat payment integration
- `activateExtraBones()`: Enable bonus tokens for user
- `setTokenSupport()`: Manage supported payment tokens

**Security Considerations**:

- Reentrancy protection on all purchase functions
- Price feed staleness checks (1 hour timeout)
- Signature verification for Wert payments
- Referral payment validation
- Bonus token cap enforcement
- SafeERC20 for token transfers

### 3. TokenClaim.sol

**Purpose**: Manages token distribution after TGE with signature-based claiming

**Key Features**:

- Signature-based token claiming system
- Integration with PresaleManager for TGE validation
- Staking rewards distribution
- One-time claiming per user
- Signature replay protection

**State Variables**:

- `presaleManager`: Reference to presale management
- `claimsActive`: Global claiming toggle
- `claimedAmounts`: User claim tracking
- `usedSignatures`: Signature replay protection

**Critical Functions**:

- `claimTokens()`: Main claiming function with signature verification
- `toggleClaims()`: Enable/disable claiming (owner only)
- `getUserClaimInfo()`: Check user claim eligibility

**Security Considerations**:

- Signature verification using trusted signer
- Replay attack prevention
- One-time claiming enforcement
- TGE requirement validation
- Signature expiration checks

### 4. TokenStaking.sol

**Purpose**: Cross-chain staking functionality (sending side of LayerZero)

**Key Features**:

- Cross-chain staking via LayerZero messaging
- 3-month and 6-month staking periods
- Backend signature verification
- Fee quoting for LayerZero operations
- Integration with MetUserState for state management

**State Variables**:

- `chainId`: Current blockchain identifier
- `trustedSigner`: Backend signature verifier
- `THREE_MONTHS`/`SIX_MONTHS`: Valid staking durations

**Critical Functions**:

- `stake()`: Initiate cross-chain staking
- `unstake()`: Initiate cross-chain unstaking
- `quoteStake()`/`quoteUnstake()`: Fee calculation
- `_verifyStakeSignature()`/`_verifyUnstakeSignature()`: Signature validation

**Security Considerations**:

- Signature verification for all operations
- Reentrancy protection
- LayerZero message validation
- Nonce-based replay protection
- Duration validation (only 3 or 6 months)

### 5. MetUserState.sol

**Purpose**: Cross-chain staking state management (receiving side of LayerZero)

**Key Features**:

- Receives staking messages from TokenStaking contracts
- Maintains global staking state across chains
- Stake tracking with lock periods
- Message deduplication

**State Variables**:

- `totalStakedGlobal`: Global staking amounts per user
- `userStakes`: Individual stake records
- `processedMessages`: LayerZero message deduplication

**Critical Functions**:

- `_lzReceive()`: LayerZero message handler
- `_handleStake()`: Process stake messages
- `_handleUnstake()`: Process unstake messages
- `getUserStakes()`: Query user stake information

**Security Considerations**:

- Message deduplication to prevent replay attacks
- User address validation
- Stake index bounds checking
- Lock period enforcement (commented for testing)
- Reentrancy protection

## Contract Interactions

### Purchase Flow

1. User calls `PaymentReceiver.buyWithNative()` or `buyWithToken()`
2. Payment is processed with referral/bonus calculations
3. Purchase data is stored in PaymentReceiver
4. Backend tracks purchases for future claiming

### Claiming Flow

1. TGE occurs (timestamp reached)
2. Owner activates claims via `TokenClaim.toggleClaims()`
3. Backend generates signature for user's claimable amount
4. User calls `TokenClaim.claimTokens()` with signature
5. Tokens are transferred to user

### Staking Flow

1. User calls `TokenStaking.stake()` with backend signature
2. LayerZero message is sent to destination chain
3. `MetUserState` receives and processes the stake
4. User's staking state is updated across chains

## Security Considerations

### Access Control

- All critical functions are owner-only
- Trusted signer pattern for backend integration
- Wert relayer whitelist for fiat payments

### Reentrancy Protection

- All state-changing functions use `nonReentrant` modifier
- SafeERC20 for external token calls

### Signature Security

- EIP-712 compatible signature verification
- Nonce-based replay protection
- Signature expiration timestamps
- Trusted signer validation

### Price Feed Security

- Chainlink price feed integration
- Staleness checks (1 hour timeout)
- Price validation (positive values)
- Round ID verification

### Cross-Chain Security

- LayerZero message deduplication
- Message type validation
- User address verification
- Amount validation

## Testing

The project includes comprehensive test suites:

- **Foundry tests**: Unit tests for individual contracts
- **Hardhat tests**: Integration tests and deployment scripts
- **Mock contracts**: For isolated testing

Run tests with:

```bash
pnpm run test
```

## Deployment

Contracts are deployed across multiple networks:

- **Amoy Testnet**: Full deployment with all contracts
- **BSC Testnet**: PaymentReceiver and TokenStaking
- **Sepolia Testnet**: PaymentReceiver and TokenStaking

Deployment addresses are stored in `deployment-info.json`.

## Dependencies

- **OpenZeppelin Contracts**: v5.0.2 (access control, reentrancy, ERC20)
- **LayerZero OApp**: v0.3.2 (cross-chain messaging)
- **Chainlink Contracts**: v0.8.0 (price feeds)

## Audit Scope

This audit should focus on:

1. **Access Control**: Verify all owner-only functions and trusted signer usage
2. **Reentrancy**: Check all external calls and state changes
3. **Signature Verification**: Validate EIP-712 implementation and replay protection
4. **Price Feed Security**: Verify Chainlink integration and staleness checks
5. **Cross-Chain Security**: Validate LayerZero message handling and deduplication
6. **Mathematical Operations**: Check for overflow/underflow in calculations
7. **Token Transfers**: Verify SafeERC20 usage and transfer logic
8. **State Management**: Ensure consistent state across all contracts
9. **Emergency Functions**: Validate pause/unpause and recovery functions
10. **Integration Points**: Check contract interactions and data flow

## Known Limitations

1. **Lock Period Enforcement**: Currently commented out in MetUserState for testing
2. **Bonus Token Cap**: Can be disabled by owner
3. **Price Feed Dependency**: Single point of failure for pricing
4. **LayerZero Dependency**: Relies on LayerZero infrastructure
5. **Owner Centralization**: Multiple owner-only functions

## Contact

For audit-related questions or clarifications, please refer to the contract comments and test files for detailed implementation examples.
