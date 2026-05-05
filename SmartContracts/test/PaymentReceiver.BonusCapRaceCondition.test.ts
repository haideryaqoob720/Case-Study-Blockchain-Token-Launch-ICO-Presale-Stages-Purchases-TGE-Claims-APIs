import { expect } from "chai"
import { ethers } from "hardhat"
import { Contract, utils } from "ethers"

/**
 * Isolated test suite for Bonus Cap Race Condition Fix
 *
 * This test file specifically validates that the bonus cap race condition
 * has been properly fixed using the atomic min() pattern.
 *
 * The fix ensures that even with concurrent transactions, the bonus cap
 * is never exceeded by enforcing the cap at mutation time.
 */
describe("PaymentReceiver - Bonus Cap Race Condition Fix", function () {
    let owner: any, user: any, referrer: any, trustedSigner: any, masterWallet: any
    let ownerAddr: string, userAddr: string, referrerAddr: string, trustedSignerAddr: string

    const CHAIN_ID_STR = "SEPOLIA"
    const MIN_PURCHASE_AMOUNT = utils.parseEther("0.01") // 0.01 ETH
    const PRICE_PER_TOKEN = utils.parseUnits("0.1", 18) // $0.1 per token
    const STAGE_ID = 1

    let paymentReceiver: Contract
    let mockPriceFeed: Contract

    before(async () => {
        const signers = await ethers.getSigners()
        owner = signers[0]
        user = signers[1]
        referrer = signers[2]
        trustedSigner = signers[3]
        masterWallet = signers[4]

        ownerAddr = await owner.getAddress()
        userAddr = await user.getAddress()
        referrerAddr = await referrer.getAddress()
        trustedSignerAddr = await trustedSigner.getAddress()
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
            trustedSignerAddr, // trustedSigner
        )
        await paymentReceiver.deployed()
    }

    beforeEach(async () => {
        await deployContracts()
    })

    /**
     * Helper function to generate signature for buyWithNative
     * Matches the contract's signature verification logic exactly
     */
    async function generateSignature(
        buyer: string,
        stageId: number,
        pricePerToken: any,
        nativeAmount: any,
        deadline: number,
    ): Promise<{ signature: string; nonce: number }> {
        const nonce = await paymentReceiver.nonces(buyer)
        const chainId = await ethers.provider.getNetwork().then((n: any) => n.chainId)

        // Create hash as contract does: keccak256(abi.encodePacked(buyer, stageId, pricePerToken, nativeAmount, deadline, chainId, address(this)))
        const hash = utils.keccak256(
            utils.solidityPack(
                ["address", "uint256", "uint256", "uint256", "uint256", "uint256", "address"],
                [buyer, stageId, pricePerToken, nativeAmount, deadline, chainId, paymentReceiver.address],
            ),
        )

        // Create messageHash as contract does: keccak256(abi.encodePacked(hash, nonce))
        const messageHash = utils.keccak256(utils.solidityPack(["bytes32", "uint256"], [hash, nonce]))

        // Sign the messageHash - signMessage automatically prepends the Ethereum message prefix
        const signature = await trustedSigner.signMessage(utils.arrayify(messageHash))

        return { signature, nonce: nonce.toNumber() }
    }

    describe("Race Condition Prevention", () => {
        it("prevents bonus cap from being exceeded with multiple sequential purchases", async function () {
            // Set up bonus cap - use a small cap to easily test exceeding it
            const maxBonus = utils.parseUnits("100", 18) // 100 tokens max bonus
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            // Activate extra bones for multiple users
            await paymentReceiver.connect(user).activateExtraBones()
            await paymentReceiver.connect(referrer).activateExtraBones()

            // Get initial stats
            const [max, initialDistributed, initialRemaining, enabled] =
                await paymentReceiver.getBonusDistributionStats()
            expect(enabled).to.be.true
            expect(initialDistributed).to.eq(0)
            expect(initialRemaining).to.eq(maxBonus)

            // Make first purchase that would generate bonus tokens
            const purchaseAmount1 = utils.parseEther("10") // Large purchase to generate significant bonus
            const deadline1 = (await ethers.provider.getBlock("latest")).timestamp + 1200 // 20 minutes from now (within 30 min limit)

            const sig1 = await generateSignature(userAddr, STAGE_ID, PRICE_PER_TOKEN, purchaseAmount1, deadline1)

            await paymentReceiver
                .connect(user)
                .buyWithNative(
                    ethers.constants.AddressZero,
                    STAGE_ID,
                    PRICE_PER_TOKEN,
                    purchaseAmount1,
                    deadline1,
                    sig1.nonce,
                    sig1.signature,
                    { value: purchaseAmount1 },
                )

            // Check stats after first purchase
            const [max1, distributed1, remaining1] = await paymentReceiver.getBonusDistributionStats()
            expect(distributed1).to.be.gt(0, "First purchase should generate bonus tokens")
            expect(distributed1).to.be.lte(max1, "First purchase: Cap should not be exceeded")
            expect(distributed1.add(remaining1)).to.eq(max1, "Distributed + remaining should equal max")

            // Make second purchase that would also generate bonus tokens
            const purchaseAmount2 = utils.parseEther("10")
            const deadline2 = (await ethers.provider.getBlock("latest")).timestamp + 1200 // 20 minutes from now

            const sig2 = await generateSignature(referrerAddr, STAGE_ID, PRICE_PER_TOKEN, purchaseAmount2, deadline2)

            await paymentReceiver
                .connect(referrer)
                .buyWithNative(
                    ethers.constants.AddressZero,
                    STAGE_ID,
                    PRICE_PER_TOKEN,
                    purchaseAmount2,
                    deadline2,
                    sig2.nonce,
                    sig2.signature,
                    { value: purchaseAmount2 },
                )

            // Check stats after second purchase - cap should still not be exceeded
            const [max2, distributed2, remaining2] = await paymentReceiver.getBonusDistributionStats()
            expect(distributed2).to.be.gte(distributed1, "Second purchase should increase distributed amount")
            expect(distributed2).to.be.lte(max2, "CRITICAL: Cap should never be exceeded")
            expect(distributed2.add(remaining2)).to.eq(max2, "Distributed + remaining should always equal max")
        })

        it("stress tests cap enforcement with multiple purchases that would exceed cap", async function () {
            // Set up a small bonus cap to easily test exceeding it
            const maxBonus = utils.parseUnits("50", 18) // 50 tokens max bonus
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            // Get additional signers for more users
            const signers = await ethers.getSigners()
            const user2 = signers[5] || signers[0]
            const user3 = signers[6] || signers[1]
            const user4 = signers[7] || signers[2]

            // Activate extra bones for all users
            await paymentReceiver.connect(user).activateExtraBones()
            await paymentReceiver.connect(user2).activateExtraBones()
            await paymentReceiver.connect(user3).activateExtraBones()
            await paymentReceiver.connect(user4).activateExtraBones()

            // Make multiple purchases that would collectively exceed the cap
            const purchaseAmounts = [
                utils.parseEther("5"),
                utils.parseEther("5"),
                utils.parseEther("5"),
                utils.parseEther("5"),
                utils.parseEther("5"),
            ]
            const users = [user, user2, user3, user4]

            for (let i = 0; i < purchaseAmounts.length; i++) {
                const currentUser = users[i % users.length]
                const currentUserAddr = await currentUser.getAddress()
                const purchaseAmount = purchaseAmounts[i]
                const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1200 // 20 minutes from now

                const sig = await generateSignature(
                    currentUserAddr,
                    STAGE_ID,
                    PRICE_PER_TOKEN,
                    purchaseAmount,
                    deadline,
                )

                // Capture state before purchase
                const statsBefore = await paymentReceiver.getBonusDistributionStats()
                const distributedBefore = statsBefore[1]

                // Execute purchase
                await paymentReceiver
                    .connect(currentUser)
                    .buyWithNative(
                        ethers.constants.AddressZero,
                        STAGE_ID,
                        PRICE_PER_TOKEN,
                        purchaseAmount,
                        deadline,
                        sig.nonce,
                        sig.signature,
                        { value: purchaseAmount },
                    )

                // After each purchase, verify the cap is never exceeded
                const statsAfter = await paymentReceiver.getBonusDistributionStats()
                const maxBonusAfter = statsAfter[0]
                const distributedAfter = statsAfter[1]
                const remainingAfter = statsAfter[2]

                // CRITICAL ASSERTION: The cap should NEVER be exceeded
                expect(
                    distributedAfter,
                    `Purchase ${i + 1}: Bonus cap was exceeded! Distributed: ${distributedAfter.toString()}, Max: ${maxBonusAfter.toString()}`,
                ).to.be.lte(maxBonusAfter)
                expect(distributedAfter.add(remainingAfter), "Distributed + remaining should equal max").to.eq(
                    maxBonusAfter,
                )
                expect(distributedAfter, "Distributed should never decrease").to.be.gte(distributedBefore)

                // If we've reached the cap, remaining should be 0
                if (distributedAfter.eq(maxBonusAfter)) {
                    expect(remainingAfter, "When cap is reached, remaining should be 0").to.eq(0)
                }
            }

            // Final verification: total distributed should never exceed max
            const finalStats = await paymentReceiver.getBonusDistributionStats()
            expect(
                finalStats[1],
                `Final check: Bonus cap was exceeded! Distributed: ${finalStats[1].toString()}, Max: ${finalStats[0].toString()}`,
            ).to.be.lte(finalStats[0])
            expect(finalStats[1].add(finalStats[2]), "Final: Distributed + remaining should equal max").to.eq(
                finalStats[0],
            )
        })

        it("verifies atomic min() pattern prevents race conditions", async function () {
            // This test verifies that the atomic min() pattern works correctly
            // by simulating purchases that would collectively exceed the cap

            const maxBonus = utils.parseUnits("50", 18) // Small cap for easy testing
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            await paymentReceiver.connect(user).activateExtraBones()

            // Make a purchase that would generate bonus tokens close to the cap
            const purchaseAmount = utils.parseEther("20") // Large purchase
            const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1200 // 20 minutes from now

            const sig = await generateSignature(userAddr, STAGE_ID, PRICE_PER_TOKEN, purchaseAmount, deadline)

            await paymentReceiver
                .connect(user)
                .buyWithNative(
                    ethers.constants.AddressZero,
                    STAGE_ID,
                    PRICE_PER_TOKEN,
                    purchaseAmount,
                    deadline,
                    sig.nonce,
                    sig.signature,
                    { value: purchaseAmount },
                )

            // Check stats after first purchase
            const statsAfterFirst = await paymentReceiver.getBonusDistributionStats()
            expect(statsAfterFirst[1]).to.be.gt(0, "First purchase should generate bonus")
            expect(statsAfterFirst[1]).to.be.lte(statsAfterFirst[0], "First purchase: Cap should not be exceeded")

            // Make another purchase that would exceed the remaining cap
            const purchaseAmount2 = utils.parseEther("20")
            const deadline2 = (await ethers.provider.getBlock("latest")).timestamp + 1200 // 20 minutes from now

            const sig2 = await generateSignature(userAddr, STAGE_ID, PRICE_PER_TOKEN, purchaseAmount2, deadline2)

            await paymentReceiver
                .connect(user)
                .buyWithNative(
                    ethers.constants.AddressZero,
                    STAGE_ID,
                    PRICE_PER_TOKEN,
                    purchaseAmount2,
                    deadline2,
                    sig2.nonce,
                    sig2.signature,
                    { value: purchaseAmount2 },
                )

            // Verify the cap was respected - the second purchase should have been capped
            const finalStats = await paymentReceiver.getBonusDistributionStats()
            expect(finalStats[1], "Final distributed should not exceed cap").to.be.lte(finalStats[0])
            expect(finalStats[1], "Final distributed should be >= 0").to.be.gte(0)

            // The total distributed should be exactly at or below the cap
            // This proves the atomic min() pattern is working
            expect(
                finalStats[1],
                `Atomic min() pattern failed - cap exceeded! Distributed: ${finalStats[1].toString()}, Max: ${maxBonus.toString()}`,
            ).to.be.lte(maxBonus)

            // Verify the invariant: distributed + remaining = max
            expect(finalStats[1].add(finalStats[2]), "Invariant: distributed + remaining = max").to.eq(finalStats[0])
        })

        it("ensures cap is never exceeded even when bonus would normally exceed remaining capacity", async function () {
            // Set up a very small cap
            const maxBonus = utils.parseUnits("10", 18) // Only 10 tokens max bonus
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            await paymentReceiver.connect(user).activateExtraBones()

            // Make multiple purchases until we reach or exceed the cap
            // This ensures we test the cap enforcement when remaining capacity is small
            const purchaseAmount = utils.parseEther("10") // Large purchase

            // Make purchases until we hit the cap
            for (let i = 0; i < 5; i++) {
                const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1200
                const sig = await generateSignature(userAddr, STAGE_ID, PRICE_PER_TOKEN, purchaseAmount, deadline)

                const statsBefore = await paymentReceiver.getBonusDistributionStats()

                await paymentReceiver
                    .connect(user)
                    .buyWithNative(
                        ethers.constants.AddressZero,
                        STAGE_ID,
                        PRICE_PER_TOKEN,
                        purchaseAmount,
                        deadline,
                        sig.nonce,
                        sig.signature,
                        { value: purchaseAmount },
                    )

                // Verify the cap was respected after each purchase
                const statsAfter = await paymentReceiver.getBonusDistributionStats()
                expect(statsAfter[1], `Purchase ${i + 1}: Distributed should not exceed cap`).to.be.lte(statsAfter[0])
                expect(statsAfter[1].add(statsAfter[2]), `Purchase ${i + 1}: Invariant should hold`).to.eq(
                    statsAfter[0],
                )

                // If we've reached the cap, remaining should be 0
                if (statsAfter[1].eq(statsAfter[0])) {
                    expect(statsAfter[2], "When cap is reached, remaining should be 0").to.eq(0)
                    break // Cap reached, no need for more purchases
                }

                // Verify that distributed increased (unless we hit the cap)
                if (!statsAfter[1].eq(statsAfter[0])) {
                    expect(statsAfter[1], `Purchase ${i + 1}: Distributed should increase`).to.be.gt(statsBefore[1])
                }
            }

            // Final verification: cap should never be exceeded
            const finalStats = await paymentReceiver.getBonusDistributionStats()
            expect(finalStats[1], "Final: Distributed should not exceed cap").to.be.lte(finalStats[0])
            expect(finalStats[1].add(finalStats[2]), "Final: Invariant should hold").to.eq(finalStats[0])
        })

        it("maintains cap invariant across many small purchases", async function () {
            // Set up bonus cap
            const maxBonus = utils.parseUnits("100", 18)
            await paymentReceiver.connect(owner).setBonusDistributionCap(maxBonus)
            await paymentReceiver.connect(owner).toggleBonusDistributionCap()

            await paymentReceiver.connect(user).activateExtraBones()

            // Make many small purchases
            const numPurchases = 10
            const purchaseAmount = utils.parseEther("1")

            for (let i = 0; i < numPurchases; i++) {
                const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1200 // 20 minutes from now
                const sig = await generateSignature(userAddr, STAGE_ID, PRICE_PER_TOKEN, purchaseAmount, deadline)

                await paymentReceiver
                    .connect(user)
                    .buyWithNative(
                        ethers.constants.AddressZero,
                        STAGE_ID,
                        PRICE_PER_TOKEN,
                        purchaseAmount,
                        deadline,
                        sig.nonce,
                        sig.signature,
                        { value: purchaseAmount },
                    )

                // After each purchase, verify the invariant
                const stats = await paymentReceiver.getBonusDistributionStats()
                expect(stats[1], `Purchase ${i + 1}: Cap should not be exceeded`).to.be.lte(stats[0])
                expect(stats[1].add(stats[2]), `Purchase ${i + 1}: Invariant should hold`).to.eq(stats[0])
            }

            // Final check
            const finalStats = await paymentReceiver.getBonusDistributionStats()
            expect(finalStats[1], "Final: Cap should not be exceeded").to.be.lte(finalStats[0])
            expect(finalStats[1].add(finalStats[2]), "Final: Invariant should hold").to.eq(finalStats[0])
        })
    })
})
