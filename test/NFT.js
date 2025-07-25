const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const baseURI = `https://baseurl${Math.floor(Date.now() / 1000)}.com/`;
const revealURI = `https://revealurl${Math.floor(Date.now() / 1000)}.com/`;

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
    const NFT = await ethers.getContractFactory("TurtlesNFT");
    const nft = await NFT.deploy(owner.address, baseURI, revealURI, token.target, ethers.parseEther("1"), ethers.parseEther("10"), 5);
    await nft.waitForDeployment();

    return { token, nft, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { nft, owner } = await loadFixture(deploySimple);
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("Should allow the owner to transfer ownership", async function () {
      const { nft: nft, addr1 } = await loadFixture(deploySimple);
      await nft.transferOwnership(addr1.address);
      expect(await nft.owner()).to.equal(addr1.address);
    })
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

    it("Should show token URI", async function () {
      const { nft: nft, owner } = await loadFixture(deploySimple);
      expect(await nft.isRevealed()).to.equal(false);
      await nft.toggleReveal();
      await nft.adminMint(owner.address, 1);
      expect(await nft.tokenURI(0)).to.equal(`${baseURI}0`);
    });

    it("Should public mint NFTs with native token", async function () {
      const { nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await nft.connect(addr1).publicMintWithNativeToken(1, { value: ethers.parseEther("1") });
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
    });
  
    it("Should fail to mint NFTs with insufficient native token fee", async function () {
      const { nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await expect(nft.connect(addr1).publicMintWithNativeToken(1, { value: ethers.parseEther("0.005") })).to.be.revertedWith("Insufficient native token fee");
    });
  
    it("Should public mint NFTs with ERC20 token", async function () {
      const { token, nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await token.transfer(addr1.address, ethers.parseEther("10"));
      await token.connect(addr1).approve(nft.target, ethers.parseEther("10"));
      await nft.connect(addr1).publicMintWithERC20Token(1);
      expect(await nft.balanceOf(addr1.address)).to.equal(1);
    });
  
    it("Should fail to mint NFTs with insufficient ERC20 token fee", async function () {
      const { token, nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await token.connect(addr1).approve(nft.target, ethers.parseEther("1"));
      await expect(nft.connect(addr1).publicMintWithERC20Token(1)).to.be.reverted;
    });

    it("Should fail to mint after reached max mints for ERC20 token", async function() {
      const { token, nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await token.transfer(addr1.address, ethers.parseEther("100"));
      await token.connect(addr1).approve(nft.target, ethers.parseEther("100"));
      await nft.connect(addr1).publicMintWithERC20Token(1);
      await nft.connect(addr1).publicMintWithERC20Token(1);
      await nft.connect(addr1).publicMintWithERC20Token(1);
      await nft.connect(addr1).publicMintWithERC20Token(2);
      expect(await nft.balanceOf(addr1.address)).to.equal(5);
      await expect(nft.connect(addr1).publicMintWithERC20Token(1)).to.be.revertedWith("Cannot mint more with this method");

      await nft.connect(addr1).publicMintWithNativeToken(1, { value: ethers.parseEther("1") });
      await nft.connect(addr1).publicMintWithNativeToken(1, { value: ethers.parseEther("1") });
      await nft.connect(addr1).publicMintWithNativeToken(2, { value: ethers.parseEther("2") });
      expect(await nft.balanceOf(addr1.address)).to.equal(9);
      await expect(nft.connect(addr1).publicMintWithERC20Token(1)).to.be.revertedWith("Cannot mint more with this method");
    })

    it("Should update max mints with ERC20 token", async function() {
      const { token, nft, owner, addr1, addr2 } = await loadFixture(deploySimple);
      await token.transfer(addr1.address, ethers.parseEther("100"));
      await token.connect(addr1).approve(nft.target, ethers.parseEther("100"));
      await nft.connect(addr1).publicMintWithERC20Token(1);
      await nft.connect(addr1).publicMintWithERC20Token(1);
      await nft.connect(addr1).publicMintWithERC20Token(1);
      await nft.connect(addr1).publicMintWithERC20Token(2);
      expect(await nft.balanceOf(addr1.address)).to.equal(5);

      await expect(nft.connect(addr1).publicMintWithERC20Token(1)).to.be.revertedWith("Cannot mint more with this method");

      await nft.updateERC20MaxMints(10);
      await nft.connect(addr1).publicMintWithERC20Token(5);
      expect(await nft.balanceOf(addr1.address)).to.equal(10);

      await expect(nft.connect(addr1).publicMintWithERC20Token(1)).to.be.revertedWith("Cannot mint more with this method");
    })

    it("Should admin mint 500", async function() {
      const { nft: nft, addr1 } = await loadFixture(deploySimple);
      await nft.adminMint(addr1.address, 500);
      expect(await nft.balanceOf(addr1.address)).to.equal(500);
    })
    
    it("Should admin mint 5000", async function() {
      const { nft: nft, addr1 } = await loadFixture(deploySimple);
      await nft.adminMint(addr1.address, 5000);
      expect(await nft.balanceOf(addr1.address)).to.equal(5000);
    })

    it("Should admin mint 10625", async function() {
      const { nft: nft, addr1 } = await loadFixture(deploySimple);
      await nft.adminMint(addr1.address, 10625);
      expect(await nft.balanceOf(addr1.address)).to.equal(10625);
    })

    it("Should fail admin mint after max mints", async function() {
      const { nft: nft, addr1 } = await loadFixture(deploySimple);
      await nft.adminMint(addr1.address, 10625);
      await expect(nft.adminMint(addr1.address, 1)).to.be.reverted;
    })
  });

  describe("Burning", function () {
    it("Should burn an NFT", async function () {
      const { nft, owner } = await loadFixture(deploySimple);
      await nft.adminMint(owner.address, 1);
      await nft.burn(0);
      await expect(nft.ownerOf(0)).to.be.reverted;
    });
  });

  describe("Base URL Management", function () {
      it("Should allow changing the base URL", async function () {
        const { nft: nft } = await loadFixture(deploySimple);
        let newBaseURL = `https://newbaseurl${Math.floor(Date.now() / 1000)}.com/`
        await nft.setBaseURI(newBaseURL);
        expect(await nft.baseTokenURI()).to.equal(newBaseURL);
      });
  });

  describe("Withdraw", function () {
    it("Should allow owner to withdraw funds on native tokens", async function () {
      const { nft: nft, owner, addr1 } = await loadFixture(deploySimple);
      // Mint with native token to generate balance
      await nft.connect(addr1).publicMintWithNativeToken(1, { value: ethers.parseEther("10") });
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
  
      // Withdraw funds
      await nft.connect(owner).withdraw();
  
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
    });

    it("Should allow owner to withdraw ERC20 token funds", async function () {
      const { token, nft, owner, addr1 } = await loadFixture(deploySimple);
      // Mint with ERC20 token to generate balance
      await token.transfer(addr1.address, ethers.parseEther("10"));
      await token.connect(addr1).approve(nft.target, ethers.parseEther("10"));
      await nft.connect(addr1).publicMintWithERC20Token(1);
  
      const initialOwnerERC20Balance = await token.balanceOf(owner.address);
  
      // Withdraw ERC20 funds
      await nft.connect(owner).withdrawERC20();
  
      const finalOwnerERC20Balance = await token.balanceOf(owner.address);
      expect(finalOwnerERC20Balance).to.be.gt(initialOwnerERC20Balance);
    });
  });

  describe("Reveal", function () {
    it("Should return the correct token URI before and after reveal", async function () {
      const { nft: nft, owner, addr1 } = await loadFixture(deploySimple);
      // Mint a token
      await nft.connect(addr1).publicMintWithNativeToken(1, { value: ethers.parseEther("10") });
      const tokenId = 0;
  
      // Check token URI before reveal
      let tokenURI = await nft.tokenURI(tokenId);
      expect(tokenURI).to.equal(revealURI);
  
      expect(await nft.isRevealed()).to.equal(false);
      // Toggle reveal
      await nft.connect(owner).toggleReveal();
  
      // Check token URI after reveal
      tokenURI = await nft.tokenURI(tokenId);
      expect(tokenURI).to.equal(`${baseURI}0`);
    });
  
    it("Should toggle reveal state", async function () {
      const { nft: nft, owner } = await loadFixture(deploySimple);
      // Initial reveal state should be false
      expect(await nft.isRevealed()).to.equal(false);
  
      // Toggle reveal
      await nft.connect(owner).toggleReveal();
  
      // Reveal state should be true
      expect(await nft.isRevealed()).to.equal(true);
  
      // Toggle reveal again
      await nft.connect(owner).toggleReveal();
  
      // Reveal state should be false again
      expect(await nft.isRevealed()).to.equal(false);
    });
  });
});
