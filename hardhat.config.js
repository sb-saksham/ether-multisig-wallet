require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: 'hardhat',
  paths: {
    sources: './contracts/',
    artifacts: './src/artifacts/',
    tests: './test/',
    cache: './cache/'
  },
  networks: {
    hardhat: {
      // chainID: 1337,
    },
    // goerli: {
    //   url: 'https://goerli-testnet-node-url.com',
    //   // accounts: [privateKey1, privateKey2]
    // },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.REACT_APP_API_SEPOLIA_KEY}`,
      accounts: [process.env.REACT_APP_PRIVATE_KEY]
    }
  }
};
