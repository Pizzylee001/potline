// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SavingsCircle
/// @notice One group savings circle (arisan, paluwagan, tanda) settled in a single ERC20 token.
/// @dev Every round each member pays contributionAmount. A member who wants the pot early bids part
///      of it back. The top bidder takes the pot early, the bid is shared with the other members as
///      claimable credit. Later rounds go to the next member in join order who has not received yet.
///      Funds move with pull payments: payouts and credits are recorded first, then pulled by members.
contract SavingsCircle is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ----------------------------------------------------------------- errors
    error ZeroToken();
    error ZeroContribution();
    error ZeroMaxMembers();
    error MaxMembersTooHigh(uint256 provided, uint256 cap);
    error CircleFull();
    error AlreadyMember();
    error NotMember();
    error CircleIsCompleted();
    error AlreadyReceived();
    error AlreadyContributed();
    error RoundNotFull(uint256 contributed, uint256 required);
    error NoContributionThisRound();
    error BidZero();
    error BidTooLow(uint256 amount, uint256 currentTopBid);
    error BidAbovePot(uint256 amount, uint256 pot);
    error RoundAlreadySettled();
    error NothingToClaim();
    error NothingToWithdraw();

    // ----------------------------------------------------------------- events
    event Joined(address indexed member, uint256 index);
    event Contributed(address indexed member, uint256 indexed round, uint256 amount);
    event BidPlaced(address indexed bidder, uint256 indexed round, uint256 amount);
    event RoundSettled(
        uint256 indexed round, address indexed recipient, uint256 payout, uint256 topBid, address indexed topBidder
    );
    event PotClaimed(address indexed recipient, uint256 amount);
    event CreditWithdrawn(address indexed member, uint256 amount);
    event CircleCompleted(uint256 rounds);

    /// @notice Hard cap on members. Keeps settleRound and the bid credit split cheap.
    uint256 public constant MAX_MEMBERS = 50;

    /// @notice ERC20 used for contributions and payouts. Fixed at construction.
    IERC20 public immutable token;
    /// @notice Fixed amount every member pays each round, in token units.
    uint256 public immutable contributionAmount;
    /// @notice Fixed member cap for this circle.
    uint256 public immutable maxMembers;

    address[] private _members;

    uint256 public currentRound = 1;
    uint256 public potThisRound;
    uint256 public contributedCount;
    uint256 public topBid;
    address public topBidder;
    bool public completed;

    mapping(address => bool) public isMember;
    mapping(address => bool) public hasReceived;
    mapping(address => uint256) public claimable;
    mapping(address => uint256) private _payoutOwed;

    mapping(uint256 => mapping(address => bool)) private _contributed;
    mapping(uint256 => bool) private _settled;
    mapping(uint256 => address) private _recipientOf;
    mapping(uint256 => uint256) private _roundPayout;

    uint256 private _receivedCount;

    constructor(address token_, uint256 contributionAmount_, uint256 maxMembers_) {
        if (token_ == address(0)) revert ZeroToken();
        if (contributionAmount_ == 0) revert ZeroContribution();
        if (maxMembers_ == 0) revert ZeroMaxMembers();
        if (maxMembers_ > MAX_MEMBERS) revert MaxMembersTooHigh(maxMembers_, MAX_MEMBERS);

        token = IERC20(token_);
        contributionAmount = contributionAmount_;
        maxMembers = maxMembers_;
    }

    // ----------------------------------------------------------------- writes

    /// @notice Join the circle once, while there is room and it is not complete.
    function join() external nonReentrant {
        if (completed) revert CircleIsCompleted();
        if (isMember[msg.sender]) revert AlreadyMember();
        if (_members.length >= maxMembers) revert CircleFull();

        _members.push(msg.sender);
        isMember[msg.sender] = true;

        emit Joined(msg.sender, _members.length - 1);
    }

    /// @notice Pay this round's contribution. One payment per member per round.
    function contribute() external nonReentrant {
        if (!isMember[msg.sender]) revert NotMember();
        if (completed) revert CircleIsCompleted();
        if (_contributed[currentRound][msg.sender]) revert AlreadyContributed();

        // Effects before the interaction.
        _contributed[currentRound][msg.sender] = true;
        contributedCount += 1;
        potThisRound += contributionAmount;

        emit Contributed(msg.sender, currentRound, contributionAmount);

        token.safeTransferFrom(msg.sender, address(this), contributionAmount);
    }

    /// @notice Bid part of the pot for the right to take it this round.
    /// @dev Only a member who already paid this round may bid. Only the highest bid is kept.
    /// @param amount The part of the pot the bidder gives up, shared with the other members.
    function bid(uint256 amount) external nonReentrant {
        if (!isMember[msg.sender]) revert NotMember();
        if (completed) revert CircleIsCompleted();
        if (hasReceived[msg.sender]) revert AlreadyReceived();
        if (!_contributed[currentRound][msg.sender]) revert NoContributionThisRound();
        if (amount == 0) revert BidZero();
        if (amount <= topBid) revert BidTooLow(amount, topBid);
        if (amount > potThisRound) revert BidAbovePot(amount, potThisRound);

        topBid = amount;
        topBidder = msg.sender;

        emit BidPlaced(msg.sender, currentRound, amount);
    }

    /// @notice Close the current round once every member has paid. Callable by anyone.
    function settleRound() external nonReentrant {
        uint256 round = currentRound;

        if (completed) revert CircleIsCompleted();
        if (_settled[round]) revert RoundAlreadySettled();
        if (_members.length == 0) revert RoundNotFull(0, 0);
        if (contributedCount != _members.length) revert RoundNotFull(contributedCount, _members.length);

        // Effects first. Payouts and credits are recorded, then pulled by members.
        _settled[round] = true;

        address recipient;
        uint256 payout;

        if (topBidder != address(0)) {
            recipient = topBidder;
            uint256 others = _members.length - 1;
            // Any rounding remainder from the split stays in the winner's payout.
            uint256 share = others == 0 ? 0 : topBid / others;
            payout = potThisRound - (share * others);

            for (uint256 i = 0; i < _members.length; ++i) {
                address member = _members[i];
                if (member != recipient) {
                    claimable[member] += share;
                }
            }
        } else {
            recipient = _nextUnreceived();
            payout = potThisRound;
        }

        hasReceived[recipient] = true;
        _receivedCount += 1;
        _recipientOf[round] = recipient;
        _roundPayout[round] = payout;
        _payoutOwed[recipient] += payout;

        emit RoundSettled(round, recipient, payout, topBid, topBidder);

        currentRound = round + 1;
        potThisRound = 0;
        contributedCount = 0;
        topBid = 0;
        topBidder = address(0);

        if (_receivedCount == _members.length) {
            completed = true;
            emit CircleCompleted(round);
        }
    }

    /// @notice Withdraw a recorded payout. A recipient pulls it after settleRound.
    function claim() external nonReentrant {
        uint256 amount = _payoutOwed[msg.sender];
        if (amount == 0) revert NothingToClaim();

        _payoutOwed[msg.sender] = 0;

        emit PotClaimed(msg.sender, amount);

        token.safeTransfer(msg.sender, amount);
    }

    /// @notice Withdraw accumulated bid-share credit.
    function withdrawCredit() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        claimable[msg.sender] = 0;

        emit CreditWithdrawn(msg.sender, amount);

        token.safeTransfer(msg.sender, amount);
    }

    // ------------------------------------------------------------------ views

    function members() external view returns (address[] memory) {
        return _members;
    }

    function memberCount() external view returns (uint256) {
        return _members.length;
    }

    function recipientOf(uint256 round) external view returns (address) {
        return _recipientOf[round];
    }

    function roundPayout(uint256 round) external view returns (uint256) {
        return _roundPayout[round];
    }

    function claimablePayout(address member) external view returns (uint256) {
        return _payoutOwed[member];
    }

    // --------------------------------------------------------------- internal

    /// @dev First member in join order who has not received the pot yet.
    function _nextUnreceived() private view returns (address) {
        for (uint256 i = 0; i < _members.length; ++i) {
            address member = _members[i];
            if (!hasReceived[member]) {
                return member;
            }
        }
        revert CircleIsCompleted();
    }
}
