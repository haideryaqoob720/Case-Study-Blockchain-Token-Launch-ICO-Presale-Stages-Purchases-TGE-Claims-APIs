# 0. clean the artifacts and recompile contract

npx hardhat clean && npx hardhat compile

# 1. Deploy Contracts

npx hardhat lz:deploy

# deploy MET Token Contract on (Ethereum Externally )

# Script Order

1. deploy-ethereum-mainnet
2. deploy-bsc-mainnet
3. deploy-polygon-mainnet

# 2. Wire and Configure Communication Channels (To establish trust and messaging rules)

npx hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# 3. Export Abis for backend and fronted

npm run export-abis

# 4. Run Backend First - Create a Presale ( Network = Ethereum )

create-presale-mainnet

# Call this api to see presale created or not

http://localhost:3000/api/presales

# Call this api to create stages for given presale time

http://localhost:3000/api/stages/create-test-stages

# 5. Add Supported USDT and USDC tokens

# For Ethereum Mainnet

npx hardhat run scripts/add-supported-tokens-mainnet.ts --network ethereum

# For BSC Mainnet

npx hardhat run scripts/add-supported-tokens-mainnet.ts --network bsc

# For Polygon Mainnet

npx hardhat run scripts/add-supported-tokens-mainnet.ts --network polygon

# 6. Add Ethereum Wert Relayers

npx hardhat run scripts/add-wert-relayers-mainnet.ts --network ethereum
