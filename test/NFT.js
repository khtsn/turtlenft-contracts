const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const baseURI = "https://baseurl.com/";

describe("NFT", function () {
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

    // Deploy NFT contract
    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy(owner.address, baseURI, token.target, ethers.parseEther("0.01"), ethers.parseEther("100"));
    await nft.waitForDeployment();

    return { token, nft, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { nft, owner } = await loadFixture(deploySimple);
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should admin mint an NFT to the owner", async function () {
        const { nft: nft, owner } = await loadFixture(deploySimple);
        await nft.adminMint(owner.address, 1);
        expect(await nft.ownerOf(0)).to.equal(owner.address);
    });

    it("Should admin mint an NFT to a specific address", async function () {
      const { nft: nft, addr1 } = await loadFixture(deploySimple);
        await nft.adminMint(addr1.address, 1);
        expect(await nft.ownerOf(0)).to.equal(addr1.address);
    });

    it("Should admin mint a batch of NFTs", async function () {
      const { nft: nft, addr1 } = await loadFixture(deploySimple);
        await nft.adminMint(addr1.address, 2);
        expect(await nft.ownerOf(0)).to.equal(addr1.address);
        expect(await nft.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should not allow minting when paused", async function () {
      const { nft: nft, addr1 } = await loadFixture(deploySimple);
        await nft.pause();
        await expect(nft.adminMint(addr1.address, 1)).to.be.reverted;
    });

    it("Should show token URI", async function () {
      const { nft: nft, owner } = await loadFixture(deploySimple);
      await nft.adminMint(owner.address, 1);
      expect(await nft.tokenURI(0)).to.equal(`${baseURI}0`);
    });

    it("Should public mint NFTs with native token", async function () {
      const { nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await nft.connect(addr1).publicMintWithNativeToken(1, { value: ethers.parseEther("0.01") });
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
    });
  
    it("Should fail to mint NFTs with insufficient native token fee", async function () {
      const { nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await expect(nft.connect(addr1).publicMintWithNativeToken(1, { value: ethers.parseEther("0.005") })).to.be.revertedWith("Insufficient native token fee");
    });
  
    it("Should public mint NFTs with ERC20 token", async function () {
      const { token, nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await token.transfer(addr1.address, ethers.parseEther("100"));
      await token.connect(addr1).approve(nft.target, ethers.parseEther("100"));
      await nft.connect(addr1).publicMintWithERC20Token(1);
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
    });
  
    it("Should fail to mint NFTs with insufficient ERC20 token fee", async function () {
      const { token, nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await token.connect(addr1).approve(nft.target, ethers.parseEther("1"));
      await expect(nft.connect(addr1).publicMintWithERC20Token(1)).to.be.reverted;
    });
  });

  describe("Burning", function () {
    it("Should burn an NFT", async function () {
      const { nft, owner } = await loadFixture(deploySimple);
      await nft.adminMint(owner.address, 1);
      await nft.burn(0);
      await expect(nft.ownerOf(0)).to.be.reverted;
    });
  });

  describe("Role Management", function () {
      it("Should only allow owner to pause minting", async function () {
        const { nft: nft, addr1 } = await loadFixture(deploySimple);
          await expect(nft.connect(addr1).pause()).to.be.reverted;
      });
  });

  describe("Base URL Management", function () {
      it("Should allow changing the base URL", async function () {
        const { nft: nft } = await loadFixture(deploySimple);
          await nft.setBaseURI("https://newbaseurl.com/");
          expect(await nft.baseTokenURI()).to.equal("https://newbaseurl.com/");
      });
  });
});
