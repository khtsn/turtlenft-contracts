const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe.only("TurtleRedemptionVault", function () {
    async function deployFixture() {
        const [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Token
        const Token = await ethers.getContractFactory("Token");
        const token = await Token.deploy(owner.address);

        // Deploy NFT
        const TurtlesNFT = await ethers.getContractFactory("TurtlesNFT");
        const nft = await TurtlesNFT.deploy(
            owner.address,
            "https://api.example.com/metadata/",
            "https://api.example.com/reveal/",
            token.target,
            ethers.parseEther("0.1"),
            ethers.parseEther("100"),
            1000
        );

        // Deploy Vault
        const TurtleRedemptionVault = await ethers.getContractFactory("TurtleRedemptionVault");
        const vault = await TurtleRedemptionVault.deploy(nft.target, token.target, owner.address);

        // Transfer tokens from owner (who has initial supply) and mint NFTs for testing
        await token.transfer(addr1.address, ethers.parseEther("100000"));
        await nft.adminMint(addr1.address, 10);

        return { vault, token, nft, owner, addr1, addr2 };
    }

    describe("Deployment", function () {
        it("Should set correct owner", async function () {
            const { vault, owner } = await loadFixture(deployFixture);
            expect(await vault.owner()).to.equal(owner.address);
        });

        it("Should set correct default fees", async function () {
            const { vault } = await loadFixture(deployFixture);
            expect(await vault.swapFeeTurtle()).to.equal(ethers.parseEther("100"));
            expect(await vault.purchaseFeeCRO()).to.equal(ethers.parseEther("10"));
        });
    });

    describe("View Functions", function () {
        it("Should calculate turtlePerNFT correctly", async function () {
            const { vault, token } = await loadFixture(deployFixture);
            
            // Transfer tokens to vault
            await token.transfer(vault.target, ethers.parseEther("10625"));
            
            const perNFT = await vault.turtlePerNFT();
            expect(perNFT).to.equal(ethers.parseEther("1"));
        });

        it("Should return empty vault NFTs initially", async function () {
            const { vault } = await loadFixture(deployFixture);
            const vaultNFTs = await vault.getVaultNFTs();
            expect(vaultNFTs.length).to.equal(0);
        });
    });

    describe("Fee Management", function () {
        it("Should allow owner to set swap fee", async function () {
            const { vault, owner } = await loadFixture(deployFixture);
            
            await expect(vault.setSwapFeeTurtle(ethers.parseEther("200")))
                .to.emit(vault, "SwapFeeTurtleChanged")
                .withArgs(ethers.parseEther("100"), ethers.parseEther("200"));
            
            expect(await vault.swapFeeTurtle()).to.equal(ethers.parseEther("200"));
        });

        it("Should allow owner to set purchase fee", async function () {
            const { vault, owner } = await loadFixture(deployFixture);
            
            await expect(vault.setPurchaseFeeCRO(ethers.parseEther("20")))
                .to.emit(vault, "PurchaseFeeCROChanged")
                .withArgs(ethers.parseEther("10"), ethers.parseEther("20"));
            
            expect(await vault.purchaseFeeCRO()).to.equal(ethers.parseEther("20"));
        });

        it("Should reject non-owner fee changes", async function () {
            const { vault, addr1 } = await loadFixture(deployFixture);
            
            await expect(vault.connect(addr1).setSwapFeeTurtle(ethers.parseEther("200")))
                .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });
    });

    describe("Deposit NFTs", function () {
        it("Should reject empty token array", async function () {
            const { vault } = await loadFixture(deployFixture);
            
            await expect(vault.depositByIds([]))
                .to.be.revertedWith("Invalid amount: 1-20 NFTs only");
        });

        it("Should reject more than 20 NFTs", async function () {
            const { vault } = await loadFixture(deployFixture);
            const tokenIds = Array.from({length: 21}, (_, i) => i + 1);
            
            await expect(vault.depositByIds(tokenIds))
                .to.be.revertedWith("Invalid amount: 1-20 NFTs only");
        });

        it("Should reject deposit when pool empty", async function () {
            const { vault } = await loadFixture(deployFixture);
            
            await expect(vault.depositByIds([1]))
                .to.be.revertedWith("Pool empty");
        });

        it("Should reject duplicate tokens", async function () {
            const { vault, token, addr1 } = await loadFixture(deployFixture);
            
            await token.transfer(vault.target, ethers.parseEther("10625"));
            
            await expect(vault.connect(addr1).depositByIds([1, 1]))
                .to.be.revertedWith("Duplicate token");
        });

        it("Should reject non-owned tokens", async function () {
            const { vault, token, addr2 } = await loadFixture(deployFixture);
            
            await token.transfer(vault.target, ethers.parseEther("10625"));
            
            await expect(vault.connect(addr2).depositByIds([1]))
                .to.be.revertedWith("Not token owner");
        });

        it("Should successfully deposit NFTs", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).approve(vault.target, 1);
            
            await expect(vault.connect(addr1).depositByIds([1]))
                .to.emit(vault, "NFTDepositedBatch")
                .withArgs(addr1.address, [1], ethers.parseEther("1"));
            
            expect(await vault.vaultNFTs(0)).to.equal(1);
        });
    });

    describe("Swap for NFTs", function () {
        it("Should reject empty token arrays", async function () {
            const { vault } = await loadFixture(deployFixture);
            
            await expect(vault.swapForNFTs([], []))
                .to.be.revertedWith("Invalid amount: 1-20 NFTs only");
        });

        it("Should reject mismatched array lengths", async function () {
            const { vault } = await loadFixture(deployFixture);
            
            await expect(vault.swapForNFTs([1, 2], [3]))
                .to.be.revertedWith("Token arrays must be same length");
        });

        it("Should reject more than 20 NFTs", async function () {
            const { vault } = await loadFixture(deployFixture);
            const userTokenIds = Array.from({length: 21}, (_, i) => i + 1);
            const vaultTokenIds = Array.from({length: 21}, (_, i) => i + 100);
            
            await expect(vault.swapForNFTs(userTokenIds, vaultTokenIds))
                .to.be.revertedWith("Invalid amount: 1-20 NFTs only");
        });

        it("Should reject duplicate user tokens", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            // Setup vault with NFTs
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).approve(vault.target, 1);
            await vault.connect(addr1).depositByIds([1]);
            
            await expect(vault.connect(addr1).swapForNFTs([2, 2], [1, 1]))
                .to.be.revertedWith("Duplicate user token");
        });

        it("Should reject duplicate vault tokens", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            // Setup vault with NFTs
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).setApprovalForAll(vault.target, true);
            await vault.connect(addr1).depositByIds([1, 2]);
            
            await expect(vault.connect(addr1).swapForNFTs([3, 4], [1, 1]))
                .to.be.revertedWith("Duplicate vault token");
        });

        it("Should reject non-owned user tokens", async function () {
            const { vault, token, nft, addr1, addr2 } = await loadFixture(deployFixture);
            
            // Setup vault with NFT
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).approve(vault.target, 1);
            await vault.connect(addr1).depositByIds([1]);
            
            await expect(vault.connect(addr2).swapForNFTs([2], [1]))
                .to.be.revertedWith("Not token owner");
        });

        it("Should reject vault tokens not in vault", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            // Setup vault with NFT
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).approve(vault.target, 1);
            await vault.connect(addr1).depositByIds([1]);
            
            await expect(vault.connect(addr1).swapForNFTs([2], [999]))
                .to.be.revertedWith("NFT not in vault");
        });

        it("Should reject insufficient TURTLE allowance", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            // Setup vault with NFT
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).setApprovalForAll(vault.target, true);
            await vault.connect(addr1).depositByIds([1]);
            
            // Don't approve TURTLE tokens
            await expect(vault.connect(addr1).swapForNFTs([2], [1]))
                .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
        });

        it("Should successfully perform 1:1 swap", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            // Setup vault with NFT
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).setApprovalForAll(vault.target, true);
            await vault.connect(addr1).depositByIds([1]);
            
            // Approve TURTLE for swap fee
            const swapFee = ethers.parseEther("100");
            await token.connect(addr1).approve(vault.target, swapFee);
            
            await expect(vault.connect(addr1).swapForNFTs([2], [1]))
                .to.emit(vault, "NFTSwapped")
                .withArgs(addr1.address, [2], [1], swapFee, swapFee);
            
            // Verify NFT ownership changed
            expect(await nft.ownerOf(1)).to.equal(addr1.address);
            expect(await nft.ownerOf(2)).to.equal(vault.target);
        });

        it("Should successfully perform multi-NFT swap", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            // Setup vault with NFTs
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).setApprovalForAll(vault.target, true);
            await vault.connect(addr1).depositByIds([1, 2]);
            
            // Approve TURTLE for swap fee (2 NFTs)
            const swapFee = ethers.parseEther("200");
            await token.connect(addr1).approve(vault.target, swapFee);
            
            await expect(vault.connect(addr1).swapForNFTs([3, 4], [1, 2]))
                .to.emit(vault, "NFTSwapped")
                .withArgs(addr1.address, [3, 4], [1, 2], swapFee, swapFee);
            
            // Verify NFT ownership changed
            expect(await nft.ownerOf(1)).to.equal(addr1.address);
            expect(await nft.ownerOf(2)).to.equal(addr1.address);
            expect(await nft.ownerOf(3)).to.equal(vault.target);
            expect(await nft.ownerOf(4)).to.equal(vault.target);
        });

        it("Should update vault NFTs array correctly", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            // Setup vault with NFTs
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).setApprovalForAll(vault.target, true);
            await vault.connect(addr1).depositByIds([1, 2, 3]);
            
            // Verify initial vault state
            let vaultNFTs = await vault.getVaultNFTs();
            expect(vaultNFTs).to.deep.equal([1n, 2n, 3n]);
            
            // Perform swap
            const swapFee = ethers.parseEther("200");
            await token.connect(addr1).approve(vault.target, swapFee);
            await vault.connect(addr1).swapForNFTs([4, 5], [1, 2]);
            
            // Verify vault state after swap
            vaultNFTs = await vault.getVaultNFTs();
            expect(vaultNFTs).to.deep.equal([4n, 5n, 3n]);
        });

        it("Should handle swap with custom fee", async function () {
            const { vault, token, nft, addr1, owner } = await loadFixture(deployFixture);
            
            // Set custom swap fee
            await vault.setSwapFeeTurtle(ethers.parseEther("50"));
            
            // Setup vault with NFT
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).setApprovalForAll(vault.target, true);
            await vault.connect(addr1).depositByIds([1]);
            
            // Approve TURTLE for custom swap fee
            const customFee = ethers.parseEther("50");
            await token.connect(addr1).approve(vault.target, customFee);
            
            await expect(vault.connect(addr1).swapForNFTs([2], [1]))
                .to.emit(vault, "NFTSwapped")
                .withArgs(addr1.address, [2], [1], customFee, customFee);
        });
    });

    describe("Purchase with CRO", function () {
        it("Should reject insufficient CRO", async function () {
            const { vault } = await loadFixture(deployFixture);
            
            await expect(vault.purchaseNFTsWithCRO([1], { value: ethers.parseEther("5") }))
                .to.be.revertedWith("Insufficient CRO");
        });

        it("Should reject purchase of non-existent NFT", async function () {
            const { vault } = await loadFixture(deployFixture);
            
            await expect(vault.purchaseNFTsWithCRO([999], { value: ethers.parseEther("10") }))
                .to.be.revertedWith("NFT not in vault");
        });

        it("Should reject duplicate tokens in purchase", async function () {
            const { vault, token, nft, addr1 } = await loadFixture(deployFixture);
            
            // Setup vault with NFT
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).approve(vault.target, 1);
            await vault.connect(addr1).depositByIds([1]);
            
            await expect(vault.purchaseNFTsWithCRO([1, 1], { value: ethers.parseEther("20") }))
                .to.be.revertedWith("Duplicate token");
        });

        it("Should successfully purchase NFTs with CRO", async function () {
            const { vault, token, nft, addr1, addr2 } = await loadFixture(deployFixture);
            
            // Setup vault with NFT
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).approve(vault.target, 1);
            await vault.connect(addr1).depositByIds([1]);
            
            await expect(vault.connect(addr2).purchaseNFTsWithCRO([1], { value: ethers.parseEther("10") }))
                .to.emit(vault, "NFTPurchasedWithCRO")
                .withArgs(addr2.address, [1], ethers.parseEther("10"));
        });

        it("Should refund excess CRO", async function () {
            const { vault, token, nft, addr1, addr2 } = await loadFixture(deployFixture);
            
            // Setup vault with NFT
            await token.transfer(vault.target, ethers.parseEther("10625"));
            await nft.connect(addr1).approve(vault.target, 1);
            await vault.connect(addr1).depositByIds([1]);
            
            const initialBalance = await ethers.provider.getBalance(addr2.address);
            const tx = await vault.connect(addr2).purchaseNFTsWithCRO([1], { value: ethers.parseEther("15") });
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const finalBalance = await ethers.provider.getBalance(addr2.address);
            
            // Should only pay 10 CRO + gas, refund 5 CRO
            expect(initialBalance - finalBalance - gasUsed).to.equal(ethers.parseEther("10"));
        });
    });

    describe("CRO Withdrawal", function () {
        it("Should allow owner to withdraw all CRO", async function () {
            const { vault, owner } = await loadFixture(deployFixture);
            
            // Send CRO to vault
            const amount = ethers.parseEther("5");
            await owner.sendTransaction({
                to: vault.target,
                value: amount
            });
            
            await expect(vault.withdrawCRO())
                .to.emit(vault, "CROWithdrawn")
                .withArgs(await vault.owner(), amount);
        });

        it("Should reject withdrawal when no CRO", async function () {
            const { vault } = await loadFixture(deployFixture);
            
            await expect(vault.withdrawCRO())
                .to.be.revertedWith("No CRO to withdraw");
        });

        it("Should reject non-owner CRO withdrawal", async function () {
            const { vault, addr1 } = await loadFixture(deployFixture);
            
            await expect(vault.connect(addr1).withdrawCRO())
                .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });
    });

    describe("ERC721 Receiver", function () {
        it("Should return correct selector", async function () {
            const { vault } = await loadFixture(deployFixture);
            
            const selector = await vault.onERC721Received(
                ethers.ZeroAddress,
                ethers.ZeroAddress,
                1,
                "0x"
            );
            
            expect(selector).to.equal("0x150b7a02");
        });
    });

    describe("Receive and Fallback", function () {
        it("Should accept CRO via receive", async function () {
            const { vault, addr1 } = await loadFixture(deployFixture);
            
            await expect(addr1.sendTransaction({
                to: vault.target,
                value: ethers.parseEther("1")
            })).to.not.be.reverted;
        });

        it("Should accept CRO via fallback", async function () {
            const { vault, addr1 } = await loadFixture(deployFixture);
            
            await expect(addr1.sendTransaction({
                to: vault.target,
                value: ethers.parseEther("1"),
                data: "0x1234"
            })).to.not.be.reverted;
        });
    });

    describe("Constants", function () {
        it("Should have correct MAX_BATCH_SIZE", async function () {
            const { vault } = await loadFixture(deployFixture);
            expect(await vault.MAX_BATCH_SIZE()).to.equal(20);
        });
    });
});