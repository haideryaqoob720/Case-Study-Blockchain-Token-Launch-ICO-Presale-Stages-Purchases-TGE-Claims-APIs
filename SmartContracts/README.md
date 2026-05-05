# 0. clean the artifacts and recompile contract

npx hardhat clean && npx hardhat compile

# 1. Deploy Contracts

npx hardhat lz:deploy

# Script Order

1. deploy-met (amoy) Run once
2. deploy-usdt-usdc (amoy-bsc) Run once
3. deploy-amoy (amoy)
4. deploy-bsc (bsc)
5. deploy-ethereum (sepolia)

# 2. Wire and Configure Communication Channels (To establish trust and messaging rules)

npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# This wires peers, applies routing, and sets your enforced gas options

# You can verify setup with:

npx hardhat lz:oapp:peers:get --oapp-config layerzero.config.ts
npx hardhat lz:oapp:config:get --oapp-config layerzero.config.ts

# 3. Export Abis for backend and fronted

npm run export-abis

# 4. Run Backend First - Create a Presale ( Network = AMOY )

create-presale

# Call this api to see presale created or not

http://localhost:3000/api/presales

# Call this api to create stages for given presale time

http://localhost:3000/api/stages/create-test-stages

# 5. Add Supported USDT and USDC tokens and Ethereum Wert Relayers

npx hardhat run scripts/add-supported-tokens.ts --network bsctest
npx hardhat run scripts/add-supported-tokens.ts --network sepolia -> [comment out the multiple transactions and run one at a time]
npx hardhat run scripts/add-supported-tokens.ts --network amoy

npx hardhat run scripts/add-wert-relayers.ts --network sepolia -> [comment out the multiple transactions and run one at a time]

## For Contract Verifications

Replace <DEPLOYER_ADDRESS> with your deployer/master/signature wallet.

### Sepolia

- PresaleManager (no constructor args):

```
npx hardhat verify --network sepolia 0xB2D956cf52f84f8262d802E44041A4561b8817F7
```

- TokenClaim (constructor: PresaleManager address):

```
npx hardhat verify --network sepolia 0x2D23d14622C7f7B47a684Fbc92e4Dcc7Ac29148E 0xB2D956cf52f84f8262d802E44041A4561b8817F7
```

- PaymentReceiver (constructor: owner, chainId string, masterWallet, minPurchaseWei, nativePriceFeed, trustedSigner):

```
npx hardhat verify --network sepolia 0x412bf323E3e37bBbE72c8ccC2649DD1147efA486 <DEPLOYER_ADDRESS> 11155111 <DEPLOYER_ADDRESS> 10000000000000 0x694AA1769357215DE4FAC081bf1f309aDC325306 <DEPLOYER_ADDRESS>
```

- TokenStaking (constructor: endpointV2, owner, chainId string, trustedSigner):

```
npx hardhat verify --network sepolia 0xa21b9f89310C1ff35d15829d6213BAf7eB66B253 0x6EDCE65403992e310A62460808c4b910D972f10f <DEPLOYER_ADDRESS> 97 <DEPLOYER_ADDRESS>
```

- MetUserState (constructor: endpointV2, owner):

```
npx hardhat verify --network sepolia 0x3d8eD9A664eb35Fc992e46944B644801881CeBF6 0x6EDCE65403992e310A62460808c4b910D972f10f <DEPLOYER_ADDRESS>
```

### Polygon Amoy

- PaymentReceiver:

```
npx hardhat verify --network amoy 0xc4B13e53338ce4AD076BB43BaEb6fA83A83dFaC0 <DEPLOYER_ADDRESS> 80002 <DEPLOYER_ADDRESS> 10000000000000 0x001382149eBa3441043c1c66972b4772963f5D43 <DEPLOYER_ADDRESS>
```

- TokenStaking:

```
npx hardhat verify --network amoy 0x8945a70Cc8a7C3bD4e51c1B7c748A64e87C9c31b 0x6EDCE65403992e310A62460808c4b910D972f10f <DEPLOYER_ADDRESS> 80002 <DEPLOYER_ADDRESS>
```

### BSC Testnet

- PaymentReceiver:

```
npx hardhat verify --network bsctest 0x32C69d8033Ada8706DCA043b97d1993AFcC88d97 <DEPLOYER_ADDRESS> 97 <DEPLOYER_ADDRESS> 10000000000000 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526 <DEPLOYER_ADDRESS>
```

- TokenStaking:

```
npx hardhat verify --network bsctest 0x03aF1e9E21929BD6740D44932385BE1Bc30aBEF2 0x6EDCE65403992e310A62460808c4b910D972f10f <DEPLOYER_ADDRESS> 97 <DEPLOYER_ADDRESS>
```

# 6. Testcases run

pnpm run compile:hardhat

pnpm run test:hardhat test/file_name.test.ts
