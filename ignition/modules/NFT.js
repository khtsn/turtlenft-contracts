// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("NFT", (m) => {
  const owner = m.getAccount(0);

  const token = m.contract("Token", [owner]);

  const nft = m.contract("NFT", [
    owner,
    "https://baseurl.com/",
    token,
    ethers.parseEther("1"),
    ethers.parseEther("10"),
  ]);

  return { token, nft };
});
