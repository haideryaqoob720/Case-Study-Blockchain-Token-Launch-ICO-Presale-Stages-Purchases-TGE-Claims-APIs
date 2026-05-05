import "dotenv/config"
import "hardhat-deploy"
import "hardhat-contract-sizer"
import "@nomiclabs/hardhat-ethers"
import "@nomicfoundation/hardhat-chai-matchers"
import "@nomicfoundation/hardhat-verify"
import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from "hardhat/types"

const PRIVATE_KEY = process.env.PRIVATE_KEY
const accounts: HttpNetworkAccountsUserConfig | undefined = PRIVATE_KEY ? [PRIVATE_KEY] : undefined

if (accounts == null) {
    console.warn("[Portfolio demo] PRIVATE_KEY not set - on-chain txs disabled.")
}

const config: HardhatUserConfig = {
    paths: {
        cache: "cache/hardhat",
    },
    solidity: {
        compilers: [
            {
                version: "0.8.22",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                    viaIR: true,
                },
            },
        ],
    },
    networks: {
        sepolia: {
            url: process.env.RPC_URL_SEPOLIA || "https://example.com",
            accounts,
            timeout: 60000,
        },
        bsctest: {
            url: process.env.BSC_RPC || "https://example.com",
            accounts,
            timeout: 60000,
        },
        amoy: {
            url: process.env.RPC_URL_AMOY || "https://example.com",
            accounts,
            timeout: 60000,
        },
        ethereum: {
            url: process.env.RPC_URL_ETHEREUM || "https://example.com",
            accounts,
            timeout: 60000,
        },
        bsc: {
            url: process.env.RPC_URL_BSC || "https://example.com",
            accounts,
            timeout: 60000,
        },
        polygon: {
            url: process.env.RPC_URL_POLYGON || "https://example.com",
            accounts,
            timeout: 120000,
        },
        hardhat: {
            allowUnlimitedContractSize: true,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY || "",
    },
}

export default config
