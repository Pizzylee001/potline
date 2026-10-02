// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SavingsCircle} from "../src/SavingsCircle.sol";
import {MockERC20} from "./mocks/MockToken.sol";

/// @dev Conservation checks: total paid in equals total paid out plus the balance left behind.
contract AccountingTest is Test {
    uint256 internal constant CONTRIBUTION = 10e6;
    uint256 internal constant MAX_MEMBERS = 4;
    uint256 internal constant ROUNDS = MAX_MEMBERS;
    uint256 internal constant TOTAL_IN = CONTRIBUTION * MAX_MEMBERS * ROUNDS;

    MockERC20 internal token;
    SavingsCircle internal circle;
    address[] internal members;

    function setUp() public {
        token = new MockERC20(6);
        circle = new SavingsCircle(address(token), CONTRIBUTION, MAX_MEMBERS);

        for (uint256 i = 0; i < MAX_MEMBERS; ++i) {
            address m = makeAddr(string(abi.encodePacked("member", i)));
            members.push(m);
            token.mint(m, 1_000e6);
            vm.prank(m);
            token.approve(address(circle), type(uint256).max);
            vm.prank(m);
            circle.join();
        }
    }

    function _contributeAll() internal {
        for (uint256 i = 0; i < members.length; ++i) {
            vm.prank(members[i]);
            circle.contribute();
        }
    }

    function _drainAll() internal {
        for (uint256 i = 0; i < members.length; ++i) {
            if (circle.claimablePayout(members[i]) > 0) {
                vm.prank(members[i]);
                circle.claim();
            }
            if (circle.claimable(members[i]) > 0) {
                vm.prank(members[i]);
                circle.withdrawCredit();
            }
        }
    }

    function _sumMemberBalances() internal view returns (uint256 sum) {
        for (uint256 i = 0; i < members.length; ++i) {
            sum += token.balanceOf(members[i]);
        }
    }

    function testFuzz_TotalPaidInEqualsTotalPaidOut(uint256 rawBid) public {
        uint256 sumBefore = _sumMemberBalances();
        uint256 pot = CONTRIBUTION * MAX_MEMBERS;
        uint256 bid = bound(rawBid, 0, pot); // zero means the first round has no bid

        // Round one, optionally with a winning bid from the first member.
        _contributeAll();
        if (bid > 0) {
            vm.prank(members[0]);
            circle.bid(bid);
        }
        circle.settleRound();

        // Rounds two to four have no bids.
        for (uint256 r = 0; r < ROUNDS - 1; ++r) {
            _contributeAll();
            circle.settleRound();
        }

        assertTrue(circle.completed());
        assertEq(token.balanceOf(address(circle)), TOTAL_IN);

        _drainAll();

        // As a group, members paid exactly TOTAL_IN and got exactly TOTAL_IN back.
        assertEq(_sumMemberBalances(), sumBefore);

        // Nothing is stranded in the circle.
        assertEq(token.balanceOf(address(circle)), 0);
    }

    function test_NoBidConservation() public {
        uint256 sumBefore = _sumMemberBalances();

        for (uint256 r = 0; r < ROUNDS; ++r) {
            _contributeAll();
            circle.settleRound();
        }

        assertTrue(circle.completed());
        assertEq(token.balanceOf(address(circle)), TOTAL_IN);

        _drainAll();

        assertEq(_sumMemberBalances(), sumBefore);
        assertEq(token.balanceOf(address(circle)), 0);
    }
}
