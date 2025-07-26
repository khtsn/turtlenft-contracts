const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get token address from environment or use deployed address
  const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
  if (!tokenAddress) {
    throw new Error("Please set TOKEN_CONTRACT_ADDRESS environment variable");
  }

  // Deploy Faucet contract
  const Faucet = await ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy(deployer.address, tokenAddress);

  await faucet.waitForDeployment();

  console.log("Faucet deployed to:", await faucet.getAddress());
  console.log("Token address:", tokenAddress);
  console.log("Default reward amount:", ethers.formatEther(await faucet.rewardAmount()));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });