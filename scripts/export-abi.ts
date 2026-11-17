import { artifacts } from "hardhat";
import fs from "fs";
import path from "path";

/** Tulis ABI JuriChain ke web/lib/jurichainAbi.ts tanpa deploy. `npm run export-abi` */
async function main() {
  const { abi } = await artifacts.readArtifact("JuriChain");
  const out = path.join(__dirname, "..", "web", "lib", "jurichainAbi.ts");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    "// Dibuat otomatis oleh scripts/deploy.ts / scripts/export-abi.ts — jangan diedit manual.\n" +
      `export const jurichainAbi = ${JSON.stringify(abi, null, 2)} as const;\n`,
  );
  console.log(`ABI ditulis ke ${path.relative(process.cwd(), out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
