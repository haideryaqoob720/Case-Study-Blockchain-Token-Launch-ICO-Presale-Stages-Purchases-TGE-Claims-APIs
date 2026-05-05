// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Like {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

contract PresaleManagerMock {
    enum PresaleState {
        NotStarted,
        Active,
        Paused,
        Ended
    }

    address public token;
    address public trustedSigner;

    PresaleState private _state = PresaleState.NotStarted;
    bool private _active;
    bool private _started;
    bool private _ended;
    bool private _tgeOccurred;

    constructor(address _token, address _trustedSigner) {
        token = _token;
        trustedSigner = _trustedSigner;
    }

    function setStatus(PresaleState state, bool active, bool started, bool ended, bool tgeOccurred) external {
        _state = state;
        _active = active;
        _started = started;
        _ended = ended;
        _tgeOccurred = tgeOccurred;
    }

    function getPresaleStatus()
        external
        view
        returns (PresaleState state, bool active, bool started, bool ended, bool tgeOccurred)
    {
        return (_state, _active, _started, _ended, _tgeOccurred);
    }

    function tgeHasOccurred() external view returns (bool) {
        return _tgeOccurred;
    }
}
