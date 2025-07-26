// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Faucet is Ownable {
    IERC20 public token;
    uint256 public rewardAmount = 35000 ether;
    uint256 public constant COOLDOWN_TIME = 5 minutes;
    
    mapping(address => uint256) public lastClaim;
    
    event Claimed(address indexed user, uint256 amount);
    event RewardAmountUpdated(uint256 newAmount);
    
    constructor(address initialOwner, address _token) Ownable(initialOwner) {
        token = IERC20(_token);
    }
    
    function claim() external {
        require(block.timestamp >= lastClaim[msg.sender] + COOLDOWN_TIME, "Cooldown period not met");
        require(token.balanceOf(address(this)) >= rewardAmount, "Insufficient faucet balance");
        
        lastClaim[msg.sender] = block.timestamp;
        require(token.transfer(msg.sender, rewardAmount), "Transfer failed");
        
        emit Claimed(msg.sender, rewardAmount);
    }
    
    function setRewardAmount(uint256 _rewardAmount) external onlyOwner {
        rewardAmount = _rewardAmount;
        emit RewardAmountUpdated(_rewardAmount);
    }
    
    function withdraw(uint256 amount) external onlyOwner {
        require(token.transfer(owner(), amount), "Withdraw failed");
    }
    
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        if (block.timestamp >= lastClaim[user] + COOLDOWN_TIME) {
            return 0;
        }
        return (lastClaim[user] + COOLDOWN_TIME) - block.timestamp;
    }
}