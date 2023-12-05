require("dotenv").config();
import { task, HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import '@openzeppelin/hardhat-upgrades';
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "solidity-coverage";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  typechain: {
    outDir: "types/",
    target: "ethers-v5",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 60 * 30 * 1000,
  },
};

export default config;
