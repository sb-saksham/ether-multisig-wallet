// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  //Assume 3 owner multi signature wallet
  const quorumRequired = 2;
  const owners = [
    "0x56146E0beF70db9b0ac1bfc7dc179C3ef1e62Df5",
    "0x98cBc93351f5216f5C2126d6Ed49f0878E670176",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  ]
  const MultiSigWallet = await hre.ethers.getContractFactory("MultiSigWallet");
  const multiSigWallet = await MultiSigWallet.deploy(owners, quorumRequired);

  await multiSigWallet.deployed();

  console.log(
    `MultiSigWallet deployed to ${multiSigWallet.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
