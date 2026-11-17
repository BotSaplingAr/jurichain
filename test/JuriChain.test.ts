import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { Hex, Address } from "viem";
import { buatSalt, hitungHashNilai } from "../web/lib/commitReveal";

// Urutan enum StatusLomba di kontrak
const S = { DIBUAT: 0n, PENDAFTARAN: 1n, PENILAIAN_COMMIT: 2n, PENILAIAN_REVEAL: 3n, DIUMUMKAN: 4n, SENGKETA: 5n };

const MENIT = 60;
const KRITERIA = ["Kreativitas", "Teknis", "Presentasi"];
const BOBOT = [40, 30, 30];
const HASH_PANDUAN = ethers.keccak256(ethers.toUtf8Bytes("panduan-lomba.pdf"));

/** Skor tertimbang satu juri (skala 0..10000), sama seperti di kontrak. */
const skorJuri = (nilai: number[]) => nilai.reduce((t, n, i) => t + n * BOBOT[i], 0);

describe("JuriChain", () => {
  async function deployFixture() {
    const [admin, panitia, juri1, juri2, juri3, peserta1, peserta2, peserta3, orangLuar] = await ethers.getSigners();
    const jc = await ethers.deployContract("JuriChain");
    await jc.aturPanitia(panitia.address, true);
    return { jc, admin, panitia, juri: [juri1, juri2, juri3], peserta: [peserta1, peserta2, peserta3], orangLuar };
  }

  /** Lomba #1 sudah dibuat, 3 juri ditetapkan, 2 peserta terdaftar, pendaftaran dibuka. */
  async function lombaTerbukaFixture(kuorum = 2) {
    const f = await deployFixture();
    const { jc, panitia, juri, peserta } = f;
    const now = await time.latest();
    const tenggat = {
      daftar: now + 10 * MENIT,
      commit: now + 20 * MENIT,
      reveal: now + 30 * MENIT,
    };
    await jc
      .connect(panitia)
      .buatLomba("Lomba Desain", HASH_PANDUAN, KRITERIA, BOBOT, [tenggat.daftar, tenggat.commit, tenggat.reveal], kuorum);
    await jc.connect(panitia).tetapkanJuri(1, juri.map((j) => j.address));
    await jc.connect(panitia).daftarkanPeserta(1, peserta[0].address);
    await jc.connect(panitia).daftarkanPeserta(1, peserta[1].address);
    await jc.connect(panitia).bukaPendaftaran(1);
    return { ...f, tenggat };
  }
  const kuorum2 = () => lombaTerbukaFixture(2);
  const kuorum3 = () => lombaTerbukaFixture(3);

  /** Peserta 1 & 2 mengumpulkan karya, lalu tahap dimajukan ke PENILAIAN_COMMIT. */
  async function keTahapCommit(f: Awaited<ReturnType<typeof lombaTerbukaFixture>>) {
    const { jc, peserta, orangLuar, tenggat } = f;
    await jc.connect(peserta[0]).kumpulkanKarya(1, ethers.keccak256(ethers.toUtf8Bytes("karya-A")));
    await jc.connect(peserta[1]).kumpulkanKarya(1, ethers.keccak256(ethers.toUtf8Bytes("karya-B")));
    await time.increaseTo(tenggat.daftar + 1);
    await jc.connect(orangLuar).majukanTahap(1);
    expect((await jc.daftarLomba(1)).status).to.equal(S.PENILAIAN_COMMIT);
  }

  type Kunci = { idKarya: number; nilai: number[]; salt: Hex };

  /** Juri commit memakai helper TypeScript (viem) dan mengembalikan "berkas kunci reveal". */
  async function commit(jc: any, juri: any, idKarya: number, nilai: number[]): Promise<Kunci> {
    const salt = buatSalt();
    const hash = hitungHashNilai(1n, BigInt(idKarya), nilai, salt, juri.address as Address);
    await expect(jc.connect(juri).commitNilai(1, idKarya, hash))
      .to.emit(jc, "NilaiDikomit")
      .withArgs(1, idKarya, juri.address, hash);
    return { idKarya, nilai, salt };
  }

  async function reveal(jc: any, juri: any, k: Kunci) {
    return jc.connect(juri).revealNilai(1, k.idKarya, k.nilai, k.salt);
  }

  // ------------------------------------------------------------------
  describe("1. Alur sukses sampai DIUMUMKAN", () => {
    it("3 juri, 2 peserta, kuorum 2 — skor tertimbang benar", async () => {
      const f = await loadFixture(kuorum2);
      const { jc, juri, orangLuar, tenggat } = f;
      await keTahapCommit(f);

      // nilai[juri][karya]
      const nilai = [
        [[80, 70, 90], [60, 65, 70]],
        [[85, 75, 80], [70, 60, 55]],
        [[90, 80, 70], [50, 75, 60]],
      ];
      const kunci: Kunci[][] = [];
      for (let j = 0; j < 3; j++) {
        kunci[j] = [await commit(jc, juri[j], 1, nilai[j][0]), await commit(jc, juri[j], 2, nilai[j][1])];
      }

      await time.increaseTo(tenggat.commit + 1);
      await jc.connect(orangLuar).majukanTahap(1);
      expect((await jc.daftarLomba(1)).status).to.equal(S.PENILAIAN_REVEAL);

      for (let j = 0; j < 3; j++) {
        for (const k of kunci[j]) {
          await expect(reveal(jc, juri[j], k))
            .to.emit(jc, "NilaiDireveal")
            .withArgs(1, k.idKarya, juri[j].address, k.nilai, skorJuri(k.nilai));
        }
      }

      await time.increaseTo(tenggat.reveal + 1);
      await expect(jc.connect(orangLuar).majukanTahap(1)).to.emit(jc, "StatusBerubah").withArgs(1, S.DIUMUMKAN);
      expect((await jc.daftarLomba(1)).status).to.equal(S.DIUMUMKAN);

      for (const idKarya of [1, 2]) {
        const total = nilai.reduce((t, nj) => t + skorJuri(nj[idKarya - 1]), 0);
        const [totalTertimbang, jumlahReveal, rataRataX100] = await jc.lihatSkor(1, idKarya);
        expect(totalTertimbang).to.equal(total);
        expect(jumlahReveal).to.equal(3);
        expect(rataRataX100).to.equal(Math.floor(total / 3));
      }
      // Karya 1: (8000+8050+8100)/3 = 8050 -> 80,50
      expect((await jc.lihatSkor(1, 1))[2]).to.equal(8050n);
      // Karya 2: (6450+6250+6050)/3 = 6250 -> 62,50
      expect((await jc.lihatSkor(1, 2))[2]).to.equal(6250n);

      // Tidak ada juri yang tercatat gagal reveal
      for (const j of juri) expect(await jc.jmlGagalReveal(j.address)).to.equal(0);
    });

    it("majukanTahap ditolak sebelum tenggat lewat", async () => {
      const { jc, orangLuar } = await loadFixture(kuorum2);
      await expect(jc.connect(orangLuar).majukanTahap(1)).to.be.revertedWithCustomError(jc, "TenggatBelumLewat");
    });

    it("majukanTahap ditolak pada status final", async () => {
      const f = await loadFixture(kuorum2);
      await keTahapCommit(f);
      await time.increaseTo(f.tenggat.reveal + 1);
      await f.jc.majukanTahap(1); // -> REVEAL
      await f.jc.majukanTahap(1); // -> SENGKETA (tidak ada reveal)
      await expect(f.jc.majukanTahap(1))
        .to.be.revertedWithCustomError(f.jc, "StatusSalah")
        .withArgs(S.SENGKETA);
    });
  });

  // ------------------------------------------------------------------
  describe("2. Batas pendaftaran", () => {
    it("karya setelah batasDaftar ditolak (TenggatLewat)", async () => {
      const { jc, peserta, tenggat } = await loadFixture(kuorum2);
      await time.increaseTo(tenggat.daftar + 1);
      await expect(
        jc.connect(peserta[0]).kumpulkanKarya(1, ethers.keccak256(ethers.toUtf8Bytes("telat"))),
      ).to.be.revertedWithCustomError(jc, "TenggatLewat");
    });

    it("karya setelah tahap dimajukan ditolak (StatusSalah)", async () => {
      const { jc, peserta, tenggat } = await loadFixture(kuorum2);
      await time.increaseTo(tenggat.daftar + 1);
      await jc.majukanTahap(1);
      await expect(jc.connect(peserta[0]).kumpulkanKarya(1, ethers.keccak256(ethers.toUtf8Bytes("telat"))))
        .to.be.revertedWithCustomError(jc, "StatusSalah")
        .withArgs(S.PENILAIAN_COMMIT);
    });

    it("bukan peserta / kumpul dua kali / hash kosong ditolak", async () => {
      const { jc, peserta, orangLuar } = await loadFixture(kuorum2);
      const h = ethers.keccak256(ethers.toUtf8Bytes("karya"));
      await expect(jc.connect(orangLuar).kumpulkanKarya(1, h)).to.be.revertedWithCustomError(jc, "BukanPeserta");
      await expect(jc.connect(peserta[0]).kumpulkanKarya(1, ethers.ZeroHash)).to.be.revertedWithCustomError(jc, "HashKosong");
      await jc.connect(peserta[0]).kumpulkanKarya(1, h);
      await expect(jc.connect(peserta[0]).kumpulkanKarya(1, h)).to.be.revertedWithCustomError(jc, "SudahMengumpulkan");
    });
  });

  // ------------------------------------------------------------------
  describe("3. Verifikasi reveal", () => {
    it("nilai berbeda atau salt berbeda -> HashTidakCocok", async () => {
      const f = await loadFixture(kuorum2);
      const { jc, juri, tenggat } = f;
      await keTahapCommit(f);
      const k = await commit(jc, juri[0], 1, [80, 70, 90]);
      await time.increaseTo(tenggat.commit + 1);
      await jc.majukanTahap(1);

      await expect(reveal(jc, juri[0], { ...k, nilai: [81, 70, 90] })).to.be.revertedWithCustomError(jc, "HashTidakCocok");
      await expect(reveal(jc, juri[0], { ...k, salt: buatSalt() })).to.be.revertedWithCustomError(jc, "HashTidakCocok");
      // Juri lain tidak bisa me-reveal memakai kunci milik juri1 (alamat juri ikut di-hash)
      await expect(reveal(jc, juri[1], k)).to.be.revertedWithCustomError(jc, "BelumKomit");

      // Kunci asli tetap berhasil, lalu tidak bisa diulang
      await reveal(jc, juri[0], k);
      await expect(reveal(jc, juri[0], k)).to.be.revertedWithCustomError(jc, "SudahReveal");
    });

    it("commit ganda, karya tidak ada, bukan juri, jumlah nilai salah, nilai > 100", async () => {
      const f = await loadFixture(kuorum2);
      const { jc, juri, orangLuar, tenggat } = f;
      await keTahapCommit(f);
      const h = ethers.keccak256(ethers.toUtf8Bytes("x"));
      await expect(jc.connect(orangLuar).commitNilai(1, 1, h)).to.be.revertedWithCustomError(jc, "BukanJuri");
      await expect(jc.connect(juri[0]).commitNilai(1, 3, h)).to.be.revertedWithCustomError(jc, "KaryaTidakAda");
      await expect(jc.connect(juri[0]).commitNilai(1, 1, ethers.ZeroHash)).to.be.revertedWithCustomError(jc, "HashKosong");

      const kSalahJumlah = await commit(jc, juri[0], 1, [80, 70]);
      const kLewat100 = await commit(jc, juri[0], 2, [101, 70, 90]);
      await expect(jc.connect(juri[0]).commitNilai(1, 1, h)).to.be.revertedWithCustomError(jc, "SudahKomit");

      const h2 = ethers.keccak256(ethers.toUtf8Bytes("y"));
      await time.increaseTo(tenggat.commit + 1);
      // tenggat lewat walau tahap belum dimajukan
      await expect(jc.connect(juri[1]).commitNilai(1, 1, h2)).to.be.revertedWithCustomError(jc, "TenggatLewat");
      await jc.majukanTahap(1);
      await expect(jc.connect(juri[1]).commitNilai(1, 1, h2))
        .to.be.revertedWithCustomError(jc, "StatusSalah")
        .withArgs(S.PENILAIAN_REVEAL);
      await expect(reveal(jc, juri[0], kSalahJumlah)).to.be.revertedWithCustomError(jc, "JumlahNilaiSalah");
      await expect(reveal(jc, juri[0], kLewat100)).to.be.revertedWithCustomError(jc, "NilaiDiLuarRentang");
    });

    it("reveal setelah batasReveal ditolak", async () => {
      const f = await loadFixture(kuorum2);
      const { jc, juri, tenggat } = f;
      await keTahapCommit(f);
      const k = await commit(jc, juri[0], 1, [80, 70, 90]);
      await time.increaseTo(tenggat.commit + 1);
      await jc.majukanTahap(1);
      await time.increaseTo(tenggat.reveal + 1);
      await expect(reveal(jc, juri[0], k)).to.be.revertedWithCustomError(jc, "TenggatLewat");
    });
  });

  // ------------------------------------------------------------------
  describe("4. Juri gagal reveal & kuorum", () => {
    it("juri yang commit tapi tidak reveal -> jmlGagalReveal bertambah; kuorum 3 tak terpenuhi -> SENGKETA", async () => {
      const f = await loadFixture(kuorum3);
      const { jc, juri, tenggat } = f;
      await keTahapCommit(f);

      const kunci = [];
      for (const j of juri) kunci.push([await commit(jc, j, 1, [80, 80, 80]), await commit(jc, j, 2, [70, 70, 70])]);

      await time.increaseTo(tenggat.commit + 1);
      await jc.majukanTahap(1);
      // juri3 tidak melakukan reveal sama sekali
      for (let j = 0; j < 2; j++) for (const k of kunci[j]) await reveal(jc, juri[j], k);

      await time.increaseTo(tenggat.reveal + 1);
      const tx = jc.majukanTahap(1);
      await expect(tx).to.emit(jc, "GagalReveal").withArgs(1, 1, juri[2].address);
      await expect(tx).to.emit(jc, "GagalReveal").withArgs(1, 2, juri[2].address);
      await expect(tx).to.emit(jc, "StatusBerubah").withArgs(1, S.SENGKETA);

      expect((await jc.daftarLomba(1)).status).to.equal(S.SENGKETA);
      expect(await jc.jmlGagalReveal(juri[2].address)).to.equal(2);
      expect(await jc.jmlGagalReveal(juri[0].address)).to.equal(0);
      expect(await jc.jmlGagalReveal(juri[1].address)).to.equal(0);
      // skor hanya dari 2 juri yang reveal
      expect((await jc.lihatSkor(1, 1))[1]).to.equal(2);
    });

    it("kuorum 2: satu juri gagal reveal tetap DIUMUMKAN tapi tetap tercatat gagal", async () => {
      const f = await loadFixture(kuorum2);
      const { jc, juri, tenggat } = f;
      await keTahapCommit(f);
      const kunci = [];
      for (const j of juri) kunci.push([await commit(jc, j, 1, [80, 80, 80]), await commit(jc, j, 2, [70, 70, 70])]);
      await time.increaseTo(tenggat.commit + 1);
      await jc.majukanTahap(1);
      for (let j = 0; j < 2; j++) for (const k of kunci[j]) await reveal(jc, juri[j], k);
      await time.increaseTo(tenggat.reveal + 1);
      await jc.majukanTahap(1);
      expect((await jc.daftarLomba(1)).status).to.equal(S.DIUMUMKAN);
      expect(await jc.jmlGagalReveal(juri[2].address)).to.equal(2);
    });

    it("kuorum 2: hanya satu juri reveal pada satu karya -> SENGKETA", async () => {
      const f = await loadFixture(kuorum2);
      const { jc, juri, tenggat } = f;
      await keTahapCommit(f);
      const k1 = await commit(jc, juri[0], 1, [80, 80, 80]);
      const k2 = await commit(jc, juri[1], 1, [80, 80, 80]);
      const k3 = await commit(jc, juri[0], 2, [70, 70, 70]);
      await commit(jc, juri[1], 2, [70, 70, 70]); // tidak di-reveal
      await time.increaseTo(tenggat.commit + 1);
      await jc.majukanTahap(1);
      await reveal(jc, juri[0], k1);
      await reveal(jc, juri[1], k2);
      await reveal(jc, juri[0], k3);
      await time.increaseTo(tenggat.reveal + 1);
      await jc.majukanTahap(1);
      expect((await jc.daftarLomba(1)).status).to.equal(S.SENGKETA);
      expect(await jc.jmlGagalReveal(juri[1].address)).to.equal(1);
    });

    it("lomba tanpa karya -> SENGKETA", async () => {
      const { jc, tenggat } = await loadFixture(kuorum2);
      await time.increaseTo(tenggat.reveal + 1);
      await jc.majukanTahap(1);
      await jc.majukanTahap(1);
      await jc.majukanTahap(1);
      expect((await jc.daftarLomba(1)).status).to.equal(S.SENGKETA);
    });
  });

  // ------------------------------------------------------------------
  describe("5. Panitia terkunci setelah bukaPendaftaran", () => {
    it("tetapkanJuri dan bukaPendaftaran ulang ditolak (StatusSalah)", async () => {
      const { jc, panitia, orangLuar } = await loadFixture(kuorum2);
      await expect(jc.connect(panitia).tetapkanJuri(1, [orangLuar.address, orangLuar.address, orangLuar.address]))
        .to.be.revertedWithCustomError(jc, "StatusSalah")
        .withArgs(S.PENDAFTARAN);
      await expect(jc.connect(panitia).bukaPendaftaran(1))
        .to.be.revertedWithCustomError(jc, "StatusSalah")
        .withArgs(S.PENDAFTARAN);
    });

    it("tidak ada fungsi hapus / override / ubah kriteria-bobot-tenggat-kuorum di ABI", async () => {
      const { jc } = await loadFixture(kuorum2);
      const namaFungsi = jc.interface.fragments.filter((x) => x.type === "function").map((x: any) => x.name as string);
      const tulis = jc.interface.fragments
        .filter((x: any) => x.type === "function" && !["view", "pure"].includes(x.stateMutability))
        .map((x: any) => x.name)
        .sort();
      expect(tulis).to.deep.equal(
        [
          "aturPanitia",
          "buatLomba",
          "bukaPendaftaran",
          "commitNilai",
          "daftarkanPeserta",
          "kumpulkanKarya",
          "majukanTahap",
          "revealNilai",
          "tetapkanJuri",
        ].sort(),
      );
      for (const n of namaFungsi) expect(n.toLowerCase()).to.not.match(/hapus|delete|override|ubah|set|upgrade/);
    });

    it("pendaftaran peserta ditolak setelah batasDaftar dan setelah tahap maju", async () => {
      const { jc, panitia, peserta, tenggat } = await loadFixture(kuorum2);
      await time.increaseTo(tenggat.daftar + 1);
      await expect(jc.connect(panitia).daftarkanPeserta(1, peserta[2].address)).to.be.revertedWithCustomError(jc, "TenggatLewat");
      await jc.majukanTahap(1);
      await expect(jc.connect(panitia).daftarkanPeserta(1, peserta[2].address))
        .to.be.revertedWithCustomError(jc, "StatusSalah")
        .withArgs(S.PENILAIAN_COMMIT);
    });

    it("data lomba (kriteria, bobot, juri, tenggat) tetap sama sampai akhir", async () => {
      const f = await loadFixture(kuorum2);
      const { jc, juri, tenggat } = f;
      await keTahapCommit(f);
      const [nama, bobot] = await jc.getKriteria(1);
      expect(nama).to.deep.equal(KRITERIA);
      expect(bobot.map(Number)).to.deep.equal(BOBOT);
      expect(await jc.getJuri(1)).to.deep.equal(juri.map((j) => j.address));
      const l = await jc.daftarLomba(1);
      expect([l.batasDaftar, l.batasCommit, l.batasReveal]).to.deep.equal(
        [tenggat.daftar, tenggat.commit, tenggat.reveal].map(BigInt),
      );
      expect(l.kuorum).to.equal(2);
    });
  });

  // ------------------------------------------------------------------
  describe("RBAC & validasi tahap DIBUAT", () => {
    it("hanya admin yang bisa aturPanitia; hanya panitia yang bisa buatLomba", async () => {
      const { jc, orangLuar } = await loadFixture(deployFixture);
      const now = await time.latest();
      await expect(jc.connect(orangLuar).aturPanitia(orangLuar.address, true)).to.be.revertedWithCustomError(jc, "BukanAdmin");
      await expect(
        jc.connect(orangLuar).buatLomba("x", HASH_PANDUAN, KRITERIA, BOBOT, [now + 100, now + 200, now + 300], 2),
      ).to.be.revertedWithCustomError(jc, "BukanPanitia");
    });

    it("validasi buatLomba: hash panduan, urutan tenggat, bobot = 100, kuorum > 0", async () => {
      const { jc, panitia } = await loadFixture(deployFixture);
      const now = await time.latest();
      const t: [number, number, number] = [now + 100, now + 200, now + 300];
      const p = jc.connect(panitia);
      await expect(p.buatLomba("x", ethers.ZeroHash, KRITERIA, BOBOT, t, 2)).to.be.revertedWithCustomError(jc, "HashKosong");
      await expect(p.buatLomba("x", HASH_PANDUAN, KRITERIA, BOBOT, [now + 200, now + 100, now + 300], 2)).to.be.revertedWithCustomError(jc, "TenggatTidakValid");
      await expect(p.buatLomba("x", HASH_PANDUAN, KRITERIA, BOBOT, [now - 1, now + 200, now + 300], 2)).to.be.revertedWithCustomError(jc, "TenggatTidakValid");
      await expect(p.buatLomba("x", HASH_PANDUAN, KRITERIA, [40, 30, 20], t, 2)).to.be.revertedWithCustomError(jc, "BobotTidakValid");
      await expect(p.buatLomba("x", HASH_PANDUAN, KRITERIA, [50, 50], t, 2)).to.be.revertedWithCustomError(jc, "BobotTidakValid");
      await expect(p.buatLomba("x", HASH_PANDUAN, KRITERIA, BOBOT, t, 0)).to.be.revertedWithCustomError(jc, "KuorumTidakValid");
    });

    it("tetapkanJuri: hanya panitia lomba itu, minimal 3, tanpa konflik peran, tidak bisa diulang", async () => {
      const { jc, admin, panitia, juri, peserta } = await loadFixture(deployFixture);
      const now = await time.latest();
      await jc.connect(panitia).buatLomba("x", HASH_PANDUAN, KRITERIA, BOBOT, [now + 100, now + 200, now + 300], 3);
      const alamat = juri.map((j) => j.address);
      await expect(jc.connect(admin).tetapkanJuri(1, alamat)).to.be.revertedWithCustomError(jc, "BukanPanitiaLomba");
      await expect(jc.connect(panitia).tetapkanJuri(1, alamat.slice(0, 2))).to.be.revertedWithCustomError(jc, "JuriKurang");
      await expect(jc.connect(panitia).tetapkanJuri(1, [alamat[0], alamat[1], panitia.address]))
        .to.be.revertedWithCustomError(jc, "KonflikPeran")
        .withArgs(panitia.address);
      await expect(jc.connect(panitia).tetapkanJuri(1, [alamat[0], alamat[1], alamat[1]]))
        .to.be.revertedWithCustomError(jc, "KonflikPeran")
        .withArgs(alamat[1]);
      await jc.connect(panitia).daftarkanPeserta(1, peserta[0].address);
      await expect(jc.connect(panitia).tetapkanJuri(1, [alamat[0], alamat[1], peserta[0].address]))
        .to.be.revertedWithCustomError(jc, "KonflikPeran")
        .withArgs(peserta[0].address);
      await jc.connect(panitia).tetapkanJuri(1, alamat);
      await expect(jc.connect(panitia).tetapkanJuri(1, alamat)).to.be.revertedWithCustomError(jc, "SudahDiset");
      await expect(jc.connect(panitia).daftarkanPeserta(1, alamat[0]))
        .to.be.revertedWithCustomError(jc, "KonflikPeran")
        .withArgs(alamat[0]);
    });

    it("bukaPendaftaran butuh 3 juri dan sebelum batasDaftar", async () => {
      const { jc, panitia, juri } = await loadFixture(deployFixture);
      const now = await time.latest();
      await jc.connect(panitia).buatLomba("x", HASH_PANDUAN, KRITERIA, BOBOT, [now + 100, now + 200, now + 300], 2);
      await expect(jc.connect(panitia).bukaPendaftaran(1)).to.be.revertedWithCustomError(jc, "JuriKurang");
      await jc.connect(panitia).tetapkanJuri(1, juri.map((j) => j.address));
      await time.increaseTo(now + 101);
      await expect(jc.connect(panitia).bukaPendaftaran(1)).to.be.revertedWithCustomError(jc, "TenggatLewat");
    });

    it("lomba yang tidak ada ditolak", async () => {
      const { jc } = await loadFixture(deployFixture);
      await expect(jc.majukanTahap(1)).to.be.revertedWithCustomError(jc, "LombaTidakAda");
      await expect(jc.majukanTahap(0)).to.be.revertedWithCustomError(jc, "LombaTidakAda");
    });
  });

  // ------------------------------------------------------------------
  describe("6. Kesesuaian hash helper TypeScript (viem) dengan kontrak", () => {
    it("hitungHashNilai viem == hitungHashNilai on-chain (20 kasus acak)", async () => {
      const { jc, juri, peserta } = await loadFixture(deployFixture);
      const akun = [...juri, ...peserta].map((a) => a.address as Address);
      for (let i = 0; i < 20; i++) {
        const idLomba = BigInt(1 + Math.floor(Math.random() * 1000));
        const idKarya = BigInt(1 + Math.floor(Math.random() * 1000));
        const nilai = Array.from({ length: 1 + (i % 6) }, () => Math.floor(Math.random() * 101));
        const salt = buatSalt();
        const alamat = akun[i % akun.length];
        const dariTs = hitungHashNilai(idLomba, idKarya, nilai, salt, alamat);
        const dariKontrak = await jc.hitungHashNilai(idLomba, idKarya, nilai, salt, alamat);
        expect(dariKontrak).to.equal(dariTs);
      }
    });

    it("kasus tepi: nilai 0 & 100, salt nol, id besar", async () => {
      const { jc, juri } = await loadFixture(deployFixture);
      const salt = ("0x" + "00".repeat(32)) as Hex;
      const besar = 2n ** 255n;
      const ts = hitungHashNilai(besar, besar, [0, 100, 0, 100], salt, juri[0].address as Address);
      expect(await jc.hitungHashNilai(besar, besar, [0, 100, 0, 100], salt, juri[0].address)).to.equal(ts);
    });
  });
});
