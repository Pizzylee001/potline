// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SavingsCircle} from "../src/SavingsCircle.sol";
import {MockERC20} from "./mocks/MockToken.sol";

contract SavingsCircleTest is Test {
    uint256 internal constant CONTRIBUTION = 10e6; // 10 USDG, 6 decimals
    uint256 internal constant MAX_MEMBERS = 4;
    uint256 internal constant POT = CONTRIBUTION * MAX_MEMBERS; // 40 USDG

    MockERC20 internal token;
    SavingsCircle internal circle;

    address internal alice;
    address internal bob;
    address internal carol;
    address internal dave;
    address internal erin;
    address[] internal members;

    function setUp() public {
        token = new MockERC20(6);
        circle = new SavingsCircle(address(token), CONTRIBUTION, MAX_MEMBERS);

        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");
        dave = makeAddr("dave");
        erin = makeAddr("erin");

        members.push(alice);
        members.push(bob);
        members.push(carol);
        members.push(dave);
        members.push(erin);

        for (uint256 i = 0; i < members.length; ++i) {
            token.mint(members[i], 1_000e6);
            vm.prank(members[i]);
            token.approve(address(circle), type(uint256).max);
        }
    }

    // --------------------------------------------------------------- helpers

    function _join(address who) internal {
        vm.prank(who);
        circle.join();
    }

    function _contribute(address who) internal {
        vm.prank(who);
        circle.contribute();
    }

    function _bid(address who, uint256 amount) internal {
        vm.prank(who);
        circle.bid(amount);
    }

    function _claim(address who) internal {
        vm.prank(who);
        circle.claim();
    }

    function _withdrawCredit(address who) internal {
        vm.prank(who);
        circle.withdrawCredit();
    }

    function _joinFour() internal {
        _join(alice);
        _join(bob);
        _join(carol);
        _join(dave);
    }

    function _allFourContribute() internal {
        _contribute(alice);
        _contribute(bob);
        _contribute(carol);
        _contribute(dave);
    }

    // ------------------------------------------------------------- join rules

    function test_JoinRecordsOrderAndBlocksDoubleJoin() public {
        _joinFour();

        address[] memory m = circle.members();
        assertEq(m.length, 4);
        assertEq(m[0], alice);
        assertEq(m[1], bob);
        assertEq(m[2], carol);
        assertEq(m[3], dave);
        assertEq(circle.memberCount(), 4);
        assertTrue(circle.isMember(alice));
        assertFalse(circle.isMember(erin));

        vm.prank(alice);
        vm.expectRevert(SavingsCircle.AlreadyMember.selector);
        circle.join();
    }

    function test_JoinRespectsMaxMembers() public {
        SavingsCircle small = new SavingsCircle(address(token), CONTRIBUTION, 2);
        vm.prank(alice);
        token.approve(address(small), type(uint256).max);
        vm.prank(bob);
        token.approve(address(small), type(uint256).max);

        vm.prank(alice);
        small.join();
        vm.prank(bob);
        small.join();
        assertEq(small.memberCount(), 2);

        vm.prank(carol);
        vm.expectRevert(SavingsCircle.CircleFull.selector);
        small.join();
    }

    // --------------------------------------------------------- contribute rules

    function test_ContributeBlocksNonMemberAndDoublePay() public {
        vm.prank(alice);
        vm.expectRevert(SavingsCircle.NotMember.selector);
        circle.contribute();

        _join(alice);
        _contribute(alice);

        assertEq(circle.potThisRound(), CONTRIBUTION);
        assertEq(circle.contributedCount(), 1);
        assertEq(token.balanceOf(address(circle)), CONTRIBUTION);

        vm.prank(alice);
        vm.expectRevert(SavingsCircle.AlreadyContributed.selector);
        circle.contribute();
    }

    // -------------------------------------------------------------- bid rules

    function test_BidRequiresPriorContributionThisRound() public {
        _joinFour();

        vm.prank(alice);
        vm.expectRevert(SavingsCircle.NoContributionThisRound.selector);
        circle.bid(1e6);

        vm.prank(erin);
        vm.expectRevert(SavingsCircle.NotMember.selector);
        circle.bid(1e6);
    }

    function test_BidKeepsOnlyHighest() public {
        _joinFour();
        _allFourContribute();

        _bid(alice, 5e6);
        assertEq(circle.topBid(), 5e6);
        assertEq(circle.topBidder(), alice);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(SavingsCircle.BidTooLow.selector, 4e6, 5e6));
        circle.bid(4e6);

        _bid(bob, 9e6);
        assertEq(circle.topBid(), 9e6);
        assertEq(circle.topBidder(), bob);

        vm.prank(carol);
        vm.expectRevert(abi.encodeWithSelector(SavingsCircle.BidAbovePot.selector, POT + 1, POT));
        circle.bid(POT + 1);

        vm.prank(carol);
        vm.expectRevert(SavingsCircle.BidZero.selector);
        circle.bid(0);
    }

    // ------------------------------------------------------------ settle rules

    function test_SettleBlocksUntilAllMembersPaid() public {
        _joinFour();
        _contribute(alice);
        _contribute(bob);
        _contribute(carol);

        vm.expectRevert(abi.encodeWithSelector(SavingsCircle.RoundNotFull.selector, 3, 4));
        circle.settleRound();

        _contribute(dave);
        circle.settleRound();

        assertEq(circle.recipientOf(1), alice);
        assertEq(circle.roundPayout(1), POT);
        assertEq(circle.currentRound(), 2);
        assertEq(circle.potThisRound(), 0);
        assertEq(circle.contributedCount(), 0);
        assertEq(circle.topBid(), 0);
        assertEq(circle.topBidder(), address(0));
    }

    function test_SettleWithNoMembersReverts() public {
        vm.expectRevert(abi.encodeWithSelector(SavingsCircle.RoundNotFull.selector, 0, 0));
        circle.settleRound();
    }

    // --------------------------------------------------------- full lifecycles

    function test_FullLifecycleFourMembersWithOneBidRound() public {
        _joinFour();
        _allFourContribute();

        uint256 bid = 8e6;
        _bid(bob, bid);
        circle.settleRound();

        uint256 share = bid / 3;
        uint256 winnerPayout = POT - share * 3;

        assertEq(circle.recipientOf(1), bob);
        assertEq(circle.roundPayout(1), winnerPayout);
        assertEq(circle.claimable(alice), share);
        assertEq(circle.claimable(carol), share);
        assertEq(circle.claimable(dave), share);
        assertEq(circle.claimable(bob), 0);
        assertTrue(circle.hasReceived(bob));
        assertEq(token.balanceOf(address(circle)), POT);

        // Winner pulls the payout, others pull credit. No double claims.
        uint256 bobBefore = token.balanceOf(bob);
        _claim(bob);
        assertEq(token.balanceOf(bob), bobBefore + winnerPayout);

        vm.prank(bob);
        vm.expectRevert(SavingsCircle.NothingToClaim.selector);
        circle.claim();

        uint256 aliceBefore = token.balanceOf(alice);
        _withdrawCredit(alice);
        assertEq(token.balanceOf(alice), aliceBefore + share);

        vm.prank(alice);
        vm.expectRevert(SavingsCircle.NothingToWithdraw.selector);
        circle.withdrawCredit();

        _withdrawCredit(carol);
        _withdrawCredit(dave);

        // Rounds 2 to 4 have no bids. Recipients follow the remaining join order.
        address[3] memory order = [alice, carol, dave];
        for (uint256 r = 0; r < 3; ++r) {
            _allFourContribute();
            circle.settleRound();

            uint256 round = r + 2;
            assertEq(circle.recipientOf(round), order[r]);
            assertEq(circle.roundPayout(round), POT);
            assertTrue(circle.hasReceived(order[r]));

            uint256 before = token.balanceOf(order[r]);
            _claim(order[r]);
            assertEq(token.balanceOf(order[r]), before + POT);
        }

        assertTrue(circle.completed());
        assertEq(circle.currentRound(), 5);
        assertEq(token.balanceOf(address(circle)), 0);

        for (uint256 i = 0; i < MAX_MEMBERS; ++i) {
            assertTrue(circle.hasReceived(members[i]));
        }
    }

    function test_FullLifecycleFourMembersNoBids() public {
        _joinFour();

        address[4] memory order = [alice, bob, carol, dave];
        for (uint256 r = 0; r < 4; ++r) {
            _allFourContribute();
            circle.settleRound();

            uint256 round = r + 1;
            assertEq(circle.recipientOf(round), order[r]);
            assertEq(circle.roundPayout(round), POT);

            uint256 before = token.balanceOf(order[r]);
            _claim(order[r]);
            assertEq(token.balanceOf(order[r]), before + POT);
        }

        assertTrue(circle.completed());
        assertEq(token.balanceOf(address(circle)), 0);
    }

    function test_MemberWhoAlreadyReceivedCannotBidAgain() public {
        _joinFour();
        _allFourContribute();
        _bid(bob, 5e6);
        circle.settleRound();
        _claim(bob);

        _allFourContribute();
        vm.prank(bob);
        vm.expectRevert(SavingsCircle.AlreadyReceived.selector);
        circle.bid(1e6);
    }

    function test_ClaimAndWithdrawCreditMoveExactAmounts() public {
        _joinFour();
        _allFourContribute();
        _bid(carol, 6e6);
        circle.settleRound();

        uint256 share = 6e6 / 3;
        uint256 winnerPayout = POT - share * 3;

        // A non recipient has credit only, nothing to claim as a pot.
        vm.prank(bob);
        vm.expectRevert(SavingsCircle.NothingToClaim.selector);
        circle.claim();

        assertEq(circle.claimablePayout(carol), winnerPayout);

        uint256 carolBefore = token.balanceOf(carol);
        _claim(carol);
        assertEq(token.balanceOf(carol), carolBefore + winnerPayout);

        vm.prank(carol);
        vm.expectRevert(SavingsCircle.NothingToClaim.selector);
        circle.claim();

        assertEq(circle.claimable(bob), share);
        uint256 bobBefore = token.balanceOf(bob);
        _withdrawCredit(bob);
        assertEq(token.balanceOf(bob), bobBefore + share);

        vm.prank(bob);
        vm.expectRevert(SavingsCircle.NothingToWithdraw.selector);
        circle.withdrawCredit();
    }
}
