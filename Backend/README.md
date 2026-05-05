# Metanews API

A Node.js API for managing a cryptocurrency presale system with a single customer per system, one presale per customer, and multiple stages per presale.

## Features

- Single customer system (only one customer allowed)
- One presale per customer
- Multiple stages per presale (up to 5)
- Only one stage can be active at a time (required for pricing and purchases)
- Automatic stage progression with stage status management
- Ability to pause/resume stages during presale
- Customer authentication with simple username/password
- Password hashing with bcrypt
- API documentation with Swagger

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Create a `.env` file (never commit real secrets). Example placeholders:

   ```
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/your_demo_db
   JWT_SECRET=replace-with-long-random-string

   # Demo EVM (use your own RPC URLs)
   ETH_RPC=https://example.com
   DEMO_PAYMENT_RECEIVER_ADDRESS=0xYourDeployedPaymentReceiver
   DEMO_TOKEN_CLAIM_ADDRESS=0xYourDeployedTokenClaim
   DEMO_CHAIN_ID=11155111

   # Signing wallet MUST match PaymentReceiver.trustedSigner and TokenClaim signer expected by contracts (Hardhat/Anvil test key only for local demos).
   TRUSTED_SIGNER_PRIVATE_KEY=

   CORS_ORIGIN=http://localhost:3001
   DEMO_TGE_PASSED=false
   ```

   Use placeholders such as `YOUR_API_KEY_HERE` / `example.com` only in docs — never commit production keys.

3. MongoDB Setup (Required for full functionality):

   - Install MongoDB on your system if not already installed: https://www.mongodb.com/try/download/community
   - Or use Docker to run MongoDB:
     ```
     docker run -d -p 27017:27017 --name mongodb mongo:latest
     ```
   - To check if MongoDB is running:
     ```
     mongo --eval "db.adminCommand('ping')"
     ```
     or
     ```
     mongosh --eval "db.adminCommand('ping')"
     ```

4. Start the server:

   ```
   npm start
   ```

   For development with auto-restart:

   ```
   npm run dev
   ```

5. Access the API documentation:
   ```
   http://localhost:3000/api-docs
   ```

## API Endpoints

### Customer Management

#### Register a customer (only one allowed in the system)

```
POST /api/customers/create
```

Body:

```json
{
  "username": "customer1",
  "password": "password123"
}
```

#### Login

```
POST /api/customers/login
```

Body:

```json
{
  "username": "customer1",
  "password": "password123"
}
```

#### Get customer details

```
GET /api/customers/details
```

### Presale Management

#### Create a presale (one per customer)

```
POST /api/presales/create
```

Body:

```json
{
  "tokenName": "BlockchainCentral", // default
  "tokenSymbol": "FOX", // default
  "tokenAddress": "0x0000000000000000000000000000000000000000", // default
  "masterWallet": "0x0000000000000000000000000000000000000000", // default
  "TGETime": "2025-04-27T14:49:50.946Z", // default: 1 year from now
  "isLive": true, // default
  "stakingEnabled": true // default
}
```

Note: All fields have default values and are optional when creating a presale.

#### Get presale details

```
GET /api/presales
```

#### Update presale

```
PUT /api/presales/update
```

Body: (include only fields to update)

```json
{
  "tokenAddress": "0xnewaddress",
  "isLive": false
}
```

### Stage Management

#### Create a stage

```
POST /api/stages/create
```

Body:

```json
{
  "stageNumber": 1,
  "name": "first stage",
  "pricePerToken": "0.5",
  "tokenCap": 0,
  "tokensSold": 0,
  "allocation": "0",
  "remainingAllocation": "0",
  "startDate": "2025-04-26T15:05:35.139Z",
  "endDate": "2025-04-27T15:05:35.139Z"
}
```

Note:

- The presaleId will be automatically assigned based on the existing presale in the system.
- Stages must be created in sequence (1, 2, 3, etc).
- The first stage created will automatically be marked as active.
- When creating a new stage, any previous active stage will be marked as completed.

#### Get all stages

```
GET /api/stages
```

Response includes presale information and categorizes stages:

```json
{
  "presaleId": "64a8c2e4f4f9a8c2e4f4f9a8",
  "presaleName": "BlockchainCentral",
  "presaleSymbol": "FOX",
  "activeStage": {
    // Currently active stage or null if no active stage
  },
  "completedStages": [
    // Array of completed stages
  ],
  "upcomingStages": [
    // Array of scheduled stages
  ],
  "stages": [
    // Array of all stage objects
  ]
}
```

#### Get a specific stage

```
GET /api/stages/{stageNumber}
```

Response includes presale information:

```json
{
  "presaleId": "64a8c2e4f4f9a8c2e4f4f9a8",
  "presaleName": "BlockchainCentral",
  "presaleSymbol": "FOX"
  // Stage details
}
```

#### Get the currently active stage

```
GET /api/stages/active
```

Returns the currently active stage with presale information, or 404 if no stage is active.

#### Get current token price

```
GET /api/stages/current-price
```

Returns the current price per token from the active stage:

```json
{
  "pricePerToken": "0.5",
  "tokenSymbol": "FOX",
  "stageName": "first stage",
  "stageNumber": 1,
  "status": "active"
}
```

#### Update a stage

```
PUT /api/stages/{stageNumber}/update
```

Body: (include only fields to update)

```json
{
  "pricePerToken": "0.75",
  "status": "active" // can be "scheduled", "active", "paused", or "completed"
}
```

Note:

- Status transitions are validated. A completed stage cannot be changed.
- Setting a stage to "active" will automatically pause any other active stage.

#### Pause a stage

```
POST /api/stages/{stageNumber}/pause
```

Pauses an active stage. Only active stages can be paused.

#### Resume a stage

```
POST /api/stages/{stageNumber}/resume
```

Resumes a paused stage. Only paused stages can be resumed.
Any other active stage will be automatically paused.

#### Complete a stage

```
POST /api/stages/{stageNumber}/complete
```

Marks a stage as completed and activates the next stage (if available).

## Sequential Steps and Stage Progression

The API enforces a specific sequence of setup and stage progression:

1. First, create a customer (only one allowed)
2. Then, create a presale for that customer (only one allowed)
3. Create stages in sequential order (1, 2, 3, etc.)

Stage Progression:

- When creating a new stage, the previous stage is automatically completed
- Only one stage can be active at a time
- Stages can be in one of four states: scheduled, active, paused, or completed
- You can manually control stage progression with pause/resume/complete actions
- The token price is determined by the currently active stage

This flow mimics real-world presale offerings where stages typically progress in sequence with different pricing tiers.

# Stage Management with Blockchain Event Listeners

This codebase has been updated to implement a blockchain event listener pattern for stage management, replacing the previous approach of making API calls to update the blockchain.

## Key Changes

### 1. Listener-Based Approach

- The backend now listens for blockchain events instead of making calls to the smart contract
- Two main events are handled:
  - `StagePriceUpdated`: When stage price is changed on the blockchain
  - `StageChanged`: When active stage is changed on the blockchain

### 2. Default Token Price for API Operations

- When creating or updating stages via API, a default token price of 0.05 is used
- When blockchain events are received, the stage price is updated with the actual value from the blockchain
- This hybrid approach ensures consistency for API operations while staying in sync with blockchain changes

### 3. Removed Smart Contract Calls

- Removed all outgoing smart contract calls to set stage price or active stage
- APIs now only update the local database, not the blockchain
- Blockchain events trigger database updates through listeners

## Implementation Details

### Event Listeners

The `stageService.js` file now:

- Sets up event listeners for all configured chains (Ethereum, BSC, Polygon)
- Processes events to update the database when blockchain changes occur
- Creates new stages if they don't exist when events are received
- Updates stage prices with actual values from the blockchain

### API Endpoints

API endpoints were updated to:

- Always use the default token price of 0.05 when creating or updating stages
- No longer make blockchain calls when changes are made
- Return the actual token price from the database (which may have been updated by blockchain events)

### Database Management

- Active stage management is now triggered by blockchain events
- When a `StageChanged` event is received, all stages are deactivated except the new active one
- When a `StagePriceUpdated` event is received, the stage price is updated with the actual value from the blockchain

## Benefits

1. **Reactive Approach**: System reacts to blockchain changes rather than trying to initiate them
2. **Consistency with Flexibility**: Default prices for API operations, but stays in sync with blockchain values
3. **Reliability**: Database stays in sync with blockchain state automatically
4. **Simplified APIs**: Endpoints are simpler and don't need to handle blockchain errors

## Reward Calculation Formula

```
Reward = Blocks Elapsed × Reward Per Block × (Stake Amount / Total Pool)
```

Where:

- **Blocks Elapsed**: `currentBlock - lastRewardBlock`
- **Reward Per Block**: From PresaleManager contract (default: 0.01 tokens)
- **Stake Amount**: User's staked token amount
- **Total Pool**: Total tokens staked across all users
