const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying TurtleRedemptionVault with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Contract addresses - update these with your deployed contract addresses
  const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || "0x5848335Bbd8e10725F5A35d97A8e252eFdA9Be1a";
  const TURTLE_TOKEN_ADDRESS = process.env.TURTLE_TOKEN_ADDRESS || "0x2bAA455e573df4019B11859231Dd9e425D885293";
  const OWNER_ADDRESS = deployer.address;

  console.log("NFT Contract Address:", NFT_CONTRACT_ADDRESS);
  console.log("Turtle Token Address:", TURTLE_TOKEN_ADDRESS);
  console.log("Owner Address:", OWNER_ADDRESS);

  const TurtleRedemptionVault = await ethers.getContractFactory("TurtleRedemptionVault");
  const vault = await TurtleRedemptionVault.deploy(
    NFT_CONTRACT_ADDRESS,
    TURTLE_TOKEN_ADDRESS,
    OWNER_ADDRESS
  );

  await vault.waitForDeployment();

  console.log("TurtleRedemptionVault deployed to:", await vault.getAddress());
  console.log("Constructor args:", [NFT_CONTRACT_ADDRESS, TURTLE_TOKEN_ADDRESS, OWNER_ADDRESS]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });