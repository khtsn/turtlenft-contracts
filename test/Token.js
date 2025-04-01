const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("Token", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploySimple() {
    // Contracts are deployed using the first signer/account by default
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy ERC20 token
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    return { token, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { token, owner } = await loadFixture(deploySimple);
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("Transfer", function () {
    it("Should transfer to other addresses", async function () {
        const { token, addr1, addr2 } = await loadFixture(deploySimple);
        await token.transfer(addr1.address, ethers.parseEther("10"));
        expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
        await token.transfer(addr2.address, ethers.parseEther("100"));
        expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("100"));
    });
  });
});
