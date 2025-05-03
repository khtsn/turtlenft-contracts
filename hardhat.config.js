require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const getHDWallet = () => {
  const { MNEMONIC, PRIVATE_KEY } = process.env;
  if (MNEMONIC && MNEMONIC !== "") {
    return {
      mnemonic: MNEMONIC,
    }
  }
  if (PRIVATE_KEY && PRIVATE_KEY !== "") {
    return [PRIVATE_KEY]
  }
  throw Error("Private Key Not Set! Please set up .env");
}

const apiKey = process.env.API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    cronos: {
      url: "https://evm.cronos.org/",
      chainId: 25,
      accounts: getHDWallet(),
      gasPrice: 10100000000000,
    },
    cronosTestnet: {
      url: "https://evm-t3.cronos.org/",
      chainId: 338,
      accounts: getHDWallet(),
      gasPrice: 10100000000000,
    },
  },
  etherscan: {
    apiKey: {
      cronos: apiKey,
      cronosTestnet: apiKey,
    },
    customChains: [
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL:
            "https://explorer-api.cronos.org/mainnet/api/v1/hardhat/contract?apikey=" +
            apiKey,
          browserURL: "https://explorer.cronos.org",
          // apiURL: "https://api.cronoscan.com/api",
          // browserURL: "https://cronoscan.com/",
        },
      },
      {
        network: "cronosTestnet",
        chainId: 338,
        urls: {
          apiURL:
            "https://explorer-api.cronos.org/testnet/api/v1/hardhat/contract?apikey=" +
            apiKey,
          browserURL: "https://explorer.cronos.org/testnet",
        },
      },
    ],
  },
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  sourcify: {
      enabled: false,
  },
};
