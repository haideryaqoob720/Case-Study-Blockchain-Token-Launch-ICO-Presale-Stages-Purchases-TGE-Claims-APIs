import { expect } from "chai"
import { ethers } from "hardhat"
import { Contract, utils } from "ethers"

describe("PaymentReceiver stablecoin pricing", function () {
    let owner: any
    let ownerAddr: string
    let masterWallet: any
    let paymentReceiver: Contract
    let mockPriceFeed: Contract

    const CHAIN_ID_STR = "SEPOLIA"
    const MIN_PURCHASE_AMOUNT = utils.parseEther("0.01")

    before(async () => {
        ;[owner, masterWallet] = await ethers.getSigners()
        ownerAddr = await owner.getAddress()
    })

    async function deployReceiver(): Promise<void> {
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed")
        mockPriceFeed = await MockPriceFeed.deploy()
        await mockPriceFeed.deployed()

        const PaymentReceiver = await ethers.getContractFactory("PaymentReceiver")
        paymentReceiver = await PaymentReceiver.deploy(
            ownerAddr,
            CHAIN_ID_STR,
            masterWallet.address,
            MIN_PURCHASE_AMOUNT,
            mockPriceFeed.address,
            ownerAddr, // trustedSigner (not used in these tests)
        )
        await paymentReceiver.deployed()
    }

    describe("stablecoin USD mapping", () => {
        beforeEach(async () => {
            await deployReceiver()
        })

        it("treats 6-decimal stablecoins as 1 USD per unit when feed is valid", async () => {
            // Mock USDC with 6 decimals
            const MockERC20 = await ethers.getContractFactory("MockERC20")
            const usdc = await MockERC20.deploy("USD Coin", "USDC", 6, utils.parseUnits("1000000", 6))
            await usdc.deployed()

            // Configure price feed to 1 USD (1e8 with 8 decimals)
            await mockPriceFeed.setPrice(1n * 10n ** 8n)

            // Mark as stable and support with Chainlink feed
            await paymentReceiver.connect(owner).setStableToken(usdc.address, true)
            await paymentReceiver
                .connect(owner)
                .setTokenSupport(usdc.address, true, utils.parseUnits("1", 6), mockPriceFeed.address)

            // 1 USDC (6 decimals)
            const oneUsdc = utils.parseUnits("1", 6)
            const usdValue = await paymentReceiver.getTokenUsdValue(usdc.address, oneUsdc)

            // Should be exactly 1e18 (1 USD with 18 decimals)
            expect(usdValue).to.equal(utils.parseUnits("1", 18))

            // 5 USDC
            const fiveUsdc = utils.parseUnits("5", 6)
            const usdValueFive = await paymentReceiver.getTokenUsdValue(usdc.address, fiveUsdc)
            expect(usdValueFive).to.equal(utils.parseUnits("5", 18))
        })

        it("treats 18-decimal stablecoins as 1 USD per unit when feed is valid", async () => {
            // Mock BNB-chain style USDT with 18 decimals
            const MockERC20 = await ethers.getContractFactory("MockERC20")
            const usdt18 = await MockERC20.deploy("Tether USD", "USDT", 18, utils.parseUnits("1000000", 18))
            await usdt18.deployed()

            // Configure price feed to 1 USD (1e8 with 8 decimals)
            await mockPriceFeed.setPrice(1n * 10n ** 8n)

            // Mark as stable and support with Chainlink feed
            await paymentReceiver.connect(owner).setStableToken(usdt18.address, true)
            await paymentReceiver
                .connect(owner)
                .setTokenSupport(usdt18.address, true, utils.parseUnits("1", 18), mockPriceFeed.address)

            const oneUsdt = utils.parseUnits("1", 18)
            const usdValue = await paymentReceiver.getTokenUsdValue(usdt18.address, oneUsdt)
            expect(usdValue).to.equal(utils.parseUnits("1", 18))
        })

        it("keeps Chainlink pricing for non-stable tokens", async () => {
            const MockERC20 = await ethers.getContractFactory("MockERC20")
            const volatileToken = await MockERC20.deploy("Volatile", "VOL", 18, utils.parseUnits("1000000", 18))
            await volatileToken.deployed()

            // Not marked as stable -> must provide a price feed
            await paymentReceiver
                .connect(owner)
                .setTokenSupport(volatileToken.address, true, utils.parseUnits("1", 18), mockPriceFeed.address)

            const oneVol = utils.parseUnits("1", 18)
            const usdPrice = await paymentReceiver.getTokenUsdPrice(volatileToken.address)
            const usdValue = await paymentReceiver.getTokenUsdValue(volatileToken.address, oneVol)

            expect(usdPrice).to.be.gt(0)
            expect(usdValue).to.be.gt(0)
        })

        it("falls back to 1 USD for stable tokens when price feed is stale", async () => {
            const MockERC20 = await ethers.getContractFactory("MockERC20")
            const usdc = await MockERC20.deploy("USD Coin", "USDC", 6, utils.parseUnits("1000000", 6))
            await usdc.deployed()

            await paymentReceiver.connect(owner).setStableToken(usdc.address, true)

            // Mark token as supported with a Chainlink feed
            await paymentReceiver
                .connect(owner)
                .setTokenSupport(usdc.address, true, utils.parseUnits("1", 6), mockPriceFeed.address)

            // Make the feed stale
            await mockPriceFeed.setStalePrice()

            // 1 USDC (6 decimals) should still be treated as 1 USD despite stale feed
            const oneUsdc = utils.parseUnits("1", 6)
            const usdValue = await paymentReceiver.getTokenUsdValue(usdc.address, oneUsdc)
            expect(usdValue).to.equal(utils.parseUnits("1", 18))
        })
    })
})
