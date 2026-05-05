// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PresaleManager.sol";

/**
 * @title TokenClaim
 * @dev Contract for claiming tokens purchased during the presale
 */
contract TokenClaim is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_DEADLINE_DURATION = 30 days;

    PresaleManager public presaleManager;
    bool public claimsActive;
    bool public emergencyPaused = false;

    mapping(address => uint256) public claimedAmounts;
    // Signature replay protection mapping
    // Security Note: Grows monotonically but bounded by:
    // 1. Each user can only claim once (see claimedAmounts check)
    // 2. Signatures expire after MAX_DEADLINE_DURATION (30 days)
    // 3. Maximum storage growth = number of claims (one per eligible user)
    mapping(bytes => bool) public usedSignatures;

    event TokensClaimed(address indexed claimer, uint256 amount, uint256 stakingRewards);
    event ClaimsStatusUpdated(bool isActive);
    event PresaleManagerUpdated(address newPresaleManager);

    error ZeroAddress();
    error TGENotOccurred();
    error ClaimsNotActive();
    error SignatureAlreadyUsed();
    error AlreadyClaimed();
    error SignatureExpired();
    error DeadlineTooFar();
    error InvalidSignature();
    error NothingToClaim();
    error InsufficientTokenBalance();
    error PresaleNotActive();
    error PresaleEnded();
    error TGEOccurred();

    /**
     * @dev Constructor initializes the contract with the presale manager address
     * @param _presaleManager Address of the presale manager contract
     */
    constructor(address _presaleManager) Ownable(msg.sender) {
        if (_presaleManager == address(0)) revert ZeroAddress();
        presaleManager = PresaleManager(_presaleManager);
        claimsActive = false;
    }

    // ==================== EXTERNAL FUNCTIONS ====================

    /**
     * @dev Toggles the claims status
     * Can only be called by the owner after TGE has occurred
     */
    function toggleClaims() external onlyOwner {
        if (!presaleManager.tgeHasOccurred()) revert TGENotOccurred();
        claimsActive = !claimsActive;
        emit ClaimsStatusUpdated(claimsActive);
    }

    /**
     * @dev Updates the presale manager address
     * @param _presaleManager New presale manager address
     */
    function updatePresaleManager(address _presaleManager) external onlyOwner {
        if (_presaleManager == address(0)) revert ZeroAddress();
        presaleManager = PresaleManager(_presaleManager);
        emit PresaleManagerUpdated(_presaleManager);
    }

    /**
     * @dev Pauses the claims functionality in case of an emergency
     */
    function emergencyPause() external onlyOwner {
        emergencyPaused = true;
    }

    /**
     * @dev Unpauses the claims functionality in case of an emergency
     */
    function emergencyUnpause() external onlyOwner {
        emergencyPaused = false;
    }

    /**
     * @dev Claims tokens based on a signed message
     * @param purchaseAmount Amount of tokens purchased
     * @param stakingReward Additional tokens from staking rewards
     * @param deadline Expiration timestamp for the signature
     * @param signature Cryptographic signature from the trusted signer
     * @notice Signature lifecycles:
     *         - Signatures expire after deadline (MAX_DEADLINE_DURATION = 30 days)
     *         - Each user can only claim once, bounding storage growth
     *         - usedSignatures prevents replay attacks but does not require pruning
     */
    function claimTokens(
        uint256 purchaseAmount,
        uint256 stakingReward,
        uint256 deadline,
        bytes memory signature
    ) external nonReentrant {
        if (emergencyPaused) revert ClaimsNotActive();
        if (!claimsActive) revert ClaimsNotActive();
        _checkPresaleStatus(true); // Require TGE has occurred
        if (usedSignatures[signature]) revert SignatureAlreadyUsed();
        if (claimedAmounts[msg.sender] > 0) revert AlreadyClaimed();
        if (deadline > block.timestamp + MAX_DEADLINE_DURATION) revert DeadlineTooFar();
        if (block.timestamp > deadline) revert SignatureExpired();

        // Mark signature as used to prevent replay attacks
        // Storage growth is bounded: one entry per claim (one per user max)
        usedSignatures[signature] = true;

        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, purchaseAmount, stakingReward, deadline, block.chainid, address(this))
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);

        if (recoveredSigner != presaleManager.trustedSigner()) revert InvalidSignature();

        uint256 totalAmount = purchaseAmount + stakingReward;
        if (totalAmount == 0) revert NothingToClaim();

        claimedAmounts[msg.sender] = totalAmount;

        IERC20 token = IERC20(presaleManager.token());
        if (token.balanceOf(address(this)) < totalAmount) revert InsufficientTokenBalance();

        token.safeTransfer(msg.sender, totalAmount);

        emit TokensClaimed(msg.sender, purchaseAmount, stakingReward);
    }

    /**
     * @dev Gets claim information for a user
     * @param user Address of the user
     * @return claimed Amount already claimed by the user
     * @return canClaim Whether the user can claim tokens
     */
    function getUserClaimInfo(address user) external view returns (uint256 claimed, bool canClaim) {
        (, , , , bool tgeOccurred) = presaleManager.getPresaleStatus();

        bool eligibleToClaim = claimsActive && tgeOccurred && claimedAmounts[user] == 0;

        return (claimedAmounts[user], eligibleToClaim);
    }

    /**
     * @dev Gets the current presale status
     * @return state Current state of the presale
     * @return active Whether the presale is active
     * @return started Whether the presale has started
     * @return ended Whether the presale has ended
     * @return tgeOccurred Whether the TGE has occurred
     */
    function getPresaleStatus()
        external
        view
        returns (PresaleManager.PresaleState state, bool active, bool started, bool ended, bool tgeOccurred)
    {
        return presaleManager.getPresaleStatus();
    }

    /**
     * @dev Allows the owner to recover any ERC20 tokens sent to the contract by mistake
     * @param tokenAddress Address of the token to recover
     * @param amount Amount to recover
     * @param recipient Address to send the tokens to
     */
    function recoverERC20(address tokenAddress, uint256 amount, address recipient) external onlyOwner {
        if (tokenAddress == address(0) || recipient == address(0)) revert ZeroAddress();

        // Don't allow recovering the presale token unless claims are no longer active
        if (tokenAddress == address(presaleManager.token())) {
            require(!claimsActive, "Cannot recover presale tokens while claims are active");
        }

        IERC20(tokenAddress).safeTransfer(recipient, amount);
    }

    // ==================== INTERNAL FUNCTIONS ====================

    /**
     * @dev Checks the presale status
     * @param requireTGE Whether to require TGE to have occurred
     */
    function _checkPresaleStatus(bool requireTGE) internal view {
        (PresaleManager.PresaleState state, bool active, , bool ended, bool tgeOccurred) = presaleManager
            .getPresaleStatus();

        if (requireTGE) {
            if (!tgeOccurred) revert TGENotOccurred();
        } else {
            if (state != PresaleManager.PresaleState.Active) revert PresaleNotActive();
            if (!active) revert PresaleNotActive();
            if (ended) revert PresaleEnded();
            if (tgeOccurred) revert TGEOccurred();
        }
    }
}
