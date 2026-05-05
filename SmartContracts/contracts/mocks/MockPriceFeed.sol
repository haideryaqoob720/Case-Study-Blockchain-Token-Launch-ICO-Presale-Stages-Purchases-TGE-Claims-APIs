// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockPriceFeed
 * @dev Mock implementation of Chainlink AggregatorV3Interface for testing
 */
contract MockPriceFeed is AggregatorV3Interface {
    uint8 public override decimals = 8;
    string public override description = "Mock ETH/USD Price Feed";
    uint256 public override version = 1;

    uint80 public roundId = 1;
    int256 public price = 2000 * 10**8; // $2000 with 8 decimals
    uint256 public startedAt = block.timestamp;
    uint256 public updatedAt = block.timestamp;
    uint80 public answeredInRound = 1;

    function setPrice(int256 _price) external {
        price = _price;
        updatedAt = block.timestamp;
        roundId++;
        answeredInRound = roundId;
    }

    function setStalePrice() external {
        updatedAt = block.timestamp - 4000; // Make it stale (> 1 hour)
    }

    function setInvalidPrice() external {
        price = -1; // Invalid price
    }

    function setInvalidRound() external {
        answeredInRound = roundId - 1; // Invalid round
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (roundId, price, startedAt, updatedAt, answeredInRound);
    }

    function getRoundData(uint80)
        external
        pure
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        revert("Not implemented");
    }
}
