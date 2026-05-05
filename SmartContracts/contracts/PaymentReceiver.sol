// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PaymentReceiver
 * @dev Contract to handle token purchases with native currency or ERC20 tokens
 */
contract PaymentReceiver is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    struct Purchase {
        uint256 amount;
        address token;
        uint256 timestamp;
        uint256 stageId;
        uint256 tokenAmount;
    }

    uint8 private constant PROJECT_TOKEN_DECIMALS = 18;
    uint256 private constant EXTRA_BONES_BONUS_PERCENTAGE = 5;
    uint256 private constant REFERRAL_DIVISOR = 10; // Used as divisor: amount / 10 = 10% referral fee
    uint256 private constant PRICE_STALENESS_PERIOD = 10800; // 3 hours
    uint256 public constant MAX_DEADLINE_DURATION = 30 minutes; // signatures valid at most 30 minutes ahead

    string public chainId;
    address public masterWallet;
    address public trustedSigner;
    uint256 public minPurchaseAmount;
    uint256 public maxBonusTokensDistribution;
    uint256 public totalBonusTokensDistributed;
    bool public bonusDistributionCapEnabled = false;
    AggregatorV3Interface public nativePriceFeed;

    mapping(address => bool) public userExtraBones;
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public tokenMinPurchaseAmount;
    mapping(address => uint8) public tokenDecimals;
    mapping(address => Purchase[]) public userPurchases;
    mapping(address => uint256) public userTotalPurchases;
    mapping(address => uint256) public userTokenAmount;
    mapping(address => bool) public wertRelayer;
    mapping(address => uint256) public nonces;
    mapping(address => bool) public isStableToken;
    mapping(address => AggregatorV3Interface) public tokenPriceFeeds;

    event PurchaseEvent(address indexed buyer, uint256 amount, string chainId, uint256 stageId, uint256 tokenAmount);
    event ReferralRewardPaid(
        address indexed referrer,
        address indexed buyer,
        uint256 amount,
        address token,
        uint256 totalAmount
    );
    event TokenSupportUpdated(address token, bool isSupported);
    event MinPurchaseAmountUpdated(address token, uint256 amount);
    event ExtraBonesActivated(address indexed user);
    event ExtraBonesDeactivated(address indexed user);
    event BonusDistributionCapSet(uint256 maxBonusTokens);
    event BonusDistributionCapToggled(bool enabled);
    event BonusTokensDistributed(address indexed user, uint256 bonusAmount, uint256 totalBonusDistributed);
    event WertRelayerUpdated(address relayer, bool allowed);
    event MasterWalletUpdated(address newWallet);
    event NativePriceFeedUpdated(address newPriceFeed);
    event TokenPriceFeedUpdated(address token, address priceFeed);
    event TokenWithdrawn(address token, address to, uint256 amount);
    event NativeWithdrawn(address to, uint256 amount);
    event NonceUsed(address indexed user, uint256 nonce);
    event TrustedSignerUpdated(address oldSigner, address newSigner);

    error InvalidAddress();
    error InsufficientPayment();
    error InvalidPriceFeed();
    error InvalidPrice();
    error StalePriceFeed();
    error ExtraBonesAlreadyActivated();
    error ExtraBonesNotActivated();
    error TokenNotSupported();
    error IndexOutOfBounds();
    error CapMustBeGreaterThanDistributed();
    error ZeroAmount();
    error SignatureExpired();
    error InvalidSignature();
    error NonceAlreadyUsed();
    error BonusCapExceeded();
    error DeadlineTooFar();

    /**
     * @dev Constructor to initialize the contract
     * @param _owner Address of the contract owner
     * @param _chainId Chain ID as a string
     * @param _masterWallet Address to receive payments
     * @param _minPurchaseAmount Minimum purchase amount in wei
     * @param _nativePriceFeed Address of the Chainlink price feed for native currency
     * @param _signerAddress Address that signs transaction data
     */
    constructor(
        address _owner,
        string memory _chainId,
        address _masterWallet,
        uint256 _minPurchaseAmount,
        address _nativePriceFeed,
        address _signerAddress
    ) Ownable(_owner) {
        if (_masterWallet == address(0)) revert InvalidAddress();
        if (_nativePriceFeed == address(0)) revert InvalidPriceFeed();
        if (_minPurchaseAmount == 0) revert ZeroAmount();
        if (_signerAddress == address(0)) revert InvalidAddress();

        chainId = _chainId;
        masterWallet = _masterWallet;
        minPurchaseAmount = _minPurchaseAmount;
        nativePriceFeed = AggregatorV3Interface(_nativePriceFeed);
        trustedSigner = _signerAddress;
    }

    /**
     * @dev Modifier to restrict access to authorized Wert relayers
     */
    modifier onlyWertRelayer() {
        require(wertRelayer[msg.sender], "Not authorized Wert relayer");
        _;
    }

    /**
     * @dev Sets or revokes authorization for a Wert relayer
     * @param relayer Address of the relayer
     * @param allowed Whether the relayer is authorized
     */
    function setWertRelayer(address relayer, bool allowed) external onlyOwner {
        if (relayer == address(0)) revert InvalidAddress();
        wertRelayer[relayer] = allowed;
        emit WertRelayerUpdated(relayer, allowed);
    }

    /**
     * @dev Activates extra bones bonus for the caller
     */
    function activateExtraBones() external {
        if (!bonusDistributionCapEnabled) revert ExtraBonesNotActivated();
        if (userExtraBones[msg.sender]) revert ExtraBonesAlreadyActivated();
        userExtraBones[msg.sender] = true;
        emit ExtraBonesActivated(msg.sender);
    }

    /**
     * @dev Deactivates extra bones bonus for the caller
     */
    function deactivateExtraBones() external {
        if (!userExtraBones[msg.sender]) revert ExtraBonesNotActivated();
        userExtraBones[msg.sender] = false;
        emit ExtraBonesDeactivated(msg.sender);
    }

    /**
     * @dev Checks if a user has extra bones activated
     * @param user Address of the user to check
     * @return bool Whether the user has extra bones
     */
    function hasExtraBones(address user) external view returns (bool) {
        return userExtraBones[user];
    }

    /**
     * @dev View function to calculate extra tokens without mutation
     * Used for read-only calculations
     * @param baseTokenAmount Base amount of tokens
     * @param user Address of the user
     * @return uint256 Amount of extra tokens that would be distributed
     */
    function _calculateExtraTokensView(uint256 baseTokenAmount, address user) internal view returns (uint256) {
        if (!bonusDistributionCapEnabled || !userExtraBones[user]) {
            return 0;
        }

        // Calculate the desired bonus
        uint256 calculatedBonus = (baseTokenAmount * EXTRA_BONES_BONUS_PERCENTAGE) / 100;

        // Check remaining capacity
        if (totalBonusTokensDistributed >= maxBonusTokensDistribution) {
            return 0;
        }

        uint256 remainingBonus = maxBonusTokensDistribution - totalBonusTokensDistributed;

        // Cap the bonus to remaining capacity
        return calculatedBonus > remainingBonus ? remainingBonus : calculatedBonus;
    }

    /**
     * @dev Calculates and applies extra tokens based on bonus percentage
     * This function atomically calculates the bonus and updates the total distributed,
     * enforcing the cap at mutation time to prevent race conditions
     * @param baseTokenAmount Base amount of tokens
     * @param user Address of the user
     * @return uint256 Amount of extra tokens actually distributed
     */
    function _calculateAndApplyExtraTokens(uint256 baseTokenAmount, address user) internal returns (uint256) {
        if (!bonusDistributionCapEnabled || !userExtraBones[user]) {
            return 0;
        }

        // Calculate the desired bonus
        uint256 calculatedBonus = (baseTokenAmount * EXTRA_BONES_BONUS_PERCENTAGE) / 100;

        // Read current state - this is our snapshot for the entire calculation
        uint256 currentTotal = totalBonusTokensDistributed;

        // Early return if already at or exceeding cap
        if (currentTotal >= maxBonusTokensDistribution) {
            return 0;
        }

        // Calculate what the new total would be if we added the full calculated bonus
        uint256 desiredNewTotal = currentTotal + calculatedBonus;

        uint256 newTotal;
        unchecked {
            // Safe to use unchecked here because we checked currentTotal < maxBonusTokensDistribution above
            newTotal = desiredNewTotal > maxBonusTokensDistribution ? maxBonusTokensDistribution : desiredNewTotal;
        }

        // Calculate the actual bonus that will be applied (may be less than calculated if cap is hit)
        // This is safe because newTotal >= currentTotal (due to min() logic)
        uint256 actualBonus = newTotal - currentTotal;

        // Update the state atomically - this single write operation is the critical mutation point
        // The cap enforcement above ensures this will never exceed maxBonusTokensDistribution
        totalBonusTokensDistributed = newTotal;

        return actualBonus;
    }

    /**
     * @dev Verifies if a signature is valid and checks nonce
     * @param user Address of the user
     * @param hash Message hash that was signed
     * @param nonce User's nonce for replay protection
     * @param signature Signature to verify
     * @return bool Whether the signature is valid
     */
    function verifySignature(
        address user,
        bytes32 hash,
        uint256 nonce,
        bytes calldata signature
    ) internal returns (bool) {
        if (nonce != nonces[user]) revert NonceAlreadyUsed();

        bytes32 messageHash = keccak256(abi.encodePacked(hash, nonce));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);
        bool isValid = recoveredSigner == trustedSigner;

        if (isValid) {
            nonces[user]++;
            emit NonceUsed(user, nonce);
        }

        return isValid;
    }

    /**
     * @dev Allows Wert relayers to buy tokens with native currency for a beneficiary
     * @param beneficiary Address of the token recipient
     * @param referrer Address of the referrer
     * @param stageId ID of the presale stage
     * @param pricePerToken Price per token in USD (8 decimals)
     */
    function buyWithNativeForWert(
        address beneficiary,
        address referrer,
        uint256 stageId,
        uint256 pricePerToken,
        uint256 nativeAmount,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant onlyWertRelayer {
        if (deadline > block.timestamp + MAX_DEADLINE_DURATION) revert DeadlineTooFar();
        if (block.timestamp > deadline) revert SignatureExpired();
        if (msg.value < minPurchaseAmount) revert InsufficientPayment();
        if (beneficiary == address(0)) revert InvalidAddress();
        if (pricePerToken == 0) revert ZeroAmount();
        if (nativeAmount != msg.value) revert InvalidPrice();

        // Create hash using beneficiary's address and other parameters
        bytes32 hash = keccak256(
            abi.encodePacked(
                beneficiary,
                referrer,
                stageId,
                pricePerToken,
                nativeAmount,
                deadline,
                block.chainid,
                address(this)
            )
        );

        // Verify signature using beneficiary's address
        if (!verifySignature(beneficiary, hash, nonce, signature)) revert InvalidSignature();

        uint256 usdValue = getNativeUsdValue(msg.value);
        uint256 baseTokenAmount = (usdValue * (10 ** PROJECT_TOKEN_DECIMALS)) / (pricePerToken * (10 ** 10));
        uint256 bonusTokens = _calculateAndApplyExtraTokens(baseTokenAmount, beneficiary);
        uint256 totalTokenAmount = baseTokenAmount + bonusTokens;

        userPurchases[beneficiary].push(Purchase(msg.value, address(0), block.timestamp, stageId, totalTokenAmount));
        userTotalPurchases[beneficiary] += msg.value;
        userTokenAmount[beneficiary] += totalTokenAmount;

        if (referrer != address(0) && referrer != msg.sender && referrer != beneficiary) {
            uint256 referralCut = msg.value / REFERRAL_DIVISOR;
            (bool success1, ) = payable(referrer).call{ value: referralCut }("");
            require(success1, "Referral payment failed");

            (bool success2, ) = payable(masterWallet).call{ value: msg.value - referralCut }("");
            require(success2, "Master wallet payment failed");

            emit ReferralRewardPaid(referrer, beneficiary, referralCut, address(0), msg.value);
        } else {
            (bool success, ) = payable(masterWallet).call{ value: msg.value }("");
            require(success, "Payment failed");
        }

        emit PurchaseEvent(beneficiary, msg.value, chainId, stageId, totalTokenAmount);

        if (bonusTokens > 0) {
            emit BonusTokensDistributed(beneficiary, bonusTokens, totalBonusTokensDistributed);
        }
    }

    /**
     * @dev Allows users to buy tokens with native currency
     * @param referrer Address of the referrer
     * @param stageId ID of the presale stage
     * @param pricePerToken Price per token in USD (8 decimals)
     * @param deadline Timestamp after which the signature is invalid
     * @param nonce User's nonce for replay protection
     * @param signature Signature from trusted backend
     */
    function buyWithNative(
        address referrer,
        uint256 stageId,
        uint256 pricePerToken,
        uint256 nativeAmount,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant {
        if (deadline > block.timestamp + MAX_DEADLINE_DURATION) revert DeadlineTooFar();
        if (block.timestamp > deadline) revert SignatureExpired();

        bytes32 hash = keccak256(
            abi.encodePacked(msg.sender, stageId, pricePerToken, nativeAmount, deadline, block.chainid, address(this))
        );
        if (!verifySignature(msg.sender, hash, nonce, signature)) revert InvalidSignature();

        if (msg.value < minPurchaseAmount) revert InsufficientPayment();
        if (pricePerToken == 0) revert ZeroAmount();
        if (nativeAmount != msg.value) revert InvalidPrice();

        uint256 usdValue = getNativeUsdValue(msg.value);
        uint256 baseTokenAmount = (usdValue * (10 ** PROJECT_TOKEN_DECIMALS)) / (pricePerToken * (10 ** 10));
        uint256 bonusTokens = _calculateAndApplyExtraTokens(baseTokenAmount, msg.sender);
        uint256 totalTokenAmount = baseTokenAmount + bonusTokens;

        userPurchases[msg.sender].push(Purchase(msg.value, address(0), block.timestamp, stageId, totalTokenAmount));
        userTotalPurchases[msg.sender] += msg.value;
        userTokenAmount[msg.sender] += totalTokenAmount;

        _handleNativeTransfers(msg.value, referrer);

        emit PurchaseEvent(msg.sender, msg.value, chainId, stageId, totalTokenAmount);

        if (bonusTokens > 0) {
            emit BonusTokensDistributed(msg.sender, bonusTokens, totalBonusTokensDistributed);
        }
    }

    /**
     * @dev Handles native currency transfers including referral payments
     * @param purchaseAmount Amount of native currency
     * @param referrer Address of the referrer
     */
    function _handleNativeTransfers(uint256 purchaseAmount, address referrer) internal {
        if (referrer != address(0) && referrer != msg.sender) {
            uint256 referralCut = purchaseAmount / REFERRAL_DIVISOR;
            (bool success1, ) = payable(referrer).call{ value: referralCut }("");
            require(success1, "Referral payment failed");

            (bool success2, ) = payable(masterWallet).call{ value: purchaseAmount - referralCut }("");
            require(success2, "Master wallet payment failed");

            emit ReferralRewardPaid(referrer, msg.sender, referralCut, address(0), purchaseAmount);
        } else {
            (bool success, ) = payable(masterWallet).call{ value: purchaseAmount }("");
            require(success, "Payment failed");
        }
    }

    /**
     * @dev Allows users to buy tokens with ERC20 tokens
     * @param token Address of the ERC20 token
     * @param amount Amount of tokens to spend
     * @param referrer Address of the referrer
     * @param stageId ID of the presale stage
     * @param pricePerToken Price per token in USD (8 decimals)
     * @param deadline Timestamp after which the signature is invalid
     * @param nonce User's nonce for replay protection
     * @param signature Signature from trusted backend
     */
    function buyWithToken(
        address token,
        uint256 amount,
        address referrer,
        uint256 stageId,
        uint256 pricePerToken,
        uint256 deadline,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (amount < tokenMinPurchaseAmount[token]) revert InsufficientPayment();
        if (pricePerToken == 0) revert ZeroAmount();
        if (deadline > block.timestamp + MAX_DEADLINE_DURATION) revert DeadlineTooFar();
        if (block.timestamp > deadline) revert SignatureExpired();

        bytes32 hash = keccak256(
            abi.encodePacked(msg.sender, token, amount, stageId, pricePerToken, deadline, block.chainid, address(this))
        );
        if (!verifySignature(msg.sender, hash, nonce, signature)) revert InvalidSignature();

        // Pull tokens into the contract and measure actual received (handles fee-on-transfer tokens)
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 afterBalance = IERC20(token).balanceOf(address(this));
        uint256 received = afterBalance - beforeBalance;

        // Get the USD value of actually received tokens using Chainlink price feed
        uint256 paymentValueInUsd = getTokenUsdValue(token, received);

        uint256 baseTokenAmount = (paymentValueInUsd * (10 ** PROJECT_TOKEN_DECIMALS)) / (pricePerToken * (10 ** 10));
        uint256 bonusTokens = _calculateAndApplyExtraTokens(baseTokenAmount, msg.sender);
        uint256 totalTokenAmount = baseTokenAmount + bonusTokens;

        userPurchases[msg.sender].push(Purchase(amount, token, block.timestamp, stageId, totalTokenAmount));
        userTotalPurchases[msg.sender] += amount;
        userTokenAmount[msg.sender] += totalTokenAmount;

        _handleTokenTransfers(token, received, referrer);

        emit PurchaseEvent(msg.sender, amount, chainId, stageId, totalTokenAmount);

        if (bonusTokens > 0) {
            emit BonusTokensDistributed(msg.sender, bonusTokens, totalBonusTokensDistributed);
        }
    }

    /**
     * @dev Handles ERC20 token transfers including referral payments
     * @param token Address of the ERC20 token
     * @param receivedAmount Received amount of tokens
     * @param referrer Address of the referrer
     */
    function _handleTokenTransfers(address token, uint256 receivedAmount, address referrer) internal {
        if (referrer != address(0) && referrer != msg.sender) {
            uint256 referralCut = receivedAmount / REFERRAL_DIVISOR;
            IERC20(token).safeTransfer(referrer, referralCut);
            IERC20(token).safeTransfer(masterWallet, receivedAmount - referralCut);
            emit ReferralRewardPaid(referrer, msg.sender, referralCut, token, receivedAmount);
        } else {
            IERC20(token).safeTransfer(masterWallet, receivedAmount);
        }
    }

    /**
     * @dev Gets the current USD price of the native currency
     * @return uint256 Price in USD (18 decimals)
     */
    function getNativeUsdPrice() public view returns (uint256) {
        return _getPriceFromFeed();
    }

    /**
     * @dev Calculates the USD value of an amount of native currency
     * @param amount Amount of native currency
     * @return uint256 Value in USD (18 decimals)
     */
    function getNativeUsdValue(uint256 amount) public view returns (uint256) {
        uint256 price = getNativeUsdPrice();
        return (amount * price) / 1e18;
    }

    /**
     * @dev Gets the price from the Chainlink price feed for native currency
     * @return uint256 Price in USD (18 decimals)
     */
    function _getPriceFromFeed() internal view returns (uint256) {
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = nativePriceFeed.latestRoundData();

        // Check for valid price
        if (price <= 0) revert InvalidPrice();
        if (roundId != answeredInRound) revert StalePriceFeed();

        // Check if price is stale (older than 1 hour)
        if (block.timestamp - updatedAt > PRICE_STALENESS_PERIOD) revert StalePriceFeed();

        // Get decimals and normalize to 18 decimals
        uint8 decimals = nativePriceFeed.decimals();
        return uint256(price) * (10 ** (18 - decimals));
    }

    /**
     * @dev Gets the USD price of a token from its Chainlink price feed
     *      For tokens marked as stable (e.g., USDT/USDC), if the price feed
     *      is missing or returns an invalid/stale price, this function
     *      gracefully falls back to 1 USD (1e18) instead of reverting.
     * @param token Address of the token
     * @return uint256 Price in USD (18 decimals)
     */
    function getTokenUsdPrice(address token) public view returns (uint256) {
        if (!supportedTokens[token]) revert TokenNotSupported();

        AggregatorV3Interface priceFeed = tokenPriceFeeds[token];

        // If no configured price feed:
        if (address(priceFeed) == address(0)) {
            // Stablecoins fall back to 1 USD, volatile tokens revert
            if (isStableToken[token]) {
                return 1e18;
            }
            revert InvalidPriceFeed();
        }

        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();

        // For stable tokens, any invalid or stale conditions cause a fallback to 1 USD
        bool invalidPrice = price <= 0;
        bool invalidRound = roundId != answeredInRound;
        bool isStale = block.timestamp - updatedAt > PRICE_STALENESS_PERIOD;

        if (isStableToken[token] && (invalidPrice || invalidRound || isStale)) {
            return 1e18;
        }

        // Non-stable tokens keep strict behavior
        if (invalidPrice) revert InvalidPrice();
        if (invalidRound || isStale) revert StalePriceFeed();

        // Get decimals and normalize to 18 decimals
        uint8 decimals = priceFeed.decimals();
        return uint256(price) * (10 ** (18 - decimals));
    }

    /**
     * @dev Calculates the USD value of an amount of tokens
     * @param token Address of the token
     * @param amount Amount of tokens
     * @return uint256 Value in USD (18 decimals)
     */
    function getTokenUsdValue(address token, uint256 amount) public view returns (uint256) {
        if (!supportedTokens[token]) revert TokenNotSupported();
        uint8 tokenDecimalPlaces = tokenDecimals[token];

        // Normalize amount to 18 decimals before multiplying by price
        uint256 normalizedAmount;
        if (tokenDecimalPlaces < 18) {
            normalizedAmount = amount * (10 ** (18 - tokenDecimalPlaces));
        } else {
            normalizedAmount = amount / (10 ** (tokenDecimalPlaces - 18));
        }

        uint256 price = getTokenUsdPrice(token);
        return (normalizedAmount * price) / 1e18;
    }

    /**
     * @dev Gets the number of purchases made by a user
     * @param user Address of the user
     * @return uint256 Number of purchases
     */
    function getUserPurchaseCount(address user) external view returns (uint256) {
        return userPurchases[user].length;
    }

    /**
     * @dev Gets details of a specific purchase made by a user
     * @param user Address of the user
     * @param index Index of the purchase
     * @return amount Amount of currency spent
     * @return token Address of the token used (address(0) for native)
     * @return timestamp Time of the purchase
     * @return stageId ID of the presale stage
     * @return tokenAmount Amount of tokens purchased
     */
    function getUserPurchase(
        address user,
        uint256 index
    ) external view returns (uint256 amount, address token, uint256 timestamp, uint256 stageId, uint256 tokenAmount) {
        if (index >= userPurchases[user].length) revert IndexOutOfBounds();
        Purchase memory p = userPurchases[user][index];
        return (p.amount, p.token, p.timestamp, p.stageId, p.tokenAmount);
    }

    /**
     * @dev Sets the master wallet address
     * @param _wallet New master wallet address
     */
    function setMasterWallet(address _wallet) external onlyOwner {
        if (_wallet == address(0)) revert InvalidAddress();
        masterWallet = _wallet;
        emit MasterWalletUpdated(_wallet);
    }

    /**
     * @dev Sets support for an ERC20 token
     * @param token Address of the token
     * @param isSupported Whether the token is supported
     * @param minAmount Minimum purchase amount
     * @param priceFeed Address of the Chainlink price feed for this token
     */
    function setTokenSupport(address token, bool isSupported, uint256 minAmount, address priceFeed) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        // For non-stable tokens, a valid Chainlink price feed is required.
        // For stablecoins (e.g., USDC/USDT) marked in isStableToken, priceFeed can be zero.
        if (isSupported && priceFeed == address(0) && !isStableToken[token]) revert InvalidPriceFeed();

        supportedTokens[token] = isSupported;
        if (isSupported) {
            tokenMinPurchaseAmount[token] = minAmount;
            uint8 onChainDecimals = IERC20Metadata(token).decimals();
            tokenDecimals[token] = onChainDecimals;
            emit MinPurchaseAmountUpdated(token, minAmount);

            // Only configure a Chainlink price feed for non-stable tokens
            if (!isStableToken[token]) {
                tokenPriceFeeds[token] = AggregatorV3Interface(priceFeed);
                emit TokenPriceFeedUpdated(token, priceFeed);
            }
        } else {
            // Clear stale configuration when disabling a token
            // This prevents confusion and accidental use of old configuration
            delete tokenMinPurchaseAmount[token];
            delete tokenDecimals[token];
            delete tokenPriceFeeds[token];
        }
        emit TokenSupportUpdated(token, isSupported);
    }

    /**
     * @dev Sets the Chainlink price feed for the native currency
     * @param priceFeed Address of the price feed
     */
    function setNativePriceFeed(address priceFeed) external onlyOwner {
        if (priceFeed == address(0)) revert InvalidPriceFeed();
        nativePriceFeed = AggregatorV3Interface(priceFeed);
        emit NativePriceFeedUpdated(priceFeed);
    }

    /**
     * @dev Marks or unmarks a token as a USD-pegged stablecoin (e.g., USDC/USDT)
     * Stablecoins are always treated as 1 USD and do not use Chainlink price feeds
     * @param token Address of the token
     * @param stable Whether the token should be treated as a stablecoin
     */
    function setStableToken(address token, bool stable) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        isStableToken[token] = stable;
    }

    /**
     * @dev Sets the Chainlink price feed for a supported token
     *      For stable tokens, this feed will be used when valid and
     *      gracefully ignored (fallback to 1 USD) when invalid/stale.
     * @param token Address of the token
     * @param priceFeed Address of the price feed
     */
    function setTokenPriceFeed(address token, address priceFeed) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        if (priceFeed == address(0)) revert InvalidPriceFeed();
        if (!supportedTokens[token]) revert TokenNotSupported();

        tokenPriceFeeds[token] = AggregatorV3Interface(priceFeed);
        emit TokenPriceFeedUpdated(token, priceFeed);
    }

    /**
     * @dev Sets the minimum purchase amount for native currency
     * @param amount Minimum amount in wei
     */
    function setMinPurchaseAmount(uint256 amount) external onlyOwner {
        if (amount == 0) revert ZeroAmount();
        minPurchaseAmount = amount;
        emit MinPurchaseAmountUpdated(address(0), amount);
    }

    /**
     * @dev Sets the minimum purchase amount for an ERC20 token
     * @param token Address of the token
     * @param amount Minimum amount
     */
    function setTokenMinPurchaseAmount(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();
        if (!supportedTokens[token]) revert TokenNotSupported();
        tokenMinPurchaseAmount[token] = amount;
        emit MinPurchaseAmountUpdated(token, amount);
    }

    /**
     * @dev Withdraws native currency from the contract
     * @param to Address to receive the funds
     * @param amount Amount to withdraw
     */
    function withdrawNative(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (address(this).balance < amount) revert InsufficientPayment();

        (bool success, ) = to.call{ value: amount }("");
        require(success, "Native withdrawal failed");
        emit NativeWithdrawn(to, amount);
    }

    /**
     * @dev Withdraws ERC20 tokens from the contract
     * @param token Address of the token
     * @param to Address to receive the tokens
     * @param amount Amount to withdraw
     */
    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        IERC20 t = IERC20(token);
        if (t.balanceOf(address(this)) < amount) revert InsufficientPayment();
        t.safeTransfer(to, amount);
        emit TokenWithdrawn(token, to, amount);
    }

    /**
     * @dev Calculates the amount of native currency needed to buy a specific amount of tokens
     * @param desiredTokenAmount Desired amount of tokens
     * @param pricePerToken Price per token in USD (18 decimals)
     * @return nativeAmount Amount of native currency needed
     */
    function calculateNativeAmountForTokens(
        uint256 desiredTokenAmount,
        uint256 pricePerToken
    ) external view returns (uint256 nativeAmount) {
        if (desiredTokenAmount == 0 || pricePerToken == 0) revert ZeroAmount();
        uint256 usdValueNeeded = (desiredTokenAmount * pricePerToken) / (10 ** PROJECT_TOKEN_DECIMALS);
        uint256 nativePrice = getNativeUsdPrice();
        nativeAmount = (usdValueNeeded * 1e18) / nativePrice;
        return nativeAmount;
    }

    /**
     * @dev Calculates the amount of tokens that can be bought with a specific amount of native currency
     * @param nativeAmount Amount of native currency
     * @param pricePerToken Price per token in USD (18 decimals)
     * @return tokenAmount Amount of tokens
     */
    function calculateTokenAmountForNative(
        uint256 nativeAmount,
        uint256 pricePerToken
    ) external view returns (uint256 tokenAmount) {
        if (nativeAmount == 0 || pricePerToken == 0) revert ZeroAmount();
        uint256 usdValue = getNativeUsdValue(nativeAmount);
        tokenAmount = (usdValue * (10 ** PROJECT_TOKEN_DECIMALS)) / pricePerToken;
        return tokenAmount;
    }

    /**
     * @dev Calculates the amount of tokens that can be bought with a specific amount of native currency, including bonus
     * @param nativeAmount Amount of native currency
     * @param user Address of the user
     * @param pricePerToken Price per token in USD (18 decimals)
     * @return baseTokenAmount Base amount of tokens
     * @return bonusTokens Amount of bonus tokens
     * @return totalTokenAmount Total amount of tokens
     */
    function calculateTokenAmountForNativeWithBonus(
        uint256 nativeAmount,
        address user,
        uint256 pricePerToken
    ) external view returns (uint256 baseTokenAmount, uint256 bonusTokens, uint256 totalTokenAmount) {
        if (nativeAmount == 0 || pricePerToken == 0) revert ZeroAmount();
        uint256 usdValue = getNativeUsdValue(nativeAmount);
        baseTokenAmount = (usdValue * (10 ** PROJECT_TOKEN_DECIMALS)) / pricePerToken;
        bonusTokens = _calculateExtraTokensView(baseTokenAmount, user);
        totalTokenAmount = baseTokenAmount + bonusTokens;
        return (baseTokenAmount, bonusTokens, totalTokenAmount);
    }

    /**
     * @dev Calculates the amount of tokens that can be bought with a specific amount of ERC20 tokens, including bonus
     * @param token Address of the token
     * @param tokenAmount Amount of tokens
     * @param user Address of the user
     * @param pricePerToken Price per token in USD (18 decimals)
     * @return baseTokenAmount Base amount of tokens
     * @return bonusTokens Amount of bonus tokens
     * @return totalTokenAmount Total amount of tokens
     */
    function calculateTokenAmountForTokenWithBonus(
        address token,
        uint256 tokenAmount,
        address user,
        uint256 pricePerToken
    ) external view returns (uint256 baseTokenAmount, uint256 bonusTokens, uint256 totalTokenAmount) {
        if (tokenAmount == 0 || pricePerToken == 0) revert ZeroAmount();
        if (!supportedTokens[token]) revert TokenNotSupported();

        uint256 usdValue = getTokenUsdValue(token, tokenAmount);
        baseTokenAmount = (usdValue * (10 ** PROJECT_TOKEN_DECIMALS)) / pricePerToken;
        bonusTokens = _calculateExtraTokensView(baseTokenAmount, user);
        totalTokenAmount = baseTokenAmount + bonusTokens;
        return (baseTokenAmount, bonusTokens, totalTokenAmount);
    }

    /**
     * @dev Calculates the amount of native currency needed to buy a specific amount of tokens, including bonus
     * @param desiredTotalTokenAmount Desired total amount of tokens
     * @param user Address of the user
     * @param pricePerToken Price per token in USD (18 decimals)
     * @return nativeAmount Amount of native currency needed
     */
    function calculateNativeAmountForTokensWithBonus(
        uint256 desiredTotalTokenAmount,
        address user,
        uint256 pricePerToken
    ) external view returns (uint256 nativeAmount) {
        if (desiredTotalTokenAmount == 0 || pricePerToken == 0) revert ZeroAmount();
        uint256 baseTokenAmount;
        if (userExtraBones[user]) {
            baseTokenAmount = (desiredTotalTokenAmount * 100) / (100 + EXTRA_BONES_BONUS_PERCENTAGE);
        } else {
            baseTokenAmount = desiredTotalTokenAmount;
        }

        uint256 usdValueNeeded = (baseTokenAmount * pricePerToken) / (10 ** PROJECT_TOKEN_DECIMALS);
        uint256 nativePrice = getNativeUsdPrice();
        nativeAmount = (usdValueNeeded * 1e18) / nativePrice;
        return nativeAmount;
    }

    /**
     * @dev Sets the cap for bonus token distribution
     * @param _maxBonusTokens Maximum amount of bonus tokens
     */
    function setBonusDistributionCap(uint256 _maxBonusTokens) external onlyOwner {
        if (_maxBonusTokens <= totalBonusTokensDistributed) revert CapMustBeGreaterThanDistributed();
        maxBonusTokensDistribution = _maxBonusTokens;
        emit BonusDistributionCapSet(_maxBonusTokens);
    }

    /**
     * @dev Toggles the bonus distribution cap
     */
    function toggleBonusDistributionCap() external onlyOwner {
        bonusDistributionCapEnabled = !bonusDistributionCapEnabled;
        emit BonusDistributionCapToggled(bonusDistributionCapEnabled);
    }

    /**
     * @dev Gets statistics about bonus token distribution
     * @return maxBonusTokens Maximum amount of bonus tokens
     * @return distributed Amount of bonus tokens distributed
     * @return remaining Amount of bonus tokens remaining
     * @return capEnabled Whether the cap is enabled
     */
    function getBonusDistributionStats()
        external
        view
        returns (uint256 maxBonusTokens, uint256 distributed, uint256 remaining, bool capEnabled)
    {
        return (
            maxBonusTokensDistribution,
            totalBonusTokensDistributed,
            maxBonusTokensDistribution > totalBonusTokensDistributed
                ? maxBonusTokensDistribution - totalBonusTokensDistributed
                : 0,
            bonusDistributionCapEnabled
        );
    }

    /**
     * @dev Gets the remaining amount of bonus tokens
     * @return uint256 Remaining amount of bonus tokens
     */
    function getRemainingBonusTokens() external view returns (uint256) {
        if (!bonusDistributionCapEnabled) return type(uint256).max;
        return
            maxBonusTokensDistribution > totalBonusTokensDistributed
                ? maxBonusTokensDistribution - totalBonusTokensDistributed
                : 0;
    }

    /**
     * @dev Updates the trusted signer address
     * @param _newSigner New trusted signer address
     */
    function setTrustedSigner(address _newSigner) external onlyOwner {
        address oldSigner = trustedSigner;
        trustedSigner = _newSigner;
        emit TrustedSignerUpdated(oldSigner, _newSigner);
    }
}
