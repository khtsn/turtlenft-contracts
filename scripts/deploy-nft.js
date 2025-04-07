// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const baseURI = "https://baseurl.com/";
const revealURI = "https://revealurl.com/";

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = await NFT.deploy(owner.address, baseURI, revealURI, "0x2baa455e573df4019b11859231dd9e425d885293", ethers.parseEther("1"), ethers.parseEther("10"));

  console.log(owner.address, baseURI, revealURI, "0x2baa455e573df4019b11859231dd9e425d885293", ethers.parseEther("1"), ethers.parseEther("10"))

  // await nft.waitForDeployment();

  // console.log("TestNFT deployed to:", nft.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });