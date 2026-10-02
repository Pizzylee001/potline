// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {PotlineFactory} from "../src/PotlineFactory.sol";

/// @title DeployScript
/// @notice Deploys PotlineFactory to Arbitrum Sepolia. Run in Task 2 with --broadcast.
/// @dev ARB_SEPOLIA_RPC_URL and PRIVATE_KEY come from contracts/.env. Never commit those values.
contract DeployScript is Script {
    /// @dev USDG on Arbitrum Sepolia, 6 decimals.
    address internal constant USDG_ARB_SEPOLIA = 0xFFC95faa3d63Cde504a05B567C600B78C0b41892;

    function run() external returns (PotlineFactory factory) {
        address tokenAddress = vm.envOr("TOKEN_ADDRESS", USDG_ARB_SEPOLIA);

        vm.startBroadcast();
        factory = new PotlineFactory(tokenAddress);
        vm.stopBroadcast();

        console2.log("PotlineFactory:", address(factory));
        console2.log("Token:", tokenAddress);
    }
}
