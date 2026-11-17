import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import type { Address } from "viem";
import { buatSalt, hitungHashNilai } from "../web/lib/commitReveal";

/**
 * Simulasi alur lengkap di node lokal (tanpa UI), memakai WAKTU NYATA (bukan time.increase)
 * agar jam blockchain tetap sama dengan jam browser.
 *
 *   Terminal 1: npm run node
 *   Terminal 2: npm run deploy:local && npm run simulasi
 *
 * Akun Hardhat: #0 panitia(admin) · #1-#3 juri · #4-#5 peserta · #6 peserta terlambat
 * Skenario: karya terlambat ditolak, juri #3 commit tapi tidak reveal, kuorum 2 → DIUMUMKAN.
 */
const DETIK = { daftar: 25, commit: 50, reveal: 75 };
const STATUS = ["DIBUAT", "PENDAFTARAN", "PENILAIAN_COMMIT", "PENILAIAN_REVEAL", "DIUMUMKAN", "SENGKETA"];

const tidur = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

/** Timestamp blok terakhir. Jam rantai bisa sedikit mendahului jam komputer (tiap blok minimal +1 detik). */
const waktuRantai = async () => Number((await ethers.provider.getBlock("latest"))!.timestamp);

/** Tunggu sampai jam RANTAI melewati t (bukan jam komputer). */
async function tungguSampai(t: number, label: string) {
  let sisa = t - (await waktuRantai()) + 1;
  if (sisa <= 0) return;
  console.log(`   … menunggu ±${sisa} detik (${label})`);
  while (sisa > 0) {
    await tidur(Math.min(sisa, 2));
    sisa = t - (await waktuRantai()) + 1;
  }
}

async function main() {
  if (network.name !== "localhost") throw new Error("Jalankan dengan --network localhost");
  const info = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "localhost.json"), "utf8"));
  const [panitia, j1, j2, j3, p1, p2, pTelat] = await ethers.getSigners();
  const juri = [j1, j2, j3];
  const jc = await ethers.getContractAt("JuriChain", info.address);
  const status = async (id: bigint) => STATUS[Number((await jc.daftarLomba(id)).status)];

  console.log(`Kontrak: ${info.address}\n`);
  const now = Math.max(Math.floor(Date.now() / 1000), await waktuRantai());
  const t = [now + DETIK.daftar, now + DETIK.commit, now + DETIK.reveal];
  const hashPanduan = ethers.keccak256(ethers.toUtf8Bytes("panduan-simulasi"));
  const rc = await (await jc.connect(panitia).buatLomba("Simulasi Lokal", hashPanduan, ["Kreativitas", "Teknis", "Presentasi"], [40, 30, 30], t, 2)).wait();
  const id = (jc.interface.parseLog(rc!.logs[0])!.args.idLomba as bigint);
  console.log(`1) Lomba #${id} dibuat (kuorum 2)`);

  await (await jc.connect(panitia).tetapkanJuri(id, juri.map((j) => j.address))).wait();
  for (const p of [p1, p2, pTelat]) await (await jc.connect(panitia).daftarkanPeserta(id, p.address)).wait();
  await (await jc.connect(panitia).bukaPendaftaran(id)).wait();
  console.log(`2) 3 juri ditetapkan, 3 peserta didaftarkan, status: ${await status(id)}`);

  await (await jc.connect(p1).kumpulkanKarya(id, ethers.keccak256(ethers.toUtf8Bytes("karya-1")))).wait();
  await (await jc.connect(p2).kumpulkanKarya(id, ethers.keccak256(ethers.toUtf8Bytes("karya-2")))).wait();
  console.log("3) Peserta #4 dan #5 mengumpulkan karya");

  await tungguSampai(t[0], "batas pendaftaran");
  try {
    await jc.connect(pTelat).kumpulkanKarya.staticCall(id, ethers.keccak256(ethers.toUtf8Bytes("telat")));
    throw new Error("SEHARUSNYA DITOLAK");
  } catch (e: any) {
    if (e.message === "SEHARUSNYA DITOLAK") throw e;
    console.log(`4) Karya terlambat peserta #6 DITOLAK: ${e.revert?.name ?? e.shortMessage ?? e.message}`);
  }
  await (await jc.majukanTahap(id)).wait();
  console.log(`   majukanTahap → ${await status(id)}`);

  const nilai = [
    [[80, 70, 90], [60, 65, 70]],
    [[85, 75, 80], [70, 60, 55]],
    [[90, 80, 70], [50, 75, 60]],
  ];
  const kunci: { k: bigint; n: number[]; salt: `0x${string}` }[][] = [];
  for (let j = 0; j < 3; j++) {
    kunci[j] = [];
    for (const k of [1n, 2n]) {
      const salt = buatSalt();
      const n = nilai[j][Number(k) - 1];
      await (await jc.connect(juri[j]).commitNilai(id, k, hitungHashNilai(id, k, n, salt, juri[j].address as Address))).wait();
      kunci[j].push({ k, n, salt });
    }
  }
  console.log("5) Ketiga juri commit nilai untuk 2 karya");

  await tungguSampai(t[1], "batas commit");
  await (await jc.majukanTahap(id)).wait();
  console.log(`   majukanTahap → ${await status(id)}`);

  for (let j = 0; j < 2; j++) for (const x of kunci[j]) await (await jc.connect(juri[j]).revealNilai(id, x.k, x.n, x.salt)).wait();
  console.log("6) Juri #1 dan #2 reveal; juri #3 TIDAK reveal");

  await tungguSampai(t[2], "batas reveal");
  await (await jc.majukanTahap(id)).wait();
  console.log(`   majukanTahap → ${await status(id)}\n`);

  for (const k of [1n, 2n]) {
    const [, n, r] = await jc.lihatSkor(id, k);
    console.log(`   K-00${k}: skor ${(Number(r) / 100).toFixed(2)} dari ${n} juri`);
  }
  console.log(`   jmlGagalReveal juri #3 = ${await jc.jmlGagalReveal(j3.address)}`);
  console.log(`\nBuka http://localhost:3000/hasil/${id} untuk melihat hasilnya di UI.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
