// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Earning is Ownable, ReentrancyGuard {
    // Constants
    uint256 public constant TURTLE_PER_NFT = 35000 ether; // Amount of Turtle tokens required per NFT
    uint256 public constant DAILY_EARNING = 10 ether; // Daily earning rate per NFT
    uint256 public constant FIRST_24H_FEE = 10 ether; // 10 CRO fee for withdrawals in first 24 hours
    uint256 public constant FIRST_72H_FEE = 5 ether; // 5 CRO fee for withdrawals in first 72 hours

    // State variables
    IERC721 public nftContract;
    IERC20 public turtleToken;
    address public vaultAddress;
    
    // Adjustable parameters (can only be decreased)
    uint256 public requiredTurtlePerNFT;
    uint256 public dailyEarningRate;

    mapping(address => uint256) public stakedTurtleTokens;

    // Staking data
    struct StakeInfo {
        uint256 nftCount;
        uint256 stakedAt;
        uint256 lastClaimAt;
    }

    mapping(address => StakeInfo) public stakes;

    // Events
    event Staked(address indexed user, uint256 nftCount);
    event Unstaked(address indexed user, uint256 nftCount);
    event Claimed(address indexed user, uint256 amount);
    event RequiredTurtleAdjusted(uint256 newAmount);
    event DailyEarningAdjusted(uint256 newRate);
    event VaultAddressUpdated(address value);

    constructor(
        address initialOwner,
        address _nftContract,
        address _turtleToken
    ) Ownable(initialOwner) {
        nftContract = IERC721(_nftContract);
        turtleToken = IERC20(_turtleToken);
        requiredTurtlePerNFT = TURTLE_PER_NFT;
        dailyEarningRate = DAILY_EARNING;
        vaultAddress = initialOwner;
    }

    /**
     * @dev Stake NFTs to earn Turtle tokens
     */
    function stake() external nonReentrant {
        uint256 nftCount = nftContract.balanceOf(msg.sender);
        require(nftCount > 0, "Must have at least one NFT");

        StakeInfo storage userStake = stakes[msg.sender];

        if (userStake.nftCount > 0) {
            require(nftCount > userStake.nftCount, "Can only stake more NFTs");

            uint256 earned = calculateEarnings(msg.sender);
            if (earned > 0) {
                require(turtleToken.transfer(msg.sender, earned), "Reward transfer failed");
                emit Claimed(msg.sender, earned);
            }
        }

        uint256 requiredTurtle = nftCount * requiredTurtlePerNFT;
        uint256 alreadyStakedTurtle = stakedTurtleTokens[msg.sender];
        uint256 turtleToStake = requiredTurtle - alreadyStakedTurtle;

        require(turtleToken.balanceOf(msg.sender) >= turtleToStake, "Insufficient Turtle tokens");

        if (turtleToStake > 0) {
            require(turtleToken.transferFrom(msg.sender, address(this), turtleToStake), "Turtle transfer failed");
        }

        stakedTurtleTokens[msg.sender] = requiredTurtle;
        userStake.nftCount = nftCount;
        userStake.stakedAt = block.timestamp;
        userStake.lastClaimAt = block.timestamp;

        emit Staked(msg.sender, nftCount);
    }

    /**
     * @dev Unstake all NFTs and claim any earned rewards
     */
    function unstake() external payable nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.nftCount > 0, "No staked NFTs");

        uint256 earned = calculateEarnings(msg.sender);
        if (earned > 0) {
            require(turtleToken.transfer(msg.sender, earned), "Reward transfer failed");
        }

        uint256 fee = calculateWithdrawalFee(userStake.stakedAt);
        if (fee > 0) {
            require(msg.value >= fee, "Insufficient fee");
            payable(vaultAddress).transfer(fee);
        }

        uint256 turtleToReturn = stakedTurtleTokens[msg.sender];
        if (turtleToReturn > 0) {
            require(turtleToken.transfer(msg.sender, turtleToReturn), "Turtle return failed");
        }

        uint256 nftCount = userStake.nftCount;
        delete stakes[msg.sender];
        delete stakedTurtleTokens[msg.sender];

        emit Unstaked(msg.sender, nftCount);
        if (earned > 0) {
            emit Claimed(msg.sender, earned);
        }
    }

    /**
     * @dev Claim earned rewards without unstaking
     */
    function claim() external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.nftCount > 0, "No staked NFTs");

        uint256 earned = calculateEarnings(msg.sender);
        require(earned > 0, "No earnings to claim");

        userStake.lastClaimAt = block.timestamp;
        require(turtleToken.transfer(msg.sender, earned), "Reward transfer failed");

        emit Claimed(msg.sender, earned);
    }

    /**
     * @dev Calculate earnings for a user
     * @param user Address of the user
     * @return Amount of Turtle tokens earned
     */
    function calculateEarnings(address user) public view returns (uint256) {
        StakeInfo storage userStake = stakes[user];
        if (userStake.nftCount == 0) {
            return 0;
        }

        uint256 nftsByTokenBalance = stakedTurtleTokens[user] / requiredTurtlePerNFT;
        uint256 currentNFTBalance = nftContract.balanceOf(user);

        uint256 effectiveNFTCount = userStake.nftCount;
        if (nftsByTokenBalance < effectiveNFTCount) {
            effectiveNFTCount = nftsByTokenBalance;
        }
        if (currentNFTBalance < effectiveNFTCount) {
            effectiveNFTCount = currentNFTBalance;
        }

        if (effectiveNFTCount == 0) {
            return 0;
        }

        uint256 daysSinceLastClaim = (block.timestamp - userStake.lastClaimAt) / 1 days;
        if (daysSinceLastClaim == 0) {
            return 0;
        }

        return effectiveNFTCount * dailyEarningRate * daysSinceLastClaim;
    }

    /**
     * @dev Calculate withdrawal fee based on staking duration
     * @param stakedAt Timestamp when the stake was created
     * @return Fee amount in CRO
     */
    function calculateWithdrawalFee(uint256 stakedAt) public view returns (uint256) {
        uint256 stakeDuration = block.timestamp - stakedAt;
        
        if (stakeDuration < 1 days) {
            return FIRST_24H_FEE;
        } else if (stakeDuration < 3 days) {
            return FIRST_72H_FEE;
        }
        
        return 0;
    }

    /**
     * @dev Adjust the required Turtle tokens per NFT (can only decrease)
     * @param newAmount New amount of Turtle tokens required per NFT
     */
    function adjustRequiredTurtle(uint256 newAmount) external onlyOwner {
        require(newAmount < requiredTurtlePerNFT, "Can only decrease required amount");
        requiredTurtlePerNFT = newAmount;
        emit RequiredTurtleAdjusted(newAmount);
    }

    /**
     * @dev Adjust the daily earning rate (can only decrease)
     * @param newRate New daily earning rate
     */
    function adjustDailyEarningRate(uint256 newRate) external onlyOwner {
        require(newRate < dailyEarningRate, "Can only decrease earning rate");
        dailyEarningRate = newRate;
        emit DailyEarningAdjusted(newRate);
    }

    /**
     * Set vault address for fees
     * @param value Payable address
     */
    function setVaultAddress(address value) external onlyOwner {
        vaultAddress = value;
        emit VaultAddressUpdated(value);
    }

    /**
     * @dev Get stake information for a user
     * @param user Address of the user
     * @return nftCount Number of staked NFTs
     * @return stakedAt Timestamp when the stake was created
     * @return lastClaimAt Timestamp of the last claim
     */
    function getStakeInfo(address user) external view returns (
        uint256 nftCount,
        uint256 stakedAt,
        uint256 lastClaimAt
    ) {
        StakeInfo storage userStake = stakes[user];
        return (
            userStake.nftCount,
            userStake.stakedAt,
            userStake.lastClaimAt
        );
    }
}