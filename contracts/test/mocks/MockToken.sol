// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal mintable ERC20 that stands in for USDG in tests.
contract MockERC20 is ERC20 {
    uint8 private immutable _tokenDecimals;

    constructor(uint8 tokenDecimals_) ERC20("Mock USDG", "mUSDG") {
        _tokenDecimals = tokenDecimals_;
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice ERC20 that reenters a configured target on every transfer. Used to prove the circle
///         cannot be drained by a hostile token.
contract ReentrantToken is MockERC20 {
    address public target;
    bytes public payload;
    uint256 public reentered;
    bool public armed;

    constructor() MockERC20(6) {}

    function arm(address target_, bytes calldata payload_) external {
        target = target_;
        payload = payload_;
        armed = true;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        bool ok = super.transfer(to, value);
        if (armed) {
            (bool success,) = target.call(payload);
            if (success) {
                reentered += 1;
            }
        }
        return ok;
    }
}
