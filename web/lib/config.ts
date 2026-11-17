import { createConfig, http, injected } from "wagmi";
import { baseSepolia, hardhat } from "wagmi/chains";
import { isAddress, type Address } from "viem";
import { jurichainAbi } from "./jurichainAbi";

/** NEXT_PUBLIC_CHAIN=local → node Hardhat lokal (31337); selain itu Base Sepolia (84532). */
export const PAKAI_LOKAL = process.env.NEXT_PUBLIC_CHAIN === "local";
export const CHAIN = PAKAI_LOKAL ? hardhat : baseSepolia;

const alamatEnv = process.env.NEXT_PUBLIC_JURICHAIN_ADDRESS ?? "";
export const ALAMAT_VALID = isAddress(alamatEnv);
export const ALAMAT_KONTRAK = (ALAMAT_VALID ? alamatEnv : "0x0000000000000000000000000000000000000000") as Address;

/** Dipakai di semua useReadContract / simulateContract. */
export const kontrak = { address: ALAMAT_KONTRAK, abi: jurichainAbi, chainId: CHAIN.id } as const;

export const config = createConfig({
  chains: [baseSepolia, hardhat],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || undefined),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

/** Link ke Basescan; null di jaringan lokal. */
export function urlExplorer(jenis: "address" | "tx", nilai: string): string | null {
  if (PAKAI_LOKAL) return null;
  return `https://sepolia.basescan.org/${jenis}/${nilai}`;
}
