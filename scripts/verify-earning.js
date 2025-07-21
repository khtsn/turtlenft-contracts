const hre = require("hardhat");

async function main() {
  const earningAddress = process.env.EARNING_CONTRACT_ADDRESS;
  const deployerAddress = process.env.DEPLOYER_ADDRESS;
  const nftAddress = process.env.NFT_CONTRACT_ADDRESS;
  const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;

  if (!earningAddress || !deployerAddress || !nftAddress || !tokenAddress) {
    console.error("Please set EARNING_CONTRACT_ADDRESS, DEPLOYER_ADDRESS, NFT_CONTRACT_ADDRESS, and TOKEN_CONTRACT_ADDRESS in your .env file");
    return;
  }

  console.log("Verifying Earning contract at address:", earningAddress);

  try {
    await hre.run("verify:verify", {
      address: earningAddress,
      constructorArguments: [
        deployerAddress,
        nftAddress,
        tokenAddress
      ],
    });
    console.log("Earning contract verified successfully");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });