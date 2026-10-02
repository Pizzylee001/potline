// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SavingsCircle} from "../src/SavingsCircle.sol";
import {ReentrantToken} from "./mocks/MockToken.sol";

/// @dev A hostile token reenters the circle during every transfer. The guard must block it and
///      the circle must keep an exact balance.
contract ReentrancyTest is Test {
    uint256 internal constant CONTRIBUTION = 10e6;

    ReentrantToken internal token;
    SavingsCircle internal circle;

    address internal alice;
    address internal bob;
    address internal carol;

    function setUp() public {
        token = new ReentrantToken();
        circle = new SavingsCircle(address(token), CONTRIBUTION, 3);

        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");

        address[3] memory m = [alice, bob, carol];
        for (uint256 i = 0; i < 3; ++i) {
            token.mint(m[i], 1_000e6);
            vm.prank(m[i]);
            token.approve(address(circle), type(uint256).max);
            vm.prank(m[i]);
            circle.join();
        }
    }

    function _contributeAll() internal {
        vm.prank(alice);
        circle.contribute();
        vm.prank(bob);
        circle.contribute();
        vm.prank(carol);
        circle.contribute();
    }

    function test_HostileTokenCannotDrainOnClaim() public {
        _contributeAll();
        circle.settleRound();

        assertEq(circle.recipientOf(1), alice);
        assertEq(token.balanceOf(address(circle)), 3 * CONTRIBUTION);

        // Arm the token to reenter claim() in the middle of alice's payout transfer.
        token.arm(address(circle), abi.encodeCall(SavingsCircle.claim, ()));

        vm.prank(alice);
        circle.claim();

        // The nested call reverted inside the guard, so nothing extra moved.
        assertEq(token.reentered(), 0);
        assertEq(circle.claimablePayout(alice), 0);
        assertEq(token.balanceOf(address(circle)), 0);
        // Alice paid one contribution and took the three member pot.
        assertEq(token.balanceOf(alice), 1_000e6 - CONTRIBUTION + 3 * CONTRIBUTION);
    }

    function test_HostileTokenCannotDrainOnCreditWithdraw() public {
        _contributeAll();
        vm.prank(alice);
        circle.bid(6e6);
        circle.settleRound();

        assertEq(circle.claimable(bob), 3e6);
        assertEq(circle.claimable(carol), 3e6);

        token.arm(address(circle), abi.encodeCall(SavingsCircle.withdrawCredit, ()));

        vm.prank(bob);
        circle.withdrawCredit();

        assertEq(token.reentered(), 0);
        assertEq(circle.claimable(bob), 0);
        assertEq(circle.claimable(carol), 3e6);
        // Bob paid one contribution and pulled his one third share of the bid.
        assertEq(token.balanceOf(bob), 1_000e6 - CONTRIBUTION + 3e6);
    }
}
