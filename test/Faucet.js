const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Faucet Contract", function () {
  let Token, token;
  let Faucet, faucet;
  let owner, addr1, addr2;
  const FIVE_MINUTES = 300; // 5 minutes in seconds

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy Token contract
    Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(owner.address);

    // Deploy Faucet contract
    Faucet = await ethers.getContractFactory("Faucet");
    faucet = await Faucet.deploy(owner.address, await token.getAddress());

    // Transfer tokens to faucet
    await token.transfer(await faucet.getAddress(), ethers.parseEther("1000000"));
  });

  describe("Claiming", function () {
    it("Should allow user to claim tokens", async function () {
      const initialBalance = await token.balanceOf(addr1.address);
      
      await faucet.connect(addr1).claim();
      
      const finalBalance = await token.balanceOf(addr1.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("35000"));
    });

    it("Should fail if user tries to claim before cooldown", async function () {
      await faucet.connect(addr1).claim();
      
      await expect(
        faucet.connect(addr1).claim()
      ).to.be.revertedWith("Cooldown period not met");
    });

    it("Should allow claim after cooldown period", async function () {
      await faucet.connect(addr1).claim();
      
      // Advance time by 5 minutes
      await time.increase(FIVE_MINUTES);
      
      await faucet.connect(addr1).claim();
      
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.parseEther("70000")); // 2 claims
    });

    it("Should fail if faucet has insufficient balance", async function () {
      // Withdraw all tokens from faucet
      const faucetBalance = await token.balanceOf(await faucet.getAddress());
      await faucet.withdraw(faucetBalance);
      
      await expect(
        faucet.connect(addr1).claim()
      ).to.be.revertedWith("Insufficient faucet balance");
    });
  });

  describe("Owner functions", function () {
    it("Should allow owner to set reward amount", async function () {
      await faucet.setRewardAmount(ethers.parseEther("50000"));
      expect(await faucet.rewardAmount()).to.equal(ethers.parseEther("50000"));
    });

    it("Should not allow non-owner to set reward amount", async function () {
      await expect(
        faucet.connect(addr1).setRewardAmount(ethers.parseEther("50000"))
      ).to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to withdraw tokens", async function () {
      const withdrawAmount = ethers.parseEther("100000");
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      await faucet.withdraw(withdrawAmount);
      
      const finalOwnerBalance = await token.balanceOf(owner.address);
      expect(finalOwnerBalance - initialOwnerBalance).to.equal(withdrawAmount);
    });
  });

  describe("View functions", function () {
    it("Should return correct time until next claim", async function () {
      await faucet.connect(addr1).claim();
      
      const timeUntilNext = await faucet.getTimeUntilNextClaim(addr1.address);
      expect(timeUntilNext).to.be.closeTo(FIVE_MINUTES, 5);
    });

    it("Should return 0 if user can claim", async function () {
      const timeUntilNext = await faucet.getTimeUntilNextClaim(addr1.address);
      expect(timeUntilNext).to.equal(0);
    });
  });
});