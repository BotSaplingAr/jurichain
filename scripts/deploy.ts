import { ethers, network, artifacts } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Deploy JuriChain.
 *   Lokal  : npx hardhat run scripts/deploy.ts --network localhost
 *   Testnet: npx hardhat run scripts/deploy.ts --network baseSepolia
 *
 * Hasil:
 *   - deployments/<network>.json  (alamat, chainId, blok, tx)
 *   - web/lib/jurichainAbi.ts      (ABI untuk frontend)
 */
async function main() {
  const { chainId } = await ethers.provider.getNetwork();

  if (network.name === "baseSepolia") {
    if (chainId !== 84532n) throw new Error(`chainId ${chainId} bukan Base Sepolia (84532). Cek BASE_SEPOLIA_RPC_URL.`);
    if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY belum diisi di .env (lihat .env.example).");
    console.log("⚠️  Pastikan PRIVATE_KEY adalah dompet KHUSUS TESTNET.");
  }

  const [deployer] = await ethers.getSigners();
  const saldo = await ethers.provider.getBalance(deployer.address);
  console.log(`Jaringan : ${network.name} (chainId ${chainId})`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Saldo    : ${ethers.formatEther(saldo)} ETH`);
  if (saldo === 0n) throw new Error("Saldo deployer 0. Isi ETH testnet dari faucet Base Sepolia dulu.");

  const jc = await ethers.deployContract("JuriChain");
  const tx = jc.deploymentTransaction()!;
  console.log(`Tx deploy: ${tx.hash} — menunggu konfirmasi...`);
  await jc.waitForDeployment();
  const receipt = await tx.wait(network.name === "baseSepolia" ? 2 : 1);
  const alamat = await jc.getAddress();

  const root = path.join(__dirname, "..");
  const dirDeploy = path.join(root, "deployments");
  fs.mkdirSync(dirDeploy, { recursive: true });
  const info = {
    network: network.name,
    chainId: Number(chainId),
    address: alamat,
    deployer: deployer.address,
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber ?? null,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dirDeploy, `${network.name}.json`), JSON.stringify(info, null, 2) + "\n");

  const { abi } = await artifacts.readArtifact("JuriChain");
  const dirWeb = path.join(root, "web", "lib");
  fs.mkdirSync(dirWeb, { recursive: true });
  fs.writeFileSync(
    path.join(dirWeb, "jurichainAbi.ts"),
    "// Dibuat otomatis oleh scripts/deploy.ts / scripts/export-abi.ts — jangan diedit manual.\n" +
      `export const jurichainAbi = ${JSON.stringify(abi, null, 2)} as const;\n`,
  );

  console.log(`\n✅ JuriChain ter-deploy di ${alamat}`);
  if (network.name === "baseSepolia") console.log(`   https://sepolia.basescan.org/address/${alamat}`);

  if (network.name === "localhost" || network.name === "baseSepolia") {
    const fileEnv = path.join(root, "web", ".env.local");
    aturEnv(fileEnv, {
      NEXT_PUBLIC_CHAIN: network.name === "localhost" ? "local" : "baseSepolia",
      NEXT_PUBLIC_JURICHAIN_ADDRESS: alamat,
    });
    console.log(`\nweb/.env.local diperbarui (NEXT_PUBLIC_CHAIN & NEXT_PUBLIC_JURICHAIN_ADDRESS).`);
    console.log("Jika `npm run dev` sedang jalan, hentikan (Ctrl+C) lalu jalankan lagi.");
  }
}

/** Ubah/tambah beberapa kunci di file .env tanpa menyentuh baris lain. */
function aturEnv(file: string, nilai: Record<string, string>) {
  const baris = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split(/\r?\n/) : [];
  for (const [k, v] of Object.entries(nilai)) {
    const i = baris.findIndex((b) => b.startsWith(`${k}=`));
    if (i >= 0) baris[i] = `${k}=${v}`;
    else baris.push(`${k}=${v}`);
  }
  fs.writeFileSync(file, baris.filter((b, i) => b !== "" || i < baris.length - 1).join("\n") + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
