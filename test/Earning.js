const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Test cases for Earning contract:
// Staking:
//   - Should transfer Turtle tokens to the contract when staking
//   - Should fail if user doesn't have any NFTs
//   - Should fail if user doesn't have enough Turtle tokens
//   - Should claim rewards when restaking
//   - Should require Turtle tokens for all NFTs when staking more
//   - Should fail if user's NFT balance is lower than staked amount
//
// Earnings:
//   - Should not allow claiming before 24 hours
//   - Should allow claiming after 24 hours
//   - Should calculate earnings correctly for multiple days
//   - Should calculate earnings based on NFT count
//   - Should reset earnings after claiming
//   - Should fail claiming if user transfers out NFTs
//
// Unstaking:
//   - Withdraw fees transfer to vault when unstaking below 72 hours
//   - Withdraw fees transfer to vault when unstaking below 24 hours
//   - Should not charge fee for unstaking after 72 hours
//   - Should fail unstaking if user transfers out NFTs
//   - Should pay rewards when unstaking
//
// View and fee functions:
//   - calculateWithdrawalFee returns correct tiers
//   - calculateEarnings and getStakeInfo for non-staked user
//   - claim and unstake revert when no NFTs staked
//
// Admin functions:
//   - Should allow owner to decrease required Turtle per NFT
//   - Should not allow owner to increase required Turtle per NFT
//   - Should allow owner to decrease daily earning rate
//   - Should not allow owner to increase daily earning rate
//   - Should allow owner to set vault address
//   - Should not allow non-owner to set vault address
//   - Should not allow non-owner to adjustRequiredTurtle
//   - Should not allow non-owner to adjustDailyEarningRate
//   - Should expose contract constants correctly

describe("Earning Contract", function () {
  let Token, token;
  let NFT, nft;           
  let Earning, earning;
  let owner, addr1, addr2, vault;
  const TURTLE_PER_NFT = 35000;
  const DAILY_EARNING = 10;
  const ONE_DAY = 86400; // 24 hours in seconds

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, vault] = await ethers.getSigners();

    // Deploy Token contract
    Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(owner.address);

    // Deploy NFT contract
    NFT = await ethers.getContractFactory("TurtlesNFT");
    nft = await NFT.deploy(
      owner.address,
      "https://example.com/api/",
      "https://example.com/hidden/",
      await token.getAddress(),
      ethers.parseEther("0.1"),  // Native token fee
      100,                       // ERC20 token fee
      1000                       // Max ERC20 mints
    );

    // Deploy Earning contract
    Earning = await ethers.getContractFactory("Earning");
    earning = await Earning.deploy(
      owner.address,
      await nft.getAddress(),
      await token.getAddress()
    );

    // Mint some NFTs to addr1
    await nft.adminMint(addr1.address, 3);
    
    // Transfer some tokens to addr1
    await token.transfer(addr1.address, ethers.parseEther("200000"));

    // Transfer some tokens to the Earning contract for rewards
    await token.transfer(await earning.getAddress(), ethers.parseEther("1000000"));
    
    // Approve NFT and token transfers
    await nft.connect(addr1).setApprovalForAll(await earning.getAddress(), true);
    await token.connect(addr1).approve(await earning.getAddress(), ethers.MaxUint256);

    // Set Vault Address
    await earning.setVaultAddress(vault.address);
  });

  describe("Staking", function () {
    it("Should transfer Turtle tokens to the contract when staking", async function () {
      const initialContractBalance = await token.balanceOf(await earning.getAddress());
      const requiredTurtle = ethers.parseEther(`${3 * TURTLE_PER_NFT}`);

      await earning.connect(addr1).stake();
      
      const finalContractBalance = await token.balanceOf(await earning.getAddress());
      expect(finalContractBalance - initialContractBalance).to.equal(requiredTurtle);
    });

    it("Should fail if user doesn't have any NFTs", async function () {
      // Create a new account with no NFTs
      const noNftUser = addr2;
      
      await expect(
        earning.connect(noNftUser).stake()
      ).to.be.revertedWith("Must have at least one NFT");
    });

    it("Should fail if user doesn't have enough Turtle tokens", async function () {
      // Transfer tokens away from addr1
      await token.connect(addr1).transfer(addr2.address, ethers.parseEther("200000"));
      
      await expect(
        earning.connect(addr1).stake()
      ).to.be.revertedWith("Insufficient Turtle tokens");
    });
    
    it("Should claim rewards when restaking", async function () {
      // Initial stake
      await earning.connect(addr1).stake();
      const [cnt] = await earning.stakes(addr1.address);
      expect(Number(cnt)).to.equal(3);
      
      // Advance time by 2 days
      await time.increase(ONE_DAY * 2);
      
      // Calculate expected earnings: 3 NFTs * 10 tokens per day * 2 days
      const expectedEarnings = ethers.parseEther(`${3 * 2 * DAILY_EARNING}`);
      
      // Get initial token balance
      const initialBalance = await token.balanceOf(addr1.address);
      
      // Mint one more NFT to addr1 to change the NFT count
      await nft.adminMint(addr1.address, 1);

      // Restake
      await earning.connect(addr1).stake();

      // Check token balance change
      const newBalance = await token.balanceOf(addr1.address); //current + 1 claim - 1 stake
      const requiredForOneNFT = ethers.parseEther(`${TURTLE_PER_NFT}`);
      expect(newBalance - initialBalance).to.equal(expectedEarnings - requiredForOneNFT);
      
      // Check that lastClaimAt was updated
      const stakeInfo = await earning.getStakeInfo(addr1.address);
      expect(stakeInfo.lastClaimAt).to.be.closeTo(
        await time.latest(),
        5 // Allow for small timestamp differences
      );
    });
    
    it("Should require Turtle tokens for all NFTs when staking more", async function () {
      // First transfer 2 NFTs to addr2 to leave only 1 NFT for addr1
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 1);
      
      // Now addr1 has only 1 NFT
      expect(await nft.balanceOf(addr1.address)).to.equal(1);

      // Stake with 1 NFT
      await earning.connect(addr1).stake();
      let [cnt] = await earning.stakes(addr1.address);
      expect(Number(cnt)).to.equal(1);

      // Transfer most Turtle tokens away, leaving just enough for 3 NFTs
      const requiredForTwoNFTs = ethers.parseEther(`${TURTLE_PER_NFT * 100}`);
      const currentBalance = await token.balanceOf(addr1.address);
      const amountToTransfer = currentBalance - requiredForTwoNFTs;
      if (amountToTransfer > 0) {
        await token.connect(addr1).transfer(owner.address, amountToTransfer);
      }
      
      // Transfer 2 NFTs back to addr1
      await nft.connect(addr2).transferFrom(addr2.address, addr1.address, 0);
      await nft.connect(addr2).transferFrom(addr2.address, addr1.address, 1);
      
      // Now addr1 has 3 NFTs again
      expect(await nft.balanceOf(addr1.address)).to.equal(3);
      
      // Stake again
      await earning.connect(addr1).stake();
      
      // Check that stake was updated to 3 NFTs
      [cnt] = await earning.stakes(addr1.address);
      expect(Number(cnt)).to.equal(3);
    });
    
    it("Should fail if user's NFT balance is lower than staked amount", async function () {
      // Initial stake with 3 NFTs
      await earning.connect(addr1).stake();
      let [cnt] = await earning.stakes(addr1.address);
      expect(Number(cnt)).to.equal(3);
      
      // Transfer 2 NFTs away, leaving only 1 NFT
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 1);
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 2);
      
      // Now addr1 has only 1 NFT but has staked 3
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
      
      // Try to stake again - should fail because NFT balance is lower than staked amount
      await expect(
        earning.connect(addr1).stake()
      ).to.be.revertedWith("Can only stake more NFTs");
      
      // Check that stake remains unchanged
      [cnt] = await earning.stakes(addr1.address);
      expect(Number(cnt)).to.equal(3);
    });
  });

  describe("Earnings", function () {
    beforeEach(async function () {
      // Stake NFTs
      await earning.connect(addr1).stake();
    });

    it("Should not allow claiming before 24 hours", async function () {
      // Try to claim immediately
      await expect(
        earning.connect(addr1).claim()
      ).to.be.revertedWith("No earnings to claim");
    });

    it("Should allow claiming after 24 hours", async function () {
      // Advance time by 1 day
      await time.increase(ONE_DAY);
      
      // Calculate expected earnings: 3 NFTs * 10 tokens per day * 1 day
      const expectedEarnings = ethers.parseEther(`${3 * DAILY_EARNING}`);
      
      // Check calculated earnings
      const earnings = await earning.calculateEarnings(addr1.address);
      expect(earnings).to.equal(expectedEarnings);
      
      // Get initial token balance
      const initialBalance = await token.balanceOf(addr1.address);
      
      // Claim earnings
      await earning.connect(addr1).claim();
      
      // Check token balance increased
      const newBalance = await token.balanceOf(addr1.address);
      expect(newBalance - initialBalance).to.equal(expectedEarnings);
      
      // Check that lastClaimAt was updated
      const stakeInfo = await earning.getStakeInfo(addr1.address);
      expect(stakeInfo.lastClaimAt).to.be.closeTo(
        await time.latest(),
        5 // Allow for small timestamp differences
      );
    });

    it("Should calculate earnings correctly for multiple days", async function () {
      // Advance time by 3 days
      await time.increase(ONE_DAY * 3);
      
      // Calculate expected earnings: 3 NFTs * 10 tokens per day * 3 days
      const expectedEarnings = ethers.parseEther(`${3 * DAILY_EARNING * 3}`);
      
      const earnings = await earning.calculateEarnings(addr1.address);
      expect(earnings).to.equal(expectedEarnings);
    });
    
    it("Should calculate earnings based on NFT count", async function () {
      // Unstake and stake with different NFT count
      await earning.connect(addr1).unstake({ value: ethers.parseEther("10") });
      
      // Mint one more NFT to addr1 to change the NFT count
      await nft.adminMint(addr1.address, 1);
      
      await earning.connect(addr1).stake();
      
      // Advance time by 2 days
      await time.increase(ONE_DAY * 2);
      
      // Calculate expected earnings: 4 NFTs * 10 tokens per day * 2 days
      const expectedEarnings = ethers.parseEther(`${4 * DAILY_EARNING * 2}`);
      
      const earnings = await earning.calculateEarnings(addr1.address);
      expect(earnings).to.equal(expectedEarnings);
    });
    
    it("Should reset earnings after claiming", async function () {
      // Advance time by 2 days
      await time.increase(ONE_DAY * 2);
      
      // Claim earnings
      await earning.connect(addr1).claim();
      
      // Check earnings are reset
      const earnings = await earning.calculateEarnings(addr1.address);
      expect(earnings).to.equal(0);
      
      // Advance time by another day
      await time.increase(ONE_DAY);
      
      // Check new earnings
      const newEarnings = await earning.calculateEarnings(addr1.address);
      expect(newEarnings).to.equal(ethers.parseEther(`${3 * DAILY_EARNING}`));
    });
    
    it("Should calculate reduced earnings if user transfers out NFTs", async function () {
      // Transfer 2 NFTs to addr2, leaving only 1
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 1);
      
      // Advance time by 1 day
      await time.increase(ONE_DAY);
      
      // Should only earn for 1 NFT (the minimum of staked=3, current=1)
      const earned = await earning.calculateEarnings(addr1.address);
      expect(earned).to.equal(ethers.parseEther("10"));
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      // Stake NFTs
      await earning.connect(addr1).stake();
    });

    it("Withdraw fees transfer to vault when unstaking below 72 hours", async function () {
      const vaultBalance = await ethers.provider.getBalance(vault.address);
      const fee = ethers.parseEther("5");

      // Advance time by 72 hours - 500 second
      await time.increase((ONE_DAY * 3) - 500);

      await earning.connect(addr1).unstake({ value: fee });

      const finalVaultBalance = await ethers.provider.getBalance(await vault.address);
      expect(finalVaultBalance - vaultBalance).to.equal(fee);
    });

    it("Withdraw fees transfer to vault when unstaking below 24 hours", async function () {
      const vaultBalance = await ethers.provider.getBalance(vault.address);
      const fee = ethers.parseEther("10");

      // Advance time by 24 hours - 500 second
      await time.increase(ONE_DAY - 500);

      await earning.connect(addr1).unstake({ value: fee });

      const finalVaultBalance = await ethers.provider.getBalance(vault.address);
      expect(finalVaultBalance - vaultBalance).to.equal(fee);
    });

    it("Should not charge fee for unstaking after 72 hours", async function () {
      // Advance time by 4 days
      await time.increase(ONE_DAY * 4);
      
      // Unstake with no fee
      await earning.connect(addr1).unstake();
    });
    
    it("Should fail unstaking if user transfers out NFTs", async function () {
      // Transfer NFTs to addr2
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 1);
      
      // Try to unstake - should fail due to insufficient NFT balance
      await expect(
        earning.connect(addr1).unstake({ value: ethers.parseEther("10") })
      ).to.be.revertedWith("Insufficient NFT balance");
    });
    
    it("Should pay rewards when unstaking", async function () {
      // Advance time by 2 days
      await time.increase(ONE_DAY * 2);
      
      // Calculate expected earnings
      const expectedEarnings = ethers.parseEther(`${3 * DAILY_EARNING * 2}`);
      
      // Get initial token balance
      const initialUserBalance = await token.balanceOf(addr1.address);
      const stakedTurtle = ethers.parseEther(`${3 * TURTLE_PER_NFT}`);
      
      // Unstake with fee
      await earning.connect(addr1).unstake({ value: ethers.parseEther("5") });
      
      // Check token balance increased
      const finalUserBalance = await token.balanceOf(addr1.address);
      expect(finalUserBalance - initialUserBalance).to.equal(stakedTurtle + expectedEarnings);
    });
    
    it("Should fail unstaking when user has insufficient NFT balance", async function () {
      // Transfer 2 NFTs away, leaving only 1 NFT but 3 staked
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      await nft.connect(addr1).transferFrom(addr1.address, addr2.address, 1);
      
      // Verify user now has only 1 NFT but staked 3
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
      const [stakedCount] = await earning.stakes(addr1.address);
      expect(stakedCount).to.equal(3);
      
      // Try to unstake - should fail
      await expect(
        earning.connect(addr1).unstake({ value: ethers.parseEther("10") })
      ).to.be.revertedWith("Insufficient NFT balance");
    });
  });

  describe("View and fee functions", function () {
    it("calculateWithdrawalFee returns correct tiers", async function () {
      const now = await time.latest();
      // Fee within first 24h
      let fee = await earning.calculateWithdrawalFee(now - (ONE_DAY - 100));
      expect(fee).to.equal(ethers.parseEther("10"));
      // Fee within 24h to 72h
      fee = await earning.calculateWithdrawalFee(now - (ONE_DAY * 2));
      expect(fee).to.equal(ethers.parseEther("5"));
      // No fee after 72h
      fee = await earning.calculateWithdrawalFee(now - (ONE_DAY * 4));
      expect(fee).to.equal(0);
    });

    it("calculateEarnings and getStakeInfo for non-staked user", async function () {
      const noUser = addr2.address;
      expect(await earning.calculateEarnings(noUser)).to.equal(0);
      const info = await earning.getStakeInfo(noUser);
      expect(info.nftCount).to.equal(0);
      expect(info.stakedAt).to.equal(0);
      expect(info.lastClaimAt).to.equal(0);
    });

    it("claim and unstake revert when no NFTs staked", async function () {
      await expect(
        earning.connect(addr2).claim()
      ).to.be.revertedWith("No staked NFTs");
      await expect(
        earning.connect(addr2).unstake({ value: 0 })
      ).to.be.revertedWith("No staked NFTs");
    });
  });

  describe("Utility functions", function () {
    it("Should allow owner to adjust required Turtle per NFT (decrease)", async function () {
      await earning.connect(owner).adjustRequiredTurtle(ethers.parseEther("30000"));
      expect(await earning.requiredTurtlePerNFT()).to.equal(ethers.parseEther("30000"));
    });

    it("Should allow owner to adjust required Turtle per NFT (increase)", async function () {
      await earning.connect(owner).adjustRequiredTurtle(ethers.parseEther("40000"));
      expect(await earning.requiredTurtlePerNFT()).to.equal(ethers.parseEther("40000"));
    });

    it("Should allow setting minimum required Turtle (10000)", async function () {
      await earning.connect(owner).adjustRequiredTurtle(ethers.parseEther("10000"));
      expect(await earning.requiredTurtlePerNFT()).to.equal(ethers.parseEther("10000"));
    });

    it("Cannot set required Turtle below 10000", async function () {
      await expect(
        earning.connect(owner).adjustRequiredTurtle(ethers.parseEther("9999"))
      ).to.be.revertedWith("Minimum 10000 tokens required");
    });

    it("Should allow owner to adjust daily earning rate within range", async function () {
      await earning.connect(owner).adjustDailyEarningRate(ethers.parseEther("8"));
      expect(await earning.dailyEarningRate()).to.equal(ethers.parseEther("8"));
      
      await earning.connect(owner).adjustDailyEarningRate(ethers.parseEther("0"));
      expect(await earning.dailyEarningRate()).to.equal(ethers.parseEther("0"));
    });

    it("Should allow setting maximum daily earning rate (10)", async function () {
      await earning.connect(owner).adjustDailyEarningRate(ethers.parseEther("10"));
      expect(await earning.dailyEarningRate()).to.equal(ethers.parseEther("10"));
    });

    it("Cannot set daily earning rate above 10", async function () {
      await expect(
        earning.connect(owner).adjustDailyEarningRate(ethers.parseEther("11"))
      ).to.be.revertedWith("Rate cannot exceed 10");
    });

    it("Should allow owner to set vault address", async function () {
      await expect(
        earning.connect(owner).setVaultAddress(addr1.address)
      ).to.emit(earning, "VaultAddressUpdated").withArgs(addr1.address);
      expect(await earning.vaultAddress()).to.equal(addr1.address);
    });

    it("Error if non-owner sets vault address", async function () {
      await expect(
        earning.connect(addr1).setVaultAddress(addr2.address)
      ).to.be.revertedWithCustomError(earning, "OwnableUnauthorizedAccount").withArgs(
        addr1.address
      );
    });

    it("Error if non-owner sets adjustRequiredTurtle", async function () {
      await expect(
        earning.connect(addr1).adjustRequiredTurtle(ethers.parseEther("30000"))
      ).to.be.revertedWithCustomError(earning, "OwnableUnauthorizedAccount").withArgs(
        addr1.address
      );
    });

    it("Error if non-owner sets adjustDailyEarningRate", async function () {
      await expect(
        earning.connect(addr1).adjustDailyEarningRate(ethers.parseEther("8"))
      ).to.be.revertedWithCustomError(earning, "OwnableUnauthorizedAccount").withArgs(
        addr1.address
      );
    });

    it("Should read contract public constants correctly", async function () {
      expect(await earning.TURTLE_PER_NFT()).to.equal(ethers.parseEther("35000"));
      expect(await earning.DAILY_EARNING()).to.equal(ethers.parseEther("10"));
      expect(await earning.FIRST_24H_FEE()).to.equal(ethers.parseEther("10"));
      expect(await earning.FIRST_72H_FEE()).to.equal(ethers.parseEther("5"));
    });
  });
});
