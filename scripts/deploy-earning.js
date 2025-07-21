const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get the NFT and Token contract addresses
  // Replace these with your actual deployed contract addresses
  const nftAddress = process.env.NFT_CONTRACT_ADDRESS;
  const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;

  if (!nftAddress || !tokenAddress) {
    console.error("Please set NFT_CONTRACT_ADDRESS and TOKEN_CONTRACT_ADDRESS in your .env file");
    return;
  }

  console.log("NFT Contract:", nftAddress);
  console.log("Token Contract:", tokenAddress);

  // Deploy Earning contract
  const Earning = await hre.ethers.getContractFactory("Earning");
  const earning = await Earning.deploy(deployer.address, nftAddress, tokenAddress);

  await earning.waitForDeployment();
  const earningAddress = await earning.getAddress();

  console.log("Earning contract deployed to:", earningAddress);
  console.log("Verify with:");
  console.log(`npx hardhat verify --network mainnet ${earningAddress} ${deployer.address} ${nftAddress} ${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });