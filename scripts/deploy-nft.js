// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const baseURI = "https://nft.turtleoncro.com/";
const revealURI = "https://intro.turtleoncro.com/";

async function main() {
  const NFT = await hre.ethers.getContractFactory("TurtlesNFT");
  const nft = await NFT.deploy(
    "0xF10C971A0b5DB479D13AB3db24D656Dc334cc85A", 
    baseURI, 
    revealURI, 
    "0x8C9E2bEf2962CE302ef578113eebEc62920B7e57", 
    ethers.parseEther("240"), 
    ethers.parseEther("200000"),
    2625
  );
  await nft.waitForDeployment();
  console.log("TurtlesNFT deployed to:", nft.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });