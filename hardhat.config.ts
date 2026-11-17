import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

// Rahasia dibaca dari .env (lihat .env.example). JANGAN menaruh private key di file ini.
const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY ?? "";

// Saat `npx hardhat node`: tambang blok kosong tiap 2 detik (meniru Base) agar timestamp blok
// terakhir mengikuti jam dinding. Tanpa ini, eth_call/estimateGas memakai timestamp basi
// sehingga simulasi tenggat (majukanTahap, karya terlambat) di UI bisa keliru saat rantai sepi.
// Tidak dipakai saat `hardhat test` agar test berbasis time.increase tetap deterministik.
const SEDANG_NODE = process.argv.includes("node");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      ...(SEDANG_NODE ? { mining: { auto: true, interval: 2000 } } : {}),
    },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // Satu API key Etherscan (API V2) berlaku untuk semua chain, termasuk Base Sepolia.
  etherscan: { apiKey: BASESCAN_API_KEY },
  sourcify: { enabled: false },
};

export default config;
