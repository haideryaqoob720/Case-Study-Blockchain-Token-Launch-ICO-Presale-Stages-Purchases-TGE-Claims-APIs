// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockEndpoint
 * @dev Mock LayerZero endpoint for testing purposes
 */
contract MockEndpoint {
    mapping(address => address) public delegates;
    
    function setDelegate(address _delegate) external {
        delegates[msg.sender] = _delegate;
    }
    
    function getDelegate(address _oapp) external view returns (address) {
        return delegates[_oapp];
    }
}
