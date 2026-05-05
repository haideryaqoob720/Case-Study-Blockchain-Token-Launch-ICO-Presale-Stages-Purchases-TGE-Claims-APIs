import { join } from "path"
import { existsSync, readFileSync, writeFileSync } from "fs"

interface DeploymentInfo {
    [key: string]: any
}

export async function loadDeploymentInfo(): Promise<DeploymentInfo> {
    const deploymentPath = join(__dirname, "", "deployment-info.json")

    if (existsSync(deploymentPath)) {
        return JSON.parse(readFileSync(deploymentPath, "utf8"))
    }

    return {}
}

export async function saveDeploymentInfo(info: DeploymentInfo) {
    const deploymentPath = join(__dirname, "", "deployment-info.json")
    writeFileSync(deploymentPath, JSON.stringify(info, null, 2))
}

// Chainlink Price Feed Addresses for Testnets and Mainnets
export const PRICE_FEEDS = {
    sepolia: {
        ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Sepolia ETH/USD
        USDT_USD: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", // Sepolia USDT/USD
        USDC_USD: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E", // Sepolia USDC/USD
    },
    bsctest: {
        BNB_USD: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526", // BSC Testnet BNB/USD
        USDT_USD: "0x90c069C4538adAc136E051052E14c1cD799C41B7", // BSC Testnet USDT/USD
        USDC_USD: "0x90c069C4538adAc136E051052E14c1cD799C41B7", // BSC Testnet USDC/USD (same as USDT)
    },
    amoy: {
        MATIC_USD: "0x001382149eBa3441043c1c66972b4772963f5D43", // Polygon Amoy MATIC/USD
        USDT_USD: "0x3aC23DcB4eCfcBd24579e1f34542524d0E4eDeA8", // Polygon Amoy USDT/USD
        USDC_USD: "0x1b8739bB4CdF0089d07097A9Ae5Bd274b29C6F16", // Polygon Amoy USDC/USD
    },
    ethereum: {
        ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // Ethereum Mainnet ETH/USD
        USDT_USD: "0x3E7d1eAB13AD0104d2750B8863B489D65364e32D", // Ethereum Mainnet USDT/USD
        USDC_USD: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", // Ethereum Mainnet USDC/USD
    },
    bsc: {
        BNB_USD: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE", // BSC Mainnet BNB/USD
        USDT_USD: "0xB97Ad0E74fa7d920791E90258A6E2085088b4320", // BSC Mainnet USDT/USD
        USDC_USD: "0x51597f405303C4377E36123cBc172b13269EA163", // BSC Mainnet USDC/USD
    },
    polygon: {
        MATIC_USD: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0", // Polygon Mainnet MATIC/USD
        USDT_USD: "0x0A6513e40db6EB1b165753AD52E63E3Dd1e1e4C8", // Polygon Mainnet USDT/USD
        USDC_USD: "0xfE4A8cc5b5B2366C1B58Bea3858E81843581b2F7", // Polygon Mainnet USDC/USD
    },
}
