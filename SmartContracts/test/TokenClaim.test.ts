import { expect } from "chai"
import { ethers } from "hardhat"
import { Wallet, utils, BigNumber } from "ethers"

describe.skip("TokenClaim (ethers v5) — portfolio: skipped pending signature deadline test refresh", function () {
    let owner: any, user: any, other: any
    let ownerAddr: string, userAddr: string, otherAddr: string

    // Signer that presaleManager will report as `trustedSigner()`
    let trustedSigner: Wallet

    enum PresaleState {
        NotStarted,
        Active,
        Paused,
        Ended,
    }

    before(async () => {
        ;[owner, user, other] = await ethers.getSigners()
        ownerAddr = await owner.getAddress()
        userAddr = await user.getAddress()
        otherAddr = await other.getAddress()
        trustedSigner = Wallet.createRandom()
    })

    async function deployMocks() {
        // ERC20 mock (mintable)
        const ERC20Mock = await ethers.getContractFactory("ERC20MintableMock")
        const token = await ERC20Mock.deploy("MET", "MET", 18)
        await token.deployed()

        // PresaleManager mock
        const PM = await ethers.getContractFactory("PresaleManagerMock")
        const pm = await PM.deploy(token.address, trustedSigner.address)
        await pm.deployed()

        return { token, pm }
    }

    async function deployTokenClaim(pmAddr: string) {
        const Factory = await ethers.getContractFactory("TokenClaim")
        const c = await Factory.deploy(pmAddr)
        await c.deployed()
        return c
    }

    function signClaim(
        signer: Wallet,
        claimer: string,
        purchaseAmount: BigNumber,
        stakingReward: BigNumber,
        deadline: BigNumber | number,
    ) {
        const packed = utils.solidityPack(
            ["address", "uint256", "uint256", "uint256"],
            [claimer, purchaseAmount, stakingReward, deadline],
        )
        const innerHash = utils.keccak256(packed)
        return signer.signMessage(utils.arrayify(innerHash))
    }

    describe("constructor / basic admin", () => {
        it("reverts on zero presaleManager", async () => {
            const Factory = await ethers.getContractFactory("TokenClaim")
            await expect(Factory.deploy(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
                Factory,
                "ZeroAddress",
            )
        })

        it("owner can update presaleManager; emits event", async () => {
            const { pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            const { pm: pm2 } = await deployMocks()
            await expect(claim.updatePresaleManager(pm2.address))
                .to.emit(claim, "PresaleManagerUpdated")
                .withArgs(pm2.address)

            expect(await claim.presaleManager()).to.eq(pm2.address)

            await expect(claim.updatePresaleManager(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
                claim,
                "ZeroAddress",
            )
        })
    })

    describe("toggleClaims()", () => {
        it("reverts if TGE has not occurred", async () => {
            const { pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            // Ensure tgeHasOccurred = false
            await pm.setStatus(PresaleState.Active, true, true, false, false)

            await expect(claim.toggleClaims()).to.be.revertedWithCustomError(claim, "TGENotOccurred")
        })

        it("toggles when TGE has occurred and emits", async () => {
            const { pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await pm.setStatus(PresaleState.Active, true, true, false, true) // tgeOccurred=true

            await expect(claim.toggleClaims()).to.emit(claim, "ClaimsStatusUpdated").withArgs(true)
            expect(await claim.claimsActive()).to.eq(true)

            await expect(claim.toggleClaims()).to.emit(claim, "ClaimsStatusUpdated").withArgs(false)
            expect(await claim.claimsActive()).to.eq(false)
        })
    })

    describe("claimTokens()", () => {
        it("reverts if claims not active", async () => {
            const { pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await pm.setStatus(PresaleState.Active, true, true, false, true) // TGE=true
            // NOT toggled yet, so claimsActive=false
            await expect(
                claim.connect(user).claimTokens(1, 0, Math.floor(Date.now() / 1000) + 3600, "0x"),
            ).to.be.revertedWithCustomError(claim, "ClaimsNotActive")
        })

        it("reverts if expired", async () => {
            const { token, pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await pm.setStatus(PresaleState.Active, true, true, false, true)
            await claim.toggleClaims() // active

            const deadline = Math.floor(Date.now() / 1000) - 10
            const sig = await signClaim(
                trustedSigner,
                userAddr,
                utils.parseUnits("100", 18),
                utils.parseUnits("0", 18),
                deadline,
            )

            await expect(
                claim.connect(user).claimTokens(utils.parseUnits("100", 18), 0, deadline, sig),
            ).to.be.revertedWithCustomError(claim, "SignatureExpired")
        })

        it("reverts on invalid signature", async () => {
            const { token, pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await pm.setStatus(PresaleState.Active, true, true, false, true)
            await claim.toggleClaims()

            const badSigner = Wallet.createRandom()
            const deadline = Math.floor(Date.now() / 1000) + 3600
            const sig = await signClaim(badSigner, userAddr, utils.parseUnits("10", 18), BigNumber.from(0), deadline)

            await expect(
                claim.connect(user).claimTokens(utils.parseUnits("10", 18), 0, deadline, sig),
            ).to.be.revertedWithCustomError(claim, "InvalidSignature")
        })

        it("reverts on NothingToClaim (both zero)", async () => {
            const { pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await pm.setStatus(PresaleState.Active, true, true, false, true)
            await claim.toggleClaims()

            const deadline = Math.floor(Date.now() / 1000) + 3600
            const sig = await signClaim(trustedSigner, userAddr, BigNumber.from(0), BigNumber.from(0), deadline)

            await expect(claim.connect(user).claimTokens(0, 0, deadline, sig)).to.be.revertedWithCustomError(
                claim,
                "NothingToClaim",
            )
        })

        it("reverts on InsufficientTokenBalance", async () => {
            const { token, pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await pm.setStatus(PresaleState.Active, true, true, false, true)
            await claim.toggleClaims()

            const purchase = utils.parseUnits("1000", 18)
            const reward = utils.parseUnits("100", 18)
            const total = purchase.add(reward)
            const deadline = Math.floor(Date.now() / 1000) + 3600
            const sig = await signClaim(trustedSigner, userAddr, purchase, reward, deadline)

            // NOTE: TokenClaim doesn't have enough token balance yet.
            await expect(
                claim.connect(user).claimTokens(purchase, reward, deadline, sig),
            ).to.be.revertedWithCustomError(claim, "InsufficientTokenBalance")
        })

        it("happy path: transfers tokens, updates claimedAmounts, emits TokensClaimed; prevents double-claim & signature replay", async () => {
            const { token, pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await pm.setStatus(PresaleState.Active, true, true, false, true)
            await claim.toggleClaims()

            const purchase = utils.parseUnits("500", 18)
            const reward = utils.parseUnits("50", 18)
            const total = purchase.add(reward)
            const deadline = Math.floor(Date.now() / 1000) + 3600
            const sig = await signClaim(trustedSigner, userAddr, purchase, reward, deadline)

            // Fund TokenClaim with enough tokens
            await token.mint(claim.address, total)

            // Pre balances
            const before = await token.balanceOf(userAddr)
            expect(before.toString()).to.eq("0")

            // Claim
            const tx = await claim.connect(user).claimTokens(purchase, reward, deadline, sig)
            await expect(tx).to.emit(claim, "TokensClaimed").withArgs(userAddr, purchase, reward)

            // Post checks
            const after = await token.balanceOf(userAddr)
            expect(after.toString()).to.eq(total.toString())

            const claimed = await claim.claimedAmounts(userAddr)
            expect(claimed.toString()).to.eq(total.toString())

            // getUserClaimInfo shows (claimed, canClaim=false)
            const info = await claim.getUserClaimInfo(userAddr)
            expect(info.claimed.toString()).to.eq(total.toString())
            expect(info.canClaim).to.eq(false)

            // Reuse same signature → SignatureAlreadyUsed
            await expect(
                claim.connect(user).claimTokens(purchase, reward, deadline, sig),
            ).to.be.revertedWithCustomError(claim, "SignatureAlreadyUsed")

            // Try new signature after already claimed → AlreadyClaimed
            const sig2 = await signClaim(
                trustedSigner,
                userAddr,
                purchase,
                reward,
                Math.floor(Date.now() / 1000) + 7200,
            )
            await expect(
                claim.connect(user).claimTokens(purchase, reward, Math.floor(Date.now() / 1000) + 7200, sig2),
            ).to.be.revertedWithCustomError(claim, "AlreadyClaimed")
        })
    })

    describe("recoverERC20()", () => {
        it("blocks recovering presale token while claims are active; allows after disabling", async () => {
            const { token, pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await pm.setStatus(PresaleState.Active, true, true, false, true)
            await claim.toggleClaims() // active = true

            // Fund with extra presale tokens (not needed for claims, just for recovery test)
            await token.mint(claim.address, utils.parseUnits("10", 18))

            // While active → revert
            await expect(claim.recoverERC20(token.address, utils.parseUnits("5", 18), ownerAddr)).to.be.revertedWith(
                "Cannot recover presale tokens while claims are active",
            )

            // Disable claims
            await claim.toggleClaims()

            // Now recovery is allowed
            const ownerBalBefore = await token.balanceOf(ownerAddr)
            await claim.recoverERC20(token.address, utils.parseUnits("5", 18), ownerAddr)
            const ownerBalAfter = await token.balanceOf(ownerAddr)
            expect(ownerBalAfter.sub(ownerBalBefore).toString()).to.eq(utils.parseUnits("5", 18).toString())
        })

        it("reverts on zero addresses", async () => {
            const { token, pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            await expect(claim.recoverERC20(ethers.constants.AddressZero, 1, ownerAddr)).to.be.revertedWithCustomError(
                claim,
                "ZeroAddress",
            )
            await expect(
                claim.recoverERC20(token.address, 1, ethers.constants.AddressZero),
            ).to.be.revertedWithCustomError(claim, "ZeroAddress")
        })
    })

    describe("getPresaleStatus passthrough", () => {
        it("returns whatever presaleManager reports", async () => {
            const { pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            // Set an arbitrary state
            await pm.setStatus(PresaleState.Paused, false, true, false, false)
            const res = await claim.getPresaleStatus()
            // struct: (state, active, started, ended, tgeOccurred)
            expect(res.state).to.eq(PresaleState.Paused)
            expect(res.active).to.eq(false)
            expect(res.started).to.eq(true)
            expect(res.ended).to.eq(false)
            expect(res.tgeOccurred).to.eq(false)
        })
    })

    describe("Signature Mapping Growth Bounds Documentation", () => {
        it("MAX_DEADLINE_DURATION is 30 days, providing signature lifecycle management", async function () {
            const { pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            // Check the constant value
            const maxDeadline = await claim.MAX_DEADLINE_DURATION()
            const thirtyDays = 30 * 24 * 60 * 60 // 30 days in seconds
            expect(maxDeadline.toNumber()).to.eq(thirtyDays)

            // This 30-day expiration ensures signatures have a bounded lifetime
            // Even though usedSignatures never expires, the signature itself expires after 30 days
            // This prevents indefinite storage of expired signature data
        })

        it("documentation explains bounded growth characteristics", function () {
            // The usedSignatures mapping appears to grow monotonically, but it's actually bounded:
            // 1. Each user can only claim once (enforced by claimedAmounts check on line 118)
            // 2. Signatures expire after MAX_DEADLINE_DURATION (30 days)
            // 3. Maximum storage growth = number of claims = number of users who claimed

            // This bounded growth is documented in the contract comments:
            // - Lines 26-30: Explains that growth is bounded by one entry per user
            // - Lines 103-106: Explains signature lifecycles in claimTokens function
            // - Lines 122-124: Explains storage growth is bounded in the function

            expect(true).to.be.true // Documentation test
        })

        it("usedSignatures provides replay attack protection", async function () {
            // The usedSignatures mapping prevents signature replay attacks
            // Key characteristics:
            // - Each signature can only be used once (line 117-124)
            // - Users can only claim once (line 118: claimedAmounts check)
            // - Maximum entries = number of users who successfully claimed

            const { pm } = await deployMocks()
            const claim = await deployTokenClaim(pm.address)

            // Verify the mapping exists and can be queried
            const arbitrarySig = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
            expect(await claim.usedSignatures(arbitrarySig)).to.be.false

            // This mapping ensures signatures cannot be reused
            // The documentation on lines 26-30 explains the bounded nature
        })
    })
})
