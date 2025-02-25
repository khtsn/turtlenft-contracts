const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

// describe("Token", function () {
//   // We define a fixture to reuse the same setup in every test.
//   // We use loadFixture to run this setup once, snapshot that state,
//   // and reset Hardhat Network to that snapshot in every test.
//   async function deploySimple() {
//     // Contracts are deployed using the first signer/account by default
//     const [owner] = await ethers.getSigners();

//     const Token = await ethers.deployContract("Token");
//     const token = await Token.deploy(owner.address);
//     await token.waitForDeployment();

//     return { token, owner, otherAccount, addr1, addr2 };
//   }

//   describe("Deployment", function () {
//     it("Should set the right owner", async function () {
//       const { token, owner } = await loadFixture(deploySimple);

//       expect(await token.owner()).to.equal(owner.address);
//     });
//   });

//   describe("Transfer", function () {
//     it("Should transfer to other addresses", async function () {
//         const { token, owner, addr1, addr2 } = await loadFixture(deploySimple);
//         await token.transfer(addr1.address, 1000000);
//         expect(await token.balanceOf(addr1.address)).to.equal(1000000);
//         await token.transfer(addr2.address, 3000000);
//         expect(await token.balanceOf(addr2.address)).to.equal(3000000);
//     });
//   });
// });
