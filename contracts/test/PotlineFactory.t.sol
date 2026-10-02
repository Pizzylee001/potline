// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {PotlineFactory} from "../src/PotlineFactory.sol";
import {SavingsCircle} from "../src/SavingsCircle.sol";
import {MockERC20} from "./mocks/MockToken.sol";

contract PotlineFactoryTest is Test {
    MockERC20 internal token;
    PotlineFactory internal factory;
    address internal creator;

    function setUp() public {
        token = new MockERC20(6);
        factory = new PotlineFactory(address(token));
        creator = makeAddr("creator");
    }

    function test_CreateCircleDeploysAndRecords() public {
        vm.prank(creator);
        SavingsCircle circle = factory.createCircle(10e6, 4);

        assertEq(address(circle.token()), address(token));
        assertEq(circle.contributionAmount(), 10e6);
        assertEq(circle.maxMembers(), 4);
        assertEq(factory.circleCount(), 1);

        address[] memory all = factory.allCircles();
        assertEq(all.length, 1);
        assertEq(all[0], address(circle));
    }

    function test_CreateCircleEmitsEvent() public {
        vm.expectEmit(false, true, false, true);
        emit PotlineFactory.CircleCreated(address(0), creator, 10e6, 4);

        vm.prank(creator);
        factory.createCircle(10e6, 4);
    }

    function test_CreateMultipleCircles() public {
        factory.createCircle(10e6, 4);
        factory.createCircle(25e6, 8);

        assertEq(factory.circleCount(), 2);
        address[] memory all = factory.allCircles();
        assertEq(all.length, 2);
        assertTrue(all[0] != all[1]);
    }

    function test_CreateCircleRejectsZeroContribution() public {
        vm.expectRevert(SavingsCircle.ZeroContribution.selector);
        factory.createCircle(0, 4);
    }

    function test_CreateCircleRejectsZeroMaxMembers() public {
        vm.expectRevert(SavingsCircle.ZeroMaxMembers.selector);
        factory.createCircle(10e6, 0);
    }

    function test_CreateCircleRejectsTooManyMembers() public {
        vm.expectRevert(abi.encodeWithSelector(SavingsCircle.MaxMembersTooHigh.selector, 51, 50));
        factory.createCircle(10e6, 51);
    }

    function test_ConstructorRejectsZeroToken() public {
        vm.expectRevert(PotlineFactory.ZeroToken.selector);
        new PotlineFactory(address(0));
    }
}
