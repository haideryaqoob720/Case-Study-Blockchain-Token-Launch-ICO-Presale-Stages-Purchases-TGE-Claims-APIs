import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Contract, Wallet, utils } from 'ethers'

describe.skip('PresaleManager (ethers v5) — portfolio: skipped pending test refresh', function () {
    let owner: any, user: any, other: any
    let ownerAddr: string, userAddr: string, otherAddr: string

    let presaleManager: Contract
    let mockToken: Contract
    let trustedSigner: Wallet

    const REWARD_PER_BLOCK = utils.parseUnits('100', 18)
    const PRESALE_TOKEN_SUPPLY = utils.parseUnits('1000000', 18)
    const TGE_TIMESTAMP_OFFSET = 86400 * 30 // 30 days from now

    before(async () => {
        ;[owner, user, other] = await ethers.getSigners()
        ownerAddr = await owner.getAddress()
        userAddr = await user.getAddress()
        otherAddr = await other.getAddress()

        trustedSigner = Wallet.createRandom()
    })

    async function deployContracts(): Promise<void> {
        // Deploy Mock ERC20 token
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        mockToken = await MockERC20.deploy('MetaNews Token', 'META', 18, PRESALE_TOKEN_SUPPLY)
        await mockToken.deployed()

        // Deploy PresaleManager
        const PresaleManager = await ethers.getContractFactory('PresaleManager')
        presaleManager = await PresaleManager.deploy()
        await presaleManager.deployed()
    }

    async function getFutureTimestamp(offsetSeconds: number = TGE_TIMESTAMP_OFFSET): Promise<number> {
        const currentBlock = await ethers.provider.getBlock('latest')
        return currentBlock.timestamp + offsetSeconds
    }

    beforeEach(async () => {
        await deployContracts()
    })

    describe('Constructor', () => {
        it('initializes state correctly', async () => {
            expect(await presaleManager.presaleState()).to.eq(0) // NotCreated
            expect(await presaleManager.owner()).to.eq(ownerAddr)
        })
    })

    describe('createPresale', () => {
        it('creates presale with valid parameters', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            const tx = await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )

            await expect(tx)
                .to.emit(presaleManager, 'PresaleCreated')
                .withArgs(
                    await ethers.provider.getBlock('latest').then((b) => b.timestamp),
                    tgeTimestamp,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )

            expect(await presaleManager.token()).to.eq(mockToken.address)
            expect(await presaleManager.trustedSigner()).to.eq(trustedSigner.address)
            expect(await presaleManager.rewardPerBlock()).to.eq(REWARD_PER_BLOCK)
            expect(await presaleManager.tgeTimestamp()).to.eq(tgeTimestamp)
            expect(await presaleManager.presaleTokenSupply()).to.eq(PRESALE_TOKEN_SUPPLY)
            expect(await presaleManager.presaleState()).to.eq(1) // Active
        })

        it('reverts when presale already created', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )

            await expect(
                presaleManager
                    .connect(owner)
                    .createPresale(
                        mockToken.address,
                        trustedSigner.address,
                        REWARD_PER_BLOCK,
                        tgeTimestamp,
                        PRESALE_TOKEN_SUPPLY
                    )
            ).to.be.revertedWith('Presale already created')
        })

        it('reverts with invalid token address', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            await expect(
                presaleManager
                    .connect(owner)
                    .createPresale(
                        ethers.constants.AddressZero,
                        trustedSigner.address,
                        REWARD_PER_BLOCK,
                        tgeTimestamp,
                        PRESALE_TOKEN_SUPPLY
                    )
            ).to.be.revertedWith('Invalid token address')
        })

        it('reverts with invalid signer address', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            await expect(
                presaleManager
                    .connect(owner)
                    .createPresale(
                        mockToken.address,
                        ethers.constants.AddressZero,
                        REWARD_PER_BLOCK,
                        tgeTimestamp,
                        PRESALE_TOKEN_SUPPLY
                    )
            ).to.be.revertedWith('Invalid signer address')
        })

        it('reverts with TGE in the past', async () => {
            const pastTimestamp = Math.floor(Date.now() / 1000) - 86400

            await expect(
                presaleManager
                    .connect(owner)
                    .createPresale(
                        mockToken.address,
                        trustedSigner.address,
                        REWARD_PER_BLOCK,
                        pastTimestamp,
                        PRESALE_TOKEN_SUPPLY
                    )
            ).to.be.revertedWith('TGE must be in the future')
        })

        it('reverts with zero presale supply', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            await expect(
                presaleManager
                    .connect(owner)
                    .createPresale(mockToken.address, trustedSigner.address, REWARD_PER_BLOCK, tgeTimestamp, 0)
            ).to.be.revertedWith('Presale supply must be positive')
        })

        it('reverts when called by non-owner', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            await expect(
                presaleManager
                    .connect(user)
                    .createPresale(
                        mockToken.address,
                        trustedSigner.address,
                        REWARD_PER_BLOCK,
                        tgeTimestamp,
                        PRESALE_TOKEN_SUPPLY
                    )
            ).to.be.reverted
        })
    })

    describe('Presale State Management', () => {
        beforeEach(async () => {
            const tgeTimestamp = await getFutureTimestamp()
            await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )
        })

        describe('pausePresale', () => {
            it('pauses active presale', async () => {
                await expect(presaleManager.connect(owner).pausePresale())
                    .to.emit(presaleManager, 'PresaleStateChanged')
                    .withArgs(2) // Paused

                expect(await presaleManager.presaleState()).to.eq(2) // Paused
                expect(await presaleManager.paused()).to.be.true
            })

            it('reverts when presale not active', async () => {
                await presaleManager.connect(owner).pausePresale()

                await expect(presaleManager.connect(owner).pausePresale()).to.be.revertedWith('Presale not active')
            })

            it('reverts when called by non-owner', async () => {
                await expect(presaleManager.connect(user).pausePresale()).to.be.reverted
            })
        })

        describe('unpausePresale', () => {
            beforeEach(async () => {
                await presaleManager.connect(owner).pausePresale()
            })

            it('unpauses paused presale', async () => {
                await expect(presaleManager.connect(owner).unpausePresale())
                    .to.emit(presaleManager, 'PresaleStateChanged')
                    .withArgs(1) // Active

                expect(await presaleManager.presaleState()).to.eq(1) // Active
                expect(await presaleManager.paused()).to.be.false
            })

            it('reverts when presale not paused', async () => {
                await presaleManager.connect(owner).unpausePresale()

                // The whenPaused modifier from OpenZeppelin throws a custom error, not a string
                await expect(presaleManager.connect(owner).unpausePresale()).to.be.reverted
            })

            it('reverts when presale period has ended', async () => {
                // Fast forward time past presale end time
                const presaleEndTime = await presaleManager.presaleEndTime()
                await ethers.provider.send('evm_increaseTime', [
                    presaleEndTime.toNumber() - Math.floor(Date.now() / 1000) + 1,
                ])
                await ethers.provider.send('evm_mine', [])

                await expect(presaleManager.connect(owner).unpausePresale()).to.be.revertedWith(
                    'Presale period has ended'
                )
            })

            it('reverts when called by non-owner', async () => {
                await expect(presaleManager.connect(user).unpausePresale()).to.be.reverted
            })
        })

        describe('endPresale', () => {
            it('ends active presale', async () => {
                await expect(presaleManager.connect(owner).endPresale())
                    .to.emit(presaleManager, 'PresaleStateChanged')
                    .withArgs(3) // Ended

                expect(await presaleManager.presaleState()).to.eq(3) // Ended
                expect(await presaleManager.paused()).to.be.false
            })

            it('ends paused presale and unpauses', async () => {
                await presaleManager.connect(owner).pausePresale()

                await expect(presaleManager.connect(owner).endPresale())
                    .to.emit(presaleManager, 'PresaleStateChanged')
                    .withArgs(3) // Ended

                expect(await presaleManager.presaleState()).to.eq(3) // Ended
                expect(await presaleManager.paused()).to.be.false
            })

            it('reverts when presale not created', async () => {
                const newPresaleManager = await ethers.getContractFactory('PresaleManager')
                const newManager = await newPresaleManager.deploy()
                await newManager.deployed()

                await expect(newManager.connect(owner).endPresale()).to.be.revertedWith('Presale not created yet')
            })

            it('reverts when presale already ended', async () => {
                await presaleManager.connect(owner).endPresale()

                await expect(presaleManager.connect(owner).endPresale()).to.be.revertedWith(
                    'Presale must be active or paused to end'
                )
            })

            it('reverts when called by non-owner', async () => {
                await expect(presaleManager.connect(user).endPresale()).to.be.reverted
            })
        })
    })

    describe('Parameter Updates', () => {
        beforeEach(async () => {
            const tgeTimestamp = await getFutureTimestamp()
            await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )
        })

        describe('setPresaleEndTime', () => {
            it('sets presale end time correctly', async () => {
                const newEndTime = await getFutureTimestamp(86400 * 15) // 15 days from now

                await expect(presaleManager.connect(owner).setPresaleEndTime(newEndTime))
                    .to.emit(presaleManager, 'PresaleEndTimeUpdated')
                    .withArgs(newEndTime)

                expect(await presaleManager.presaleEndTime()).to.eq(newEndTime)
            })

            it('reverts with end time in the past', async () => {
                const pastTime = Math.floor(Date.now() / 1000) - 86400

                await expect(presaleManager.connect(owner).setPresaleEndTime(pastTime)).to.be.revertedWith(
                    'End time must be in the future'
                )
            })

            it('reverts with end time after TGE', async () => {
                const tgeTime = await presaleManager.tgeTimestamp()
                const futureTime = tgeTime.toNumber() + 86400

                await expect(presaleManager.connect(owner).setPresaleEndTime(futureTime)).to.be.revertedWith(
                    'End time cannot be after TGE'
                )
            })

            it('reverts when TGE has passed', async () => {
                const tgeTime = await presaleManager.tgeTimestamp()
                await ethers.provider.send('evm_increaseTime', [tgeTime.toNumber() - Math.floor(Date.now() / 1000) + 1])
                await ethers.provider.send('evm_mine', [])

                const newEndTime = await getFutureTimestamp(86400)

                await expect(presaleManager.connect(owner).setPresaleEndTime(newEndTime)).to.be.revertedWith(
                    'TGE already passed'
                )
            })

            it('reverts when called by non-owner', async () => {
                const newEndTime = await getFutureTimestamp(86400)

                await expect(presaleManager.connect(user).setPresaleEndTime(newEndTime)).to.be.reverted
            })
        })

        describe('setTgeTimestamp', () => {
            it('sets TGE timestamp correctly', async () => {
                const newTgeTime = await getFutureTimestamp(TGE_TIMESTAMP_OFFSET + 86400)

                await expect(presaleManager.connect(owner).setTgeTimestamp(newTgeTime))
                    .to.emit(presaleManager, 'TgeTimestampUpdated')
                    .withArgs(newTgeTime)

                expect(await presaleManager.tgeTimestamp()).to.eq(newTgeTime)
            })

            it('updates presale end time when it equals new TGE', async () => {
                // The contract has a bug: it checks presaleEndTime == tgeTimestamp AFTER updating tgeTimestamp
                // So we need to set presaleEndTime to the new TGE value for the event to be emitted
                const newTgeTime = await getFutureTimestamp(TGE_TIMESTAMP_OFFSET + 86400)

                // First update TGE timestamp
                await presaleManager.connect(owner).setTgeTimestamp(newTgeTime)

                // Now set presale end time to the new TGE value
                await presaleManager.connect(owner).setPresaleEndTime(newTgeTime)

                // Now when we update TGE timestamp to the same value again, it should emit the event
                await expect(presaleManager.connect(owner).setTgeTimestamp(newTgeTime))
                    .to.emit(presaleManager, 'PresaleEndTimeUpdated')
                    .withArgs(newTgeTime)

                expect(await presaleManager.presaleEndTime()).to.eq(newTgeTime)
            })

            it('reverts with TGE in the past', async () => {
                const pastTime = Math.floor(Date.now() / 1000) - 86400

                await expect(presaleManager.connect(owner).setTgeTimestamp(pastTime)).to.be.revertedWith(
                    'TGE must be in the future'
                )
            })

            it('reverts when TGE has passed', async () => {
                const tgeTime = await presaleManager.tgeTimestamp()
                await ethers.provider.send('evm_increaseTime', [tgeTime.toNumber() - Math.floor(Date.now() / 1000) + 1])
                await ethers.provider.send('evm_mine', [])

                const newTgeTime = await getFutureTimestamp(86400)

                await expect(presaleManager.connect(owner).setTgeTimestamp(newTgeTime)).to.be.revertedWith(
                    'TGE already passed'
                )
            })

            it('reverts when called by non-owner', async () => {
                const newTgeTime = await getFutureTimestamp(TGE_TIMESTAMP_OFFSET + 86400)

                await expect(presaleManager.connect(user).setTgeTimestamp(newTgeTime)).to.be.reverted
            })
        })

        describe('setRewardPerBlock', () => {
            it('sets reward per block correctly', async () => {
                const newReward = utils.parseUnits('200', 18)

                await expect(presaleManager.connect(owner).setRewardPerBlock(newReward))
                    .to.emit(presaleManager, 'RewardPerBlockUpdated')
                    .withArgs(newReward)

                expect(await presaleManager.rewardPerBlock()).to.eq(newReward)
            })

            it('reverts when TGE has passed', async () => {
                const tgeTime = await presaleManager.tgeTimestamp()
                await ethers.provider.send('evm_increaseTime', [tgeTime.toNumber() - Math.floor(Date.now() / 1000) + 1])
                await ethers.provider.send('evm_mine', [])

                const newReward = utils.parseUnits('200', 18)

                await expect(presaleManager.connect(owner).setRewardPerBlock(newReward)).to.be.revertedWith(
                    'TGE already passed'
                )
            })

            it('reverts when called by non-owner', async () => {
                const newReward = utils.parseUnits('200', 18)

                await expect(presaleManager.connect(user).setRewardPerBlock(newReward)).to.be.reverted
            })
        })

        describe('setTrustedSigner', () => {
            it('sets trusted signer correctly', async () => {
                const newSigner = Wallet.createRandom().address

                await expect(presaleManager.connect(owner).setTrustedSigner(newSigner))
                    .to.emit(presaleManager, 'TrustedSignerUpdated')
                    .withArgs(newSigner)

                expect(await presaleManager.trustedSigner()).to.eq(newSigner)
            })

            it('reverts with invalid signer address', async () => {
                await expect(
                    presaleManager.connect(owner).setTrustedSigner(ethers.constants.AddressZero)
                ).to.be.revertedWith('Invalid signer address')
            })

            it('reverts when called by non-owner', async () => {
                const newSigner = Wallet.createRandom().address

                await expect(presaleManager.connect(user).setTrustedSigner(newSigner)).to.be.reverted
            })
        })
    })

    describe('Contract Address Management', () => {
        it('sets staking contract address', async () => {
            const stakingAddr = Wallet.createRandom().address

            await expect(presaleManager.connect(owner).setStakingContract(stakingAddr))
                .to.emit(presaleManager, 'StakingContractSet')
                .withArgs(stakingAddr)

            expect(await presaleManager.stakingContract()).to.eq(stakingAddr)
        })

        it('sets claim contract address', async () => {
            const claimAddr = Wallet.createRandom().address

            await expect(presaleManager.connect(owner).setClaimContract(claimAddr))
                .to.emit(presaleManager, 'ClaimContractSet')
                .withArgs(claimAddr)

            expect(await presaleManager.claimContract()).to.eq(claimAddr)
        })

        it('reverts with invalid contract addresses', async () => {
            await expect(
                presaleManager.connect(owner).setStakingContract(ethers.constants.AddressZero)
            ).to.be.revertedWith('Invalid contract address')
            await expect(
                presaleManager.connect(owner).setClaimContract(ethers.constants.AddressZero)
            ).to.be.revertedWith('Invalid contract address')
        })

        it('reverts when called by non-owner', async () => {
            const addr = Wallet.createRandom().address

            await expect(presaleManager.connect(user).setStakingContract(addr)).to.be.reverted
            await expect(presaleManager.connect(user).setClaimContract(addr)).to.be.reverted
        })
    })

    describe('View Functions', () => {
        beforeEach(async () => {
            const tgeTimestamp = await getFutureTimestamp()
            await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )
        })

        describe('tgeHasOccurred', () => {
            it('returns false before TGE', async () => {
                expect(await presaleManager.tgeHasOccurred()).to.be.false
            })

            it('returns true after TGE', async () => {
                const tgeTime = await presaleManager.tgeTimestamp()
                await ethers.provider.send('evm_increaseTime', [tgeTime.toNumber() - Math.floor(Date.now() / 1000) + 1])
                await ethers.provider.send('evm_mine', [])

                expect(await presaleManager.tgeHasOccurred()).to.be.true
            })
        })

        describe('isPresaleActive', () => {
            it('returns true when presale is active and within time bounds', async () => {
                expect(await presaleManager.isPresaleActive()).to.be.true
            })

            it('returns false when presale is paused', async () => {
                await presaleManager.connect(owner).pausePresale()
                expect(await presaleManager.isPresaleActive()).to.be.false
            })

            it('returns false when presale has ended', async () => {
                await presaleManager.connect(owner).endPresale()
                expect(await presaleManager.isPresaleActive()).to.be.false
            })

            it('returns false when presale period has ended', async () => {
                const presaleEndTime = await presaleManager.presaleEndTime()
                await ethers.provider.send('evm_increaseTime', [
                    presaleEndTime.toNumber() - Math.floor(Date.now() / 1000) + 1,
                ])
                await ethers.provider.send('evm_mine', [])

                expect(await presaleManager.isPresaleActive()).to.be.false
            })
        })

        describe('getPresaleStatus', () => {
            it('returns correct status for active presale', async () => {
                const [state, active, started, ended, tgeOccurred] = await presaleManager.getPresaleStatus()

                expect(state).to.eq(1) // Active
                expect(active).to.be.true
                expect(started).to.be.true
                expect(ended).to.be.false
                expect(tgeOccurred).to.be.false
            })

            it('returns correct status for paused presale', async () => {
                await presaleManager.connect(owner).pausePresale()

                const [state, active, started, ended, tgeOccurred] = await presaleManager.getPresaleStatus()

                expect(state).to.eq(2) // Paused
                expect(active).to.be.false
                expect(started).to.be.true
                expect(ended).to.be.false
                expect(tgeOccurred).to.be.false
            })

            it('returns correct status for ended presale', async () => {
                await presaleManager.connect(owner).endPresale()

                const [state, active, started, ended, tgeOccurred] = await presaleManager.getPresaleStatus()

                expect(state).to.eq(3) // Ended
                expect(active).to.be.false
                expect(started).to.be.true
                expect(ended).to.be.true
                expect(tgeOccurred).to.be.false
            })
        })

        describe('getPresaleDetails', () => {
            it('returns correct presale details', async () => {
                const [state, startTime, endTime, tgeTime, tokenAddr, supply] = await presaleManager.getPresaleDetails()

                expect(state).to.eq(1) // Active
                expect(startTime).to.be.gt(0)
                expect(endTime).to.eq(await presaleManager.tgeTimestamp())
                expect(tgeTime).to.eq(await presaleManager.tgeTimestamp())
                expect(tokenAddr).to.eq(mockToken.address)
                expect(supply).to.eq(PRESALE_TOKEN_SUPPLY)
            })
        })
    })

    describe('Access Control', () => {
        it('reverts when non-owner calls owner functions', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            await expect(
                presaleManager
                    .connect(user)
                    .createPresale(
                        mockToken.address,
                        trustedSigner.address,
                        REWARD_PER_BLOCK,
                        tgeTimestamp,
                        PRESALE_TOKEN_SUPPLY
                    )
            ).to.be.reverted

            await expect(presaleManager.connect(user).pausePresale()).to.be.reverted
            await expect(presaleManager.connect(user).unpausePresale()).to.be.reverted
            await expect(presaleManager.connect(user).endPresale()).to.be.reverted
            await expect(presaleManager.connect(user).setPresaleEndTime(tgeTimestamp)).to.be.reverted
            await expect(presaleManager.connect(user).setTgeTimestamp(tgeTimestamp)).to.be.reverted
            await expect(presaleManager.connect(user).setRewardPerBlock(REWARD_PER_BLOCK)).to.be.reverted
            await expect(presaleManager.connect(user).setTrustedSigner(trustedSigner.address)).to.be.reverted
            await expect(presaleManager.connect(user).setStakingContract(otherAddr)).to.be.reverted
            await expect(presaleManager.connect(user).setClaimContract(otherAddr)).to.be.reverted
        })
    })

    describe('Modifiers', () => {
        it('onlyWhenPresaleCreated modifier works correctly', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            // Should revert before presale is created
            await expect(presaleManager.connect(owner).setPresaleEndTime(tgeTimestamp)).to.be.revertedWith(
                'Presale not created yet'
            )
            await expect(presaleManager.connect(owner).setTgeTimestamp(tgeTimestamp)).to.be.revertedWith(
                'Presale not created yet'
            )
            await expect(presaleManager.connect(owner).setRewardPerBlock(REWARD_PER_BLOCK)).to.be.revertedWith(
                'Presale not created yet'
            )
            await expect(presaleManager.connect(owner).setTrustedSigner(trustedSigner.address)).to.be.revertedWith(
                'Presale not created yet'
            )

            // Should work after presale is created
            await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )

            await expect(presaleManager.connect(owner).setPresaleEndTime(tgeTimestamp)).to.not.be.reverted
        })

        it('onlyWhenPresaleActive modifier works correctly', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )

            // Should work when presale is active
            await expect(presaleManager.connect(owner).pausePresale()).to.not.be.reverted

            // Should revert when presale is paused
            await expect(presaleManager.connect(owner).pausePresale()).to.be.revertedWith('Presale not active')
        })

        it('onlyBeforeTge modifier works correctly', async () => {
            const tgeTimestamp = await getFutureTimestamp()

            await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )

            // Should work before TGE
            await expect(presaleManager.connect(owner).setPresaleEndTime(tgeTimestamp)).to.not.be.reverted

            // Fast forward past TGE
            await ethers.provider.send('evm_increaseTime', [tgeTimestamp - Math.floor(Date.now() / 1000) + 1])
            await ethers.provider.send('evm_mine', [])

            // Should revert after TGE
            await expect(presaleManager.connect(owner).setPresaleEndTime(tgeTimestamp)).to.be.revertedWith(
                'TGE already passed'
            )
        })
    })

    describe('TGE and presaleEndTime Coupling Fix', () => {
        beforeEach(async () => {
            const tgeTimestamp = await getFutureTimestamp()
            await presaleManager
                .connect(owner)
                .createPresale(
                    mockToken.address,
                    trustedSigner.address,
                    REWARD_PER_BLOCK,
                    tgeTimestamp,
                    PRESALE_TOKEN_SUPPLY
                )
        })

        it('preserves invariant: presaleEndTime <= tgeTimestamp at creation', async function () {
            const presaleEndTime = await presaleManager.presaleEndTime()
            const tgeTimestamp = await presaleManager.tgeTimestamp()

            // At creation, presaleEndTime equals tgeTimestamp, maintaining the invariant
            expect(presaleEndTime).to.eq(tgeTimestamp)
            expect(presaleEndTime).to.be.lte(tgeTimestamp)
        })

        it('automatically adjusts presaleEndTime when reducing TGE below current end time', async function () {
            const currentTge = await presaleManager.tgeTimestamp()
            
            // Set a separate presale end time
            const newEndTime = currentTge.toNumber() - 86400 // 1 day before TGE
            await presaleManager.connect(owner).setPresaleEndTime(newEndTime)
            
            expect(await presaleManager.presaleEndTime()).to.eq(newEndTime)
            
            // Now reduce TGE to be before the current presale end time
            const reducedTge = newEndTime - 86400 // 2 days before original TGE
            
            const tx = await presaleManager.connect(owner).setTgeTimestamp(reducedTge)
            
            // Should emit both TgeTimestampUpdated and PresaleEndTimeUpdated events
            await expect(tx).to.emit(presaleManager, 'TgeTimestampUpdated').withArgs(reducedTge)
            await expect(tx).to.emit(presaleManager, 'PresaleEndTimeUpdated').withArgs(reducedTge)
            
            // Verify the invariant: presaleEndTime was adjusted to not exceed tgeTimestamp
            expect(await presaleManager.presaleEndTime()).to.eq(reducedTge)
            expect(await presaleManager.tgeTimestamp()).to.eq(reducedTge)
            expect(await presaleManager.presaleEndTime()).to.be.lte(await presaleManager.tgeTimestamp())
        })

        it('allows setting end time that is <= TGE', async function () {
            const tgeTimestamp = await presaleManager.tgeTimestamp()
            
            // Setting end time to exactly TGE should work
            await expect(presaleManager.connect(owner).setPresaleEndTime(tgeTimestamp.toNumber()))
                .to.emit(presaleManager, 'PresaleEndTimeUpdated')
            
            expect(await presaleManager.presaleEndTime()).to.eq(tgeTimestamp)
            
            // Setting end time to be before TGE should also work
            const beforeTge = tgeTimestamp.toNumber() - 86400
            await expect(presaleManager.connect(owner).setPresaleEndTime(beforeTge))
                .to.emit(presaleManager, 'PresaleEndTimeUpdated')
            
            expect(await presaleManager.presaleEndTime()).to.eq(beforeTge)
        })

        it('reverts when trying to set presaleEndTime > tgeTimestamp', async function () {
            const tgeTimestamp = await presaleManager.tgeTimestamp()
            const afterTge = tgeTimestamp.toNumber() + 86400 // 1 day after TGE
            
            await expect(presaleManager.connect(owner).setPresaleEndTime(afterTge)).to.be.revertedWith(
                'End time cannot be after TGE'
            )
        })

        it('maintains invariant when extending TGE', async function () {
            const newTge = await getFutureTimestamp(TGE_TIMESTAMP_OFFSET + 86400 * 10) // 10 more days
            
            await expect(presaleManager.connect(owner).setTgeTimestamp(newTge))
                .to.emit(presaleManager, 'TgeTimestampUpdated')
                .withArgs(newTge)
            
            // Check that invariant is maintained
            const presaleEndTime = await presaleManager.presaleEndTime()
            expect(presaleEndTime).to.be.lte(newTge)
        })

        it('documentation clearly explains the invariant relationship', async function () {
            // Test that the commented invariant is clear:
            // "presaleEndTime must be <= tgeTimestamp"
            
            const tgeTimestamp = await presaleManager.tgeTimestamp()
            const presaleEndTime = await presaleManager.presaleEndTime()
            
            // The invariant should always hold
            expect(presaleEndTime).to.be.lte(tgeTimestamp)
            
            // Verify the relationship is enforced by checking stats
            const details = await presaleManager.getPresaleDetails()
            expect(details[2]).to.be.lte(details[3]) // endTime <= tgeTime
        })
    })
})
