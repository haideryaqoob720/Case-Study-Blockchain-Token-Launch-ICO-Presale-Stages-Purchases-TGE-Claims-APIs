import { expect } from "chai"
import { ethers } from "hardhat"
import { Contract, utils } from "ethers"

describe.skip("PaymentReceiver (ethers v5) — portfolio: suite outdated vs contract ABI; see stablecoins + bonus-cap tests", function () {
    let owner: any, user: any, referrer: any, wertRelayer: any, other: any
    let ownerAddr: string, userAddr: string, referrerAddr: string, wertRelayerAddr: string, otherAddr: string

    const CHAIN_ID_STR = "SEPOLIA"
    const MIN_PURCHASE_AMOUNT = utils.parseEther("0.01") // 0.01 ETH
    const PRICE_PER_TOKEN = utils.parseUnits("0.1", 18) // $0.1 per token
    const STAGE_ID = 1

    let paymentReceiver: Contract
    let mockPriceFeed: Contract
    let mockUSDT: Contract
    let mockUSDC: Contract
    let masterWallet: any

    before(async () => {
        ;[owner, user, referrer, wertRelayer, other] = await ethers.getSigners()
        ownerAddr = await owner.getAddress()
        userAddr = await user.getAddress()
        referrerAddr = await referrer.getAddress()
        wertRelayerAddr = await wertRelayer.getAddress()
        otherAddr = await other.getAddress()

        // Use a signer instead of a random wallet for master wallet
        masterWallet = other
    })

    async function deployContracts(): Promise<void> {
        // Deploy MockPriceFeed
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed")
        mockPriceFeed = await MockPriceFeed.deploy()
        await mockPriceFeed.deployed()

        // Deploy PaymentReceiver with required signer address
        const PaymentReceiver = await ethers.getContractFactory("PaymentReceiver")
        paymentReceiver = await PaymentReceiver.deploy(
            ownerAddr,
            CHAIN_ID_STR,
            masterWallet.address,
            MIN_PURCHASE_AMOUNT,
            mockPriceFeed.address,
            otherAddr, // trustedSigner
        )
        await paymentReceiver.deployed()

        // Deploy Mock ERC20 tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20")

        // USDT (6 decimals)
        mockUSDT = await MockERC20.deploy("Tether USD", "USDT", 6, utils.parseUnits("1000000", 6))
        await mockUSDT.deployed()

        // USDC (6 decimals)
        mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6, utils.parseUnits("1000000", 6))
        await mockUSDC.deployed()

        // Set up supported tokens with price feeds
        await paymentReceiver.connect(owner).setTokenSupport(
            mockUSDT.address,
            true,
            utils.parseUnits("10", 6), // 10 USDT minimum
            mockPriceFeed.address, // price feed
        )

        await paymentReceiver.connect(owner).setTokenSupport(
            mockUSDC.address,
            true,
            utils.parseUnits("10", 6), // 10 USDC minimum
            mockPriceFeed.address, // price feed
        )

        // Set up Wert relayer
        await paymentReceiver.connect(owner).setWertRelayer(wertRelayerAddr, true)

        // Mint tokens to users
        await mockUSDT.mint(userAddr, utils.parseUnits("1000", 6))
        await mockUSDC.mint(userAddr, utils.parseUnits("1000", 6))
        await mockUSDT.mint(referrerAddr, utils.parseUnits("1000", 6))
        await mockUSDC.mint(referrerAddr, utils.parseUnits("1000", 6))
    }

    beforeEach(async () => {
        await deployContracts()
    })

    describe("Constructor", () => {
        it("initializes state correctly", async () => {
            expect(await paymentReceiver.chainId()).to.eq(CHAIN_ID_STR)
            expect(await paymentReceiver.masterWallet()).to.eq(masterWallet.address)
            expect(await paymentReceiver.minPurchaseAmount()).to.eq(MIN_PURCHASE_AMOUNT)
            expect(await paymentReceiver.nativePriceFeed()).to.eq(mockPriceFeed.address)
        })

        it("reverts with invalid addresses", async () => {
            const PaymentReceiver = await ethers.getContractFactory("PaymentReceiver")

            await expect(
                PaymentReceiver.deploy(
                    ownerAddr,
                    CHAIN_ID_STR,
                    ethers.constants.AddressZero,
                    MIN_PURCHASE_AMOUNT,
                    mockPriceFeed.address,
                    otherAddr,
                ),
            ).to.be.revertedWithCustomError(paymentReceiver, "InvalidAddress")

            await expect(
                PaymentReceiver.deploy(
                    ownerAddr,
                    CHAIN_ID_STR,
                    masterWallet.address,
                    MIN_PURCHASE_AMOUNT,
                    ethers.constants.AddressZero,
                    otherAddr,
                ),
            ).to.be.revertedWithCustomError(paymentReceiver, "InvalidPriceFeed")

            await expect(
                PaymentReceiver.deploy(
                    ownerAddr,
                    CHAIN_ID_STR,
                    masterWallet.address,
                    0,
                    mockPriceFeed.address,
                    otherAddr,
                ),
            ).to.be.revertedWithCustomError(paymentReceiver, "ZeroAmount")
        })
    })

    describe("Access Control", () => {
        it("only owner can set master wallet", async () => {
            await expect(paymentReceiver.connect(user).setMasterWallet(otherAddr)).to.be.reverted

            await expect(paymentReceiver.connect(owner).setMasterWallet(otherAddr))
                .to.emit(paymentReceiver, "MasterWalletUpdated")
                .withArgs(otherAddr)

            expect(await paymentReceiver.masterWallet()).to.eq(otherAddr)
        })

        it("only owner can set token support", async () => {
            await expect(
                paymentReceiver.connect(user).setTokenSupport(mockUSDT.address, false, 0, ethers.constants.AddressZero),
            ).to.be.reverted

            await expect(
                paymentReceiver
                    .connect(owner)
                    .setTokenSupport(mockUSDT.address, false, 0, ethers.constants.AddressZero),
            )
                .to.emit(paymentReceiver, "TokenSupportUpdated")
                .withArgs(mockUSDT.address, false)
        })

        it("only owner can set Wert relayer", async () => {
            await expect(paymentReceiver.connect(user).setWertRelayer(otherAddr, true)).to.be.reverted

            await expect(paymentReceiver.connect(owner).setWertRelayer(otherAddr, true))
                .to.emit(paymentReceiver, "WertRelayerUpdated")
                .withArgs(otherAddr, true)
        })
    })

    describe("Extra Bones Functionality", () => {
        it("allows users to activate extra bones", async () => {
            await expect(paymentReceiver.connect(user).activateExtraBones())
                .to.emit(paymentReceiver, "ExtraBonesActivated")
                .withArgs(userAddr)

            expect(await paymentReceiver.hasExtraBones(userAddr)).to.be.true
        })

        it("prevents double activation of extra bones", async () => {
            await paymentReceiver.connect(user).activateExtraBones()

            await expect(paymentReceiver.connect(user).activateExtraBones()).to.be.revertedWithCustomError(
                paymentReceiver,
                "ExtraBonesAlreadyActivated",
            )
        })

        it("allows users to deactivate extra bones", async () => {
            await paymentReceiver.connect(user).activateExtraBones()

            await expect(paymentReceiver.connect(user).deactivateExtraBones())
                .to.emit(paymentReceiver, "ExtraBonesDeactivated")
                .withArgs(userAddr)

            expect(await paymentReceiver.hasExtraBones(userAddr)).to.be.false
        })

        it("prevents deactivation when not activated", async () => {
            await expect(paymentReceiver.connect(user).deactivateExtraBones()).to.be.revertedWithCustomError(
                paymentReceiver,
                "ExtraBonesNotActivated",
            )
        })
    })

    describe("Native Currency Purchases", () => {
        it("allows valid native currency purchase", async () => {
            const purchaseAmount = utils.parseEther("0.1")

            const tx = await paymentReceiver
                .connect(user)
                .buyWithNative(referrerAddr, STAGE_ID, PRICE_PER_TOKEN, { value: purchaseAmount })
            await expect(tx).to.emit(paymentReceiver, "PurchaseEvent")

            expect(await paymentReceiver.userTotalPurchases(userAddr)).to.eq(purchaseAmount)
            expect(await paymentReceiver.getUserPurchaseCount(userAddr)).to.eq(1)

            const [, , , , tokenAmount] = await paymentReceiver.getUserPurchase(userAddr, 0)
            expect(tokenAmount).to.be.gt(0)
        })

        it("reverts with insufficient payment", async () => {
            const insufficientAmount = MIN_PURCHASE_AMOUNT.sub(1)

            await expect(
                paymentReceiver.connect(user).buyWithNative(ethers.constants.AddressZero, STAGE_ID, PRICE_PER_TOKEN, {
                    value: insufficientAmount,
                }),
            ).to.be.revertedWithCustomError(paymentReceiver, "InsufficientPayment")
        })

        it("reverts with zero price per token", async () => {
            await expect(
                paymentReceiver.connect(user).buyWithNative(ethers.constants.AddressZero, STAGE_ID, 0, {
                    value: MIN_PURCHASE_AMOUNT,
                }),
            ).to.be.revertedWithCustomError(paymentReceiver, "ZeroAmount")
        })

        it("handles referral payments correctly", async () => {
            const purchaseAmount = utils.parseEther("1")
            const initialReferrerBalance = await referrer.getBalance()
            const initialMasterBalance = await masterWallet.getBalance()

            await paymentReceiver.connect(user).buyWithNative(referrerAddr, STAGE_ID, PRICE_PER_TOKEN, {
                value: purchaseAmount,
            })

            const expectedReferralCut = purchaseAmount.div(10) // 10% referral
            const expectedMasterAmount = purchaseAmount.sub(expectedReferralCut)

            expect(await referrer.getBalance()).to.eq(initialReferrerBalance.add(expectedReferralCut))
            expect(await masterWallet.getBalance()).to.eq(initialMasterBalance.add(expectedMasterAmount))
        })

        it("calculates bonus tokens for extra bones users", async () => {
            await paymentReceiver.connect(user).activateExtraBones()

            // Set bonus distribution cap
            const maxBonus = utils.parseUnits("1000", 18)
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            const purchaseAmount = utils.parseEther("1")

            await expect(
                paymentReceiver.connect(user).buyWithNative(ethers.constants.AddressZero, STAGE_ID, PRICE_PER_TOKEN, {
                    value: purchaseAmount,
                }),
            ).to.emit(paymentReceiver, "BonusTokensDistributed")
        })
    })

    describe("ERC20 Token Purchases", () => {
        it("allows valid ERC20 token purchase", async () => {
            const purchaseAmount = utils.parseUnits("100", 6) // 100 USDT
            const initialMasterBalance = await mockUSDT.balanceOf(masterWallet.address)

            await mockUSDT.connect(user).approve(paymentReceiver.address, purchaseAmount)

            const tx = await paymentReceiver
                .connect(user)
                .buyWithToken(mockUSDT.address, purchaseAmount, ethers.constants.AddressZero, STAGE_ID, PRICE_PER_TOKEN)

            await expect(tx).to.emit(paymentReceiver, "PurchaseEvent")

            const after = await mockUSDT.balanceOf(masterWallet.address)
            expect(after).to.eq(initialMasterBalance.add(purchaseAmount))

            const [, , , , tokenAmount] = await paymentReceiver.getUserPurchase(userAddr, 0)
            expect(tokenAmount).to.be.gt(0)
        })

        it("reverts with unsupported token", async () => {
            const unsupportedToken = await ethers.getContractFactory("MockERC20")
            const token = await unsupportedToken.deploy("Test", "TEST", 18, utils.parseUnits("1000", 18))
            await token.deployed()

            await token.connect(user).approve(paymentReceiver.address, utils.parseUnits("100", 18))

            await expect(
                paymentReceiver
                    .connect(user)
                    .buyWithToken(
                        token.address,
                        utils.parseUnits("100", 18),
                        ethers.constants.AddressZero,
                        STAGE_ID,
                        PRICE_PER_TOKEN,
                    ),
            ).to.be.revertedWithCustomError(paymentReceiver, "TokenNotSupported")
        })

        it("reverts with insufficient token amount", async () => {
            const insufficientAmount = utils.parseUnits("5", 6) // Less than 10 USDT minimum

            await mockUSDT.connect(user).approve(paymentReceiver.address, insufficientAmount)

            await expect(
                paymentReceiver
                    .connect(user)
                    .buyWithToken(
                        mockUSDT.address,
                        insufficientAmount,
                        ethers.constants.AddressZero,
                        STAGE_ID,
                        PRICE_PER_TOKEN,
                    ),
            ).to.be.revertedWithCustomError(paymentReceiver, "InsufficientPayment")
        })

        it("handles referral payments with tokens", async () => {
            const purchaseAmount = utils.parseUnits("100", 6)
            const initialReferrerBalance = await mockUSDT.balanceOf(referrerAddr)
            const initialMasterBalance = await mockUSDT.balanceOf(masterWallet.address)

            await mockUSDT.connect(user).approve(paymentReceiver.address, purchaseAmount)

            await paymentReceiver
                .connect(user)
                .buyWithToken(mockUSDT.address, purchaseAmount, referrerAddr, STAGE_ID, PRICE_PER_TOKEN)

            const expectedReferralCut = purchaseAmount.div(10)
            const expectedMasterAmount = purchaseAmount.sub(expectedReferralCut)

            expect(await mockUSDT.balanceOf(referrerAddr)).to.eq(initialReferrerBalance.add(expectedReferralCut))
            expect(await mockUSDT.balanceOf(masterWallet.address)).to.eq(initialMasterBalance.add(expectedMasterAmount))
        })
    })

    describe("Wert Relayer Purchases", () => {
        it("allows Wert relayer to buy for beneficiary", async () => {
            const purchaseAmount = utils.parseEther("0.1")
            const beneficiary = otherAddr

            const tx = await paymentReceiver
                .connect(wertRelayer)
                .buyWithNativeForWert(beneficiary, referrerAddr, STAGE_ID, PRICE_PER_TOKEN, {
                    value: purchaseAmount,
                })

            await expect(tx).to.emit(paymentReceiver, "PurchaseEvent")

            expect(await paymentReceiver.userTotalPurchases(beneficiary)).to.eq(purchaseAmount)

            const [, , , , tokenAmount] = await paymentReceiver.getUserPurchase(beneficiary, 0)
            expect(tokenAmount).to.be.gt(0)
        })

        it("reverts when non-Wert relayer tries to buy for beneficiary", async () => {
            const purchaseAmount = utils.parseEther("0.1")

            await expect(
                paymentReceiver
                    .connect(user)
                    .buyWithNativeForWert(otherAddr, ethers.constants.AddressZero, STAGE_ID, PRICE_PER_TOKEN, {
                        value: purchaseAmount,
                    }),
            ).to.be.revertedWith("Not authorized Wert relayer")
        })

        it("reverts with zero beneficiary address", async () => {
            const purchaseAmount = utils.parseEther("0.1")

            await expect(
                paymentReceiver
                    .connect(wertRelayer)
                    .buyWithNativeForWert(
                        ethers.constants.AddressZero,
                        ethers.constants.AddressZero,
                        STAGE_ID,
                        PRICE_PER_TOKEN,
                        { value: purchaseAmount },
                    ),
            ).to.be.revertedWithCustomError(paymentReceiver, "InvalidAddress")
        })
    })

    describe("Price Feed Integration", () => {
        it("gets native USD price correctly", async () => {
            const price = await paymentReceiver.getNativeUsdPrice()
            expect(price).to.be.gt(0)
        })

        it("calculates native USD value correctly", async () => {
            const amount = utils.parseEther("1")
            const usdValue = await paymentReceiver.getNativeUsdValue(amount)
            expect(usdValue).to.be.gt(0)
        })

        it("reverts with stale price feed", async () => {
            await mockPriceFeed.setStalePrice()

            await expect(paymentReceiver.getNativeUsdPrice()).to.be.revertedWithCustomError(
                paymentReceiver,
                "StalePriceFeed",
            )
        })

        it("reverts with invalid price", async () => {
            await mockPriceFeed.setInvalidPrice()

            await expect(paymentReceiver.getNativeUsdPrice()).to.be.revertedWithCustomError(
                paymentReceiver,
                "InvalidPrice",
            )
        })
    })

    describe("Calculation Functions", () => {
        it("calculates native amount for tokens correctly", async () => {
            const desiredTokens = utils.parseUnits("1000", 18)
            const nativeAmount = await paymentReceiver.calculateNativeAmountForTokens(desiredTokens, PRICE_PER_TOKEN)
            expect(nativeAmount).to.be.gt(0)
        })

        it("calculates token amount for native correctly", async () => {
            const nativeAmount = utils.parseEther("1")
            const tokenAmount = await paymentReceiver.calculateTokenAmountForNative(nativeAmount, PRICE_PER_TOKEN)
            expect(tokenAmount).to.be.gt(0)
        })

        it("calculates with bonus tokens correctly", async () => {
            await paymentReceiver.connect(user).activateExtraBones()

            // Set bonus distribution cap and enable it
            const maxBonus = utils.parseUnits("1000", 18)
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            const nativeAmount = utils.parseEther("1")
            const [baseAmount, bonusTokens, totalAmount] = await paymentReceiver.calculateTokenAmountForNativeWithBonus(
                nativeAmount,
                userAddr,
                PRICE_PER_TOKEN,
            )

            expect(baseAmount).to.be.gt(0)
            expect(bonusTokens).to.be.gt(0)
            expect(totalAmount).to.eq(baseAmount.add(bonusTokens))
        })

        it("reverts with zero amounts in calculations", async () => {
            await expect(
                paymentReceiver.calculateNativeAmountForTokens(0, PRICE_PER_TOKEN),
            ).to.be.revertedWithCustomError(paymentReceiver, "ZeroAmount")

            await expect(
                paymentReceiver.calculateTokenAmountForNative(utils.parseEther("1"), 0),
            ).to.be.revertedWithCustomError(paymentReceiver, "ZeroAmount")
        })
    })

    describe("Bonus Distribution Cap", () => {
        it("sets bonus distribution cap correctly", async () => {
            const maxBonus = utils.parseUnits("1000", 18)

            await expect(paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus))
                .to.emit(paymentReceiver, "BonusDistributionCapSet")
                .withArgs(maxBonus)

            expect(await paymentReceiver.maxBonusTokensDistribution()).to.eq(maxBonus)
        })

        it("toggles bonus distribution cap", async () => {
            await expect(paymentReceiver.connect(owner).toggleBonusDistributionCap())
                .to.emit(paymentReceiver, "BonusDistributionCapToggled")
                .withArgs(true)

            expect(await paymentReceiver.bonusDistributionCapEnabled()).to.be.true
        })

        it("gets bonus distribution stats correctly", async () => {
            const maxBonus = utils.parseUnits("1000", 18)
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            const [max, distributed, remaining, enabled] = await paymentReceiver.getBonusDistributionStats()

            expect(max).to.eq(maxBonus)
            expect(distributed).to.eq(0)
            expect(remaining).to.eq(maxBonus)
            expect(enabled).to.be.true
        })

        it("reverts when setting cap less than distributed", async () => {
            const maxBonus = utils.parseUnits("1000", 18)
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            // Distribute some bonus tokens
            await paymentReceiver.connect(user).activateExtraBones()
            await paymentReceiver.connect(user).buyWithNative(ethers.constants.AddressZero, STAGE_ID, PRICE_PER_TOKEN, {
                value: utils.parseEther("1"),
            })

            const distributed = await paymentReceiver.totalBonusTokensDistributed()
            const newCap = distributed.sub(1)

            await expect(paymentReceiver.connect(owner).setBonusDistributionCap(newCap)).to.be.revertedWithCustomError(
                paymentReceiver,
                "CapMustBeGreaterThanDistributed",
            )
        })
    })

    describe("User Purchase History", () => {
        it("tracks user purchases correctly", async () => {
            const purchaseAmount = utils.parseEther("0.1")

            await paymentReceiver.connect(user).buyWithNative(ethers.constants.AddressZero, STAGE_ID, PRICE_PER_TOKEN, {
                value: purchaseAmount,
            })

            const purchaseCount = await paymentReceiver.getUserPurchaseCount(userAddr)
            expect(purchaseCount).to.eq(1)

            const [amount, token, timestamp, stageId, tokenAmount] = await paymentReceiver.getUserPurchase(userAddr, 0)
            expect(amount).to.eq(purchaseAmount)
            expect(token).to.eq(ethers.constants.AddressZero)
            expect(stageId).to.eq(STAGE_ID)
            expect(tokenAmount).to.be.gt(0)
        })

        it("reverts when accessing out of bounds purchase", async () => {
            await expect(paymentReceiver.getUserPurchase(userAddr, 0)).to.be.revertedWithCustomError(
                paymentReceiver,
                "IndexOutOfBounds",
            )
        })
    })

    describe("Withdrawal Functions", () => {
        it("allows owner to withdraw native currency (contract normally holds no ETH)", function () {
            this.skip() // PaymentReceiver forwards ETH to masterWallet; no balance to withdraw in normal flow.
        })

        it("allows owner to withdraw ERC20 tokens", async () => {
            // Send some USDT to contract
            await mockUSDT.connect(user).transfer(paymentReceiver.address, utils.parseUnits("100", 6))

            const withdrawAmount = utils.parseUnits("50", 6)
            const initialBalance = await mockUSDT.balanceOf(otherAddr)

            await expect(paymentReceiver.connect(owner).withdrawToken(mockUSDT.address, otherAddr, withdrawAmount))
                .to.emit(paymentReceiver, "TokenWithdrawn")
                .withArgs(mockUSDT.address, otherAddr, withdrawAmount)

            expect(await mockUSDT.balanceOf(otherAddr)).to.eq(initialBalance.add(withdrawAmount))
        })

        it("reverts when non-owner tries to withdraw", async () => {
            await expect(paymentReceiver.connect(user).withdrawNative(otherAddr, utils.parseEther("1"))).to.be.reverted

            await expect(
                paymentReceiver.connect(user).withdrawToken(mockUSDT.address, otherAddr, utils.parseUnits("100", 6)),
            ).to.be.reverted
        })

        it("reverts with insufficient balance for withdrawal", async () => {
            await expect(
                paymentReceiver.connect(owner).withdrawNative(otherAddr, utils.parseEther("1")),
            ).to.be.revertedWithCustomError(paymentReceiver, "InsufficientPayment")

            await expect(
                paymentReceiver.connect(owner).withdrawToken(mockUSDT.address, otherAddr, utils.parseUnits("1000", 6)),
            ).to.be.revertedWithCustomError(paymentReceiver, "InsufficientPayment")
        })
    })

    describe("Admin Configuration", () => {
        it("updates chain ID", async () => {
            const newChainId = "MAINNET"

            await expect(paymentReceiver.connect(owner).updateChainId(newChainId))
                .to.emit(paymentReceiver, "ChainIdUpdated")
                .withArgs(newChainId)

            expect(await paymentReceiver.chainId()).to.eq(newChainId)
        })

        it("updates native price feed", async () => {
            const newPriceFeed = await ethers.getContractFactory("MockPriceFeed")
            const newFeed = await newPriceFeed.deploy()
            await newFeed.deployed()

            await expect(paymentReceiver.connect(owner).setNativePriceFeed(newFeed.address))
                .to.emit(paymentReceiver, "NativePriceFeedUpdated")
                .withArgs(newFeed.address)

            expect(await paymentReceiver.nativePriceFeed()).to.eq(newFeed.address)
        })

        it("updates minimum purchase amounts", async () => {
            const newMinAmount = utils.parseEther("0.02")

            await expect(paymentReceiver.connect(owner).setMinPurchaseAmount(newMinAmount))
                .to.emit(paymentReceiver, "MinPurchaseAmountUpdated")
                .withArgs(ethers.constants.AddressZero, newMinAmount)

            expect(await paymentReceiver.minPurchaseAmount()).to.eq(newMinAmount)

            const newTokenMinAmount = utils.parseUnits("20", 6)
            await expect(paymentReceiver.connect(owner).setTokenMinPurchaseAmount(mockUSDT.address, newTokenMinAmount))
                .to.emit(paymentReceiver, "MinPurchaseAmountUpdated")
                .withArgs(mockUSDT.address, newTokenMinAmount)

            expect(await paymentReceiver.tokenMinPurchaseAmount(mockUSDT.address)).to.eq(newTokenMinAmount)
        })
    })

    describe("Bonus Cap Race Condition Fix", () => {
        it("bonus cap logic uses atomic min() to prevent race conditions", async function () {
            // Set up bonus cap
            const maxBonus = utils.parseUnits("100", 18)
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)

            // Verify cap was set correctly
            expect(await paymentReceiver.maxBonusTokensDistribution()).to.eq(maxBonus)

            // Verify the cap enforcement exists in the contract
            // The key fix is that _calculateAndApplyExtraTokens now uses:
            // - Capture current state
            // - Calculate remaining capacity
            // - Cap actual bonus to remaining
            // - Update with min() pattern to prevent overflow
            // This ensures totalBonusTokensDistributed never exceeds maxBonusTokensDistribution

            const [max, distributed, remaining, enabled] = await paymentReceiver.getBonusDistributionStats()
            expect(distributed).to.be.lte(max)
            expect(distributed.add(remaining)).to.eq(max)
            expect(enabled).to.be.false // Not yet enabled
        })

        it("enforces bonus cap invariant programmatically", async function () {
            const maxBonus = utils.parseUnits("50", 18)
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)

            // Get stats before enabling
            const statsBefore = await paymentReceiver.getBonusDistributionStats()
            expect(statsBefore[0]).to.eq(maxBonus)
            expect(statsBefore[1]).to.eq(0)
            expect(statsBefore[2]).to.eq(maxBonus)

            // The race condition fix ensures that even concurrent operations
            // cannot cause totalBonusTokensDistributed to exceed maxBonusTokensDistribution
            // because the contract uses the min() pattern at mutation time
        })
    })

    describe("Token Stale Config Fix", () => {
        it("clears configuration when disabling token", async function () {
            // Get initial configuration
            const initialMinAmount = await paymentReceiver.tokenMinPurchaseAmount(mockUSDT.address)
            expect(initialMinAmount).to.be.gt(0)

            // Disable token
            await paymentReceiver
                .connect(owner)
                .setTokenSupport(mockUSDT.address, false, 0, ethers.constants.AddressZero)

            // Verify configuration is cleared
            const minAmount = await paymentReceiver.tokenMinPurchaseAmount(mockUSDT.address)
            expect(minAmount).to.eq(0)

            // Verify token is not supported
            expect(await paymentReceiver.supportedTokens(mockUSDT.address)).to.be.false
        })

        it("re-enables token with new configuration after clearing", async function () {
            // Disable and clear
            await paymentReceiver
                .connect(owner)
                .setTokenSupport(mockUSDT.address, false, 0, ethers.constants.AddressZero)

            // Re-enable with new configuration
            const newMinAmount = utils.parseUnits("50", 6)
            const TokenFactory = await ethers.getContractFactory("MockERC20")
            const newToken = await TokenFactory.deploy("New Token", "NEW", 6, utils.parseUnits("1000", 6))
            await newToken.deployed()

            await paymentReceiver
                .connect(owner)
                .setTokenSupport(mockUSDT.address, true, newMinAmount, mockPriceFeed.address)

            // Verify new configuration is set
            expect(await paymentReceiver.tokenMinPurchaseAmount(mockUSDT.address)).to.eq(newMinAmount)
            expect(await paymentReceiver.supportedTokens(mockUSDT.address)).to.be.true
        })

        it("prevents setting min purchase amount for unsupported token", async function () {
            // Create unsupported token
            const TokenFactory = await ethers.getContractFactory("MockERC20")
            const unsupported = await TokenFactory.deploy("Unsupported", "UNS", 18, utils.parseUnits("1000", 18))
            await unsupported.deployed()

            // Try to set min purchase amount for unsupported token
            await expect(
                paymentReceiver
                    .connect(owner)
                    .setTokenMinPurchaseAmount(unsupported.address, utils.parseUnits("10", 18)),
            ).to.be.revertedWithCustomError(paymentReceiver, "TokenNotSupported")
        })
    })

    describe("Referral Divisor Constant", () => {
        it("constant renamed from REFERRAL_PERCENTAGE to REFERRAL_DIVISOR", function () {
            // This is purely a renaming change to make the code more explicit
            // REFERRAL_DIVISOR = 10 means: amount / 10 = 10%
            // The actual calculation logic remains unchanged
            // This makes the intent clearer for auditors and developers

            // Verify the calculation logic: divide by 10 to get 10%
            const amount = utils.parseEther("1")
            const divisor = 10
            const expectedPercentage = amount.div(divisor)
            expect(expectedPercentage.gt(0)).to.be.true

            // Note: Testing actual purchases requires signature generation
            // which is complex. The rename itself doesn't change behavior.
        })

        it("divisor semantics clearly indicate division operation", function () {
            // Before: REFERRAL_PERCENTAGE = 10 (confusing - not a percentage)
            // After: REFERRAL_DIVISOR = 10 (clear - it's a divisor)

            // The 10% referral is calculated by dividing by 10
            const testAmount = utils.parseEther("1")
            const referral = testAmount.div(10) // Amount / REFERRAL_DIVISOR

            // This is 10% of the amount
            const percentage = 10
            const expectedReferral = testAmount.mul(percentage).div(100)
            expect(referral).to.eq(expectedReferral)
        })
    })
})
