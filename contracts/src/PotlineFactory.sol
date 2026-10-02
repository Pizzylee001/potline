// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SavingsCircle} from "./SavingsCircle.sol";

/// @title PotlineFactory
/// @notice Deploys and indexes SavingsCircle instances for a single ERC20 token.
contract PotlineFactory {
    error ZeroToken();

    event CircleCreated(
        address indexed circle, address indexed creator, uint256 contributionAmount, uint256 maxMembers
    );

    /// @notice ERC20 every circle from this factory uses.
    IERC20 public immutable token;

    address[] private _circles;

    constructor(address token_) {
        if (token_ == address(0)) revert ZeroToken();
        token = IERC20(token_);
    }

    /// @notice Deploy a new savings circle and record it.
    /// @param contributionAmount Amount each member pays per round, in token units.
    /// @param maxMembers Member cap, at most 50. Zero is rejected.
    function createCircle(uint256 contributionAmount, uint256 maxMembers) external returns (SavingsCircle circle) {
        circle = new SavingsCircle(address(token), contributionAmount, maxMembers);
        _circles.push(address(circle));
        emit CircleCreated(address(circle), msg.sender, contributionAmount, maxMembers);
    }

    /// @notice Every circle this factory has deployed, in creation order.
    function allCircles() external view returns (address[] memory) {
        return _circles;
    }

    /// @notice Number of circles this factory has deployed.
    function circleCount() external view returns (uint256) {
        return _circles.length;
    }
}
