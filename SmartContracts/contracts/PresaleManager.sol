// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PresaleManager
 * @dev Manages the presale of tokens with configurable parameters
 */
contract PresaleManager is Ownable, ReentrancyGuard, Pausable {
    enum PresaleState {
        NotCreated,
        Active,
        Paused,
        Ended
    }
    PresaleState public presaleState;

    IERC20 public token;
    uint256 public tgeTimestamp;
    address public trustedSigner;
    uint256 public rewardPerBlock;
    uint256 public presaleStartTime;
    uint256 public presaleEndTime;
    uint256 public presaleTokenSupply;
    address public stakingContract;
    address public claimContract;

    // Events
    event PresaleCreated(uint256 startTime, uint256 endTime, uint256 tgeTime, uint256 tokenSupply);
    event TgeTimestampUpdated(uint256 newTgeTimestamp);
    event RewardPerBlockUpdated(uint256 newRewardPerBlock);
    event TrustedSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event StakingContractSet(address contractAddress);
    event ClaimContractSet(address contractAddress);
    event PresaleStateChanged(PresaleState newState);
    event PresaleEndTimeUpdated(uint256 newEndTime);

    // Modifiers
    modifier onlyWhenPresaleCreated() {
        require(presaleState != PresaleState.NotCreated, "Presale not created yet");
        _;
    }

    modifier onlyWhenPresaleActive() {
        require(presaleState == PresaleState.Active, "Presale not active");
        _;
    }

    modifier onlyBeforeTge() {
        require(block.timestamp < tgeTimestamp, "TGE already passed");
        _;
    }

    /**
     * @dev Constructor initializes the contract with the deployer as the owner
     */
    constructor() Ownable(msg.sender) {
        presaleState = PresaleState.NotCreated;
    }

    /**
     * @dev Creates a new presale with the specified parameters
     * @param _token Address of the token being sold
     * @param _trustedSigner Address of the signer authorized to sign presale transactions
     * @param _rewardPerBlock Reward rate per block (used for frontend/UI display only)
     * @param _tgeTimestamp Timestamp for the Token Generation Event
     * @param _presaleTokenSupply Total supply of tokens for the presale
     * @dev Initial state: presaleEndTime is set to _tgeTimestamp to maintain the invariant
     *      that presaleEndTime <= tgeTimestamp. Owner can adjust presaleEndTime later via setPresaleEndTime()
     */
    function createPresale(
        address _token,
        address _trustedSigner,
        uint256 _rewardPerBlock,
        uint256 _tgeTimestamp,
        uint256 _presaleTokenSupply
    ) external onlyOwner nonReentrant {
        require(presaleState == PresaleState.NotCreated, "Presale already created");
        require(_token != address(0), "Invalid token address");
        require(_trustedSigner != address(0), "Invalid signer address");
        require(_tgeTimestamp > block.timestamp, "TGE must be in the future");
        require(_presaleTokenSupply > 0, "Presale supply must be positive");

        token = IERC20(_token);
        trustedSigner = _trustedSigner;
        rewardPerBlock = _rewardPerBlock;
        presaleStartTime = block.timestamp;
        tgeTimestamp = _tgeTimestamp;
        presaleEndTime = _tgeTimestamp;
        presaleTokenSupply = _presaleTokenSupply;
        presaleState = PresaleState.Active;

        emit PresaleCreated(presaleStartTime, _tgeTimestamp, _tgeTimestamp, _presaleTokenSupply);
    }

    /**
     * @dev Checks if the TGE has occurred
     * @return bool True if TGE has occurred, false otherwise
     */
    function tgeHasOccurred() external view returns (bool) {
        return block.timestamp >= tgeTimestamp;
    }

    /**
     * @dev Pauses the presale
     */
    function pausePresale() external onlyOwner onlyWhenPresaleActive {
        presaleState = PresaleState.Paused;
        _pause();
        emit PresaleStateChanged(PresaleState.Paused);
    }

    /**
     * @dev Unpauses the presale
     */
    function unpausePresale() external onlyOwner whenPaused {
        require(presaleState == PresaleState.Paused, "Presale is not paused");
        require(block.timestamp < presaleEndTime, "Presale period has ended");

        presaleState = PresaleState.Active;
        _unpause();
        emit PresaleStateChanged(PresaleState.Active);
    }

    /**
     * @dev Sets the end time for the presale
     * @param _presaleEndTime New end time for the presale
     * @dev Invariant: presaleEndTime must be <= tgeTimestamp (enforced via require statement)
     */
    function setPresaleEndTime(uint256 _presaleEndTime) external onlyOwner onlyWhenPresaleCreated onlyBeforeTge {
        require(_presaleEndTime > block.timestamp, "End time must be in the future");
        require(_presaleEndTime <= tgeTimestamp, "End time cannot be after TGE");

        presaleEndTime = _presaleEndTime;
        emit PresaleEndTimeUpdated(_presaleEndTime);
    }

    /**
     * @dev Sets the timestamp for the Token Generation Event
     * @param _tgeTimestamp New timestamp for the TGE
     * @dev Enforces invariant: presaleEndTime must be <= tgeTimestamp
     *      If presaleEndTime would be violated, it is automatically adjusted to _tgeTimestamp
     */
    function setTgeTimestamp(uint256 _tgeTimestamp) external onlyOwner onlyWhenPresaleCreated onlyBeforeTge {
        require(_tgeTimestamp > block.timestamp, "TGE must be in the future");

        // Explicit invariant enforcement: presaleEndTime must always be <= tgeTimestamp
        // If the new TGE is before current presaleEndTime, automatically adjust presaleEndTime
        // This prevents the timeline relationship from being violated
        if (_tgeTimestamp < presaleEndTime) {
            presaleEndTime = _tgeTimestamp;
            emit PresaleEndTimeUpdated(_tgeTimestamp);
        }

        tgeTimestamp = _tgeTimestamp;
        emit TgeTimestampUpdated(_tgeTimestamp);
    }

    /**
     * @dev Sets the reward per block
     * @param _rewardPerBlock New reward rate per block
     * @notice This value is stored for frontend/UI display purposes only and is not enforced in any contract logic
     */
    function setRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner onlyWhenPresaleCreated onlyBeforeTge {
        rewardPerBlock = _rewardPerBlock;
        emit RewardPerBlockUpdated(_rewardPerBlock);
    }

    /**
     * @dev Sets the trusted signer address
     * @param _newSigner Address of the new trusted signer
     */
    function setTrustedSigner(address _newSigner) external onlyOwner onlyWhenPresaleCreated {
        require(_newSigner != address(0), "Invalid signer address");

        address oldSigner = trustedSigner;
        trustedSigner = _newSigner;
        emit TrustedSignerUpdated(oldSigner, _newSigner);
    }

    /**
     * @dev Sets the staking contract address
     * @param _stakingContract Address of the staking contract
     */
    function setStakingContract(address _stakingContract) external onlyOwner {
        require(_stakingContract != address(0), "Invalid contract address");
        stakingContract = _stakingContract;
        emit StakingContractSet(_stakingContract);
    }

    /**
     * @dev Sets the claim contract address
     * @param _claimContract Address of the claim contract
     */
    function setClaimContract(address _claimContract) external onlyOwner {
        require(_claimContract != address(0), "Invalid contract address");
        claimContract = _claimContract;
        emit ClaimContractSet(_claimContract);
    }

    /**
     * @dev Ends the presale
     */
    function endPresale() external onlyOwner onlyWhenPresaleCreated nonReentrant {
        require(
            presaleState == PresaleState.Active || presaleState == PresaleState.Paused,
            "Presale must be active or paused to end"
        );
        presaleState = PresaleState.Ended;
        presaleEndTime = block.timestamp;
        if (paused()) {
            _unpause();
        }
        emit PresaleStateChanged(PresaleState.Ended);
    }

    /**
     * @dev Checks if the presale is currently active
     * @return bool True if presale is active, false otherwise
     */
    function isPresaleActive() external view returns (bool) {
        if (presaleState != PresaleState.Active || paused()) {
            return false;
        }

        return (block.timestamp >= presaleStartTime && block.timestamp < presaleEndTime);
    }

    /**
     * @dev Gets the current status of the presale
     * @return state Current state of the presale
     * @return active Whether the presale is active
     * @return started Whether the presale has started
     * @return ended Whether the presale has ended
     * @return tgeOccurred Whether the TGE has occurred
     */
    function getPresaleStatus()
        external
        view
        returns (PresaleState state, bool active, bool started, bool ended, bool tgeOccurred)
    {
        bool isActive = presaleState == PresaleState.Active &&
            !paused() &&
            block.timestamp >= presaleStartTime &&
            block.timestamp < presaleEndTime;

        return (
            presaleState,
            isActive,
            block.timestamp >= presaleStartTime,
            block.timestamp >= presaleEndTime || presaleState == PresaleState.Ended,
            block.timestamp >= tgeTimestamp
        );
    }

    /**
     * @dev Gets the details of the presale
     * @return state Current state of the presale
     * @return startTime Start time of the presale
     * @return endTime End time of the presale
     * @return tgeTime Time of the Token Generation Event
     * @return tokenAddr Address of the token being sold
     * @return supply Total supply of tokens for the presale
     */
    function getPresaleDetails()
        external
        view
        returns (
            PresaleState state,
            uint256 startTime,
            uint256 endTime,
            uint256 tgeTime,
            address tokenAddr,
            uint256 supply
        )
    {
        return (presaleState, presaleStartTime, presaleEndTime, tgeTimestamp, address(token), presaleTokenSupply);
    }
}
