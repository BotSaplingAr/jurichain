# JuriChain — Prototipe DApp Penjurian Lomba

Sistem penjurian lomba transparan berbasis **commit-reveal** di **Base Sepolia** (Ethereum L2).
Prototipe UTS CTJ483 Kelompok 3.

- Nilai juri dikunci dulu sebagai hash (**commit**), baru dibuka setelah tenggat (**reveal**), sehingga
  juri tidak bisa saling mencontek atau mengubah nilai.
- State machine 6 status: `DIBUAT → PENDAFTARAN → PENILAIAN_COMMIT → PENILAIAN_REVEAL → DIUMUMKAN / SENGKETA`.
- Peran: **Panitia**, **Juri**, **Peserta** (RBAC). `majukanTahap` boleh dipanggil **siapa saja** setelah tenggat.
- Tanpa fungsi hapus/override, non-upgradeable, tanpa token.

```
.
├── contracts/JuriChain.sol      Smart contract
├── test/JuriChain.test.ts       24 test (Hardhat + chai)
├── scripts/deploy.ts            Deploy (lokal / Base Sepolia), tulis ABI + web/.env.local
├── scripts/simulasi-lokal.ts    Simulasi alur lengkap di node lokal tanpa UI
├── hardhat.config.ts
├── CATATAN-DESAIN.md            Hal-hal desain yang perlu diingat saat presentasi
└── web/                         Frontend Next.js + wagmi + viem
    ├── app/                     Halaman: /, /panitia, /peserta, /juri, /hasil/[id]
    ├── components/
    └── lib/commitReveal.ts      Helper hash (sama persis dengan kontrak)
```

---

## 1. Prasyarat

| Kebutuhan | Cek | Pasang (Windows) |
|---|---|---|
| Node.js 20 LTS atau lebih baru | `node -v` | `winget install OpenJS.NodeJS.LTS` |
| Git | `git --version` | `winget install Git.Git` |
| MetaMask (ekstensi browser) | – | https://metamask.io |

> Setelah memasang Node/Git, **tutup lalu buka lagi** terminal/VS Code.

## 2. Instalasi

```bash
npm install              # dependensi Hardhat (root)
npm install --prefix web # dependensi frontend
npm test                 # compile + jalankan 24 test kontrak
```

---

## 3. Menjalankan secara lokal (tanpa ETH sungguhan)

Butuh **dua terminal** di folder proyek.

**Terminal 1 — blockchain lokal**
```bash
npm run node
```
Perintah ini mencetak 20 akun uji beserta private key-nya. Biarkan terminal tetap terbuka.
Node lokal menambang blok tiap 2 detik agar jam blockchain sama dengan jam browser.

**Terminal 2 — deploy + frontend**
```bash
npm run deploy:local     # deploy kontrak + mengisi web/.env.local otomatis
npm run dev              # buka http://localhost:3000
```

Opsional: `npm run simulasi` menjalankan alur lengkap otomatis (~1,5 menit) sebagai uji cepat.

### Menyiapkan MetaMask untuk jaringan lokal

1. MetaMask → *Add network* → *Add a network manually*:
   - Network name: `Hardhat Lokal`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency symbol: `ETH`

   (Atau klik **Ganti jaringan** di banner kuning aplikasi; MetaMask akan menawarkan menambahkannya.)
2. Impor 6 akun (*Add account → Import account*) memakai private key **Account #0–#5** yang dicetak
   `npm run node`:

| Akun Hardhat | Peran demo | Alamat |
|---|---|---|
| #0 | Panitia (sekaligus admin/deployer) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| #1 | Juri 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| #2 | Juri 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| #3 | Juri 3 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |
| #4 | Peserta A | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` |
| #5 | Peserta B | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` |

> ⚠️ Private key akun Hardhat diketahui publik. **Jangan pernah** mengirim aset sungguhan ke akun ini.

> 🔁 **Setiap kali `npm run node` di-restart**, semua data hilang. Jalankan lagi `npm run deploy:local`,
> restart `npm run dev`, lalu di MetaMask buka *Settings → Advanced → Clear activity tab data* untuk tiap akun
> (supaya nonce tidak error).

---

## 4. Deploy ke Base Sepolia (testnet)

1. **Buat dompet KHUSUS testnet** di MetaMask (akun baru, jangan dompet utama).
2. Isi ETH Base Sepolia dari faucet, misalnya https://www.alchemy.com/faucets/base-sepolia atau
   faucet Coinbase Developer Platform. Ke-6 akun demo juga butuh sedikit ETH untuk gas.
3. Salin `.env.example` menjadi `.env`, lalu isi:
   ```ini
   PRIVATE_KEY=0x...            # private key dompet KHUSUS testnet
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   BASESCAN_API_KEY=...         # opsional, untuk verifikasi
   ```
   `.env` sudah masuk `.gitignore`. **Jangan pernah meng-commit atau membagikan file ini.**
4. Deploy:
   ```bash
   npm run deploy:base-sepolia
   ```
   Skrip mengecek chainId 84532, mencetak alamat + link Basescan, dan mengisi `web/.env.local`
   (`NEXT_PUBLIC_CHAIN=baseSepolia`).
5. (Opsional) Verifikasi source code di Basescan. Buat API key gratis di https://etherscan.io/myapikey
   (Etherscan API V2 berlaku untuk Base Sepolia):
   ```bash
   npm run verify:base-sepolia -- <ALAMAT_KONTRAK>
   ```
6. `npm run dev` lalu buka http://localhost:3000 dengan MetaMask di jaringan Base Sepolia.

Untuk kembali ke mode lokal, jalankan `npm run deploy:local` lagi (otomatis mengganti `web/.env.local`).

---

## 5. Skenario demo UAS (6 akun)

Tujuan demo: menunjukkan alur lengkap, **karya terlambat ditolak**, dan **juri gagal reveal**.
Tenggat yang disarankan: **4 / 8 / 12 menit** dari sekarang (bisa diperpendek jika sudah lancar).

| Waktu | Akun | Langkah | Yang ditunjukkan |
|---|---|---|---|
| 0:00 | Panitia (#0) | `/panitia` → **Buat lomba**: unggah `panduan.pdf`, kriteria Kreativitas 40 / Teknis 30 / Presentasi 30, tenggat 4 / 8 / 12, kuorum **2** | Hanya hash panduan yang disimpan; total bobot wajib 100 |
| 0:30 | Panitia | **Tetapkan juri** #1, #2, #3 → **Daftarkan peserta** #4 dan #5 → **Buka pendaftaran** | Setelah dibuka, juri/kriteria/tenggat terkunci (tidak ada tombol ubah) |
| 1:00 | Peserta A (#4) | `/peserta` → pilih berkas karya → **Kumpulkan Karya** → bukti JSON terunduh | Berkas tidak diunggah; hanya salted hash yang dicatat on-chain |
| 4:00+ | Peserta B (#5) | Coba kumpulkan karya **setelah batas pendaftaran** (sebelum ada yang klik Majukan Tahap) | ❌ *"Tenggat untuk tahap ini sudah lewat."* — **karya terlambat ditolak** |
| 4:00+ | Siapa saja | Klik **Majukan Tahap** | Tidak perlu panitia; siapa pun bisa memajukan setelah tenggat |
| 4–8 | Juri 1, 2, 3 | `/juri` → isi nilai untuk K-001 → **Commit nilai + unduh kunci** | Nilai on-chain hanya berupa hash; kunci reveal disimpan juri |
| 8:00+ | Siapa saja | **Majukan Tahap** → reveal | |
| 8–12 | Juri 1 & 2 | `/juri` → unggah `kunci-reveal_*.json` → **Reveal** | Hash dicocokkan kontrak; coba ubah satu angka di JSON → ❌ ditolak di browser / `HashTidakCocok` |
| 8–12 | Juri 3 | **Sengaja tidak reveal** | |
| 12:00+ | Siapa saja | **Majukan Tahap** | Status **DIUMUMKAN** (2 juri reveal ≥ kuorum 2); juri 3 tercatat **gagal reveal = 1** |
| akhir | Siapa saja | `/hasil/1` → peringkat, link Basescan, **Cocokkan berkas** (unggah karya + bukti JSON) | Siapa pun bisa memverifikasi karya pemenang dengan hash on-chain |

**Variasi SENGKETA:** buat lomba kedua dengan **kuorum 3**, lalu ulangi dengan juri 3 tidak reveal.
Hasil akhirnya **SENGKETA** karena kuorum tidak terpenuhi.

**Tips demo**
- Ganti akun di MetaMask; halaman otomatis memperbarui peran (lihat kartu *Peran akun Anda* di beranda).
- Lomba terpilih tersimpan dan sama di semua halaman.
- Agar peringkat lebih menarik, tambahkan akun ke-7 (#6) sebagai peserta yang mengumpulkan tepat waktu.
- Siapkan berkas karya dan panduan kecil (PDF/PNG) sebelum demo.

---

## 6. Perintah singkat

| Perintah | Fungsi |
|---|---|
| `npm test` | Jalankan semua test kontrak |
| `npm run node` | Blockchain lokal (port 8545) |
| `npm run deploy:local` | Deploy ke node lokal + isi `web/.env.local` |
| `npm run simulasi` | Simulasi alur lengkap di node lokal |
| `npm run deploy:base-sepolia` | Deploy ke Base Sepolia |
| `npm run verify:base-sepolia -- <alamat>` | Verifikasi di Basescan |
| `npm run export-abi` | Tulis ulang ABI ke `web/lib/jurichainAbi.ts` setelah kontrak diubah |
| `npm run dev` | Frontend di http://localhost:3000 |

## 7. Masalah umum

| Gejala | Solusi |
|---|---|
| Banner merah "Alamat kontrak belum diatur" | Jalankan `npm run deploy:local` / `deploy:base-sepolia`, lalu restart `npm run dev` |
| Banner kuning "jaringan lain" | Klik **Ganti jaringan** |
| MetaMask error *nonce too high* / tx macet (lokal) | *Settings → Advanced → Clear activity tab data* |
| Tombol Majukan Tahap tidak aktif | Tenggat belum lewat; tunggu hitung mundur selesai |
| "Isi kunci tidak cocok dengan commit on-chain" | Berkas kunci lama dari commit yang gagal, berkas sudah diubah, atau milik akun lain |
| `node`/`npm` tidak dikenali | Tutup **semua** jendela VS Code lalu buka lagi (atau restart Windows) setelah instalasi Node.js |
| `TenggatTidakValid` di node lokal | Jam rantai lokal bisa beberapa detik lebih maju dari jam komputer (tiap blok minimal +1 detik). Simulasi & form panitia sudah memperhitungkannya; jika masih terjadi, restart `npm run node` lalu `npm run deploy:local` |

## 8. Keamanan

- Private key hanya dibaca dari `.env` (tidak pernah di-commit). Pakai **dompet khusus testnet**.
- Salt nilai juri dibuat di browser (`crypto.getRandomValues`), jadi hash commit tidak bisa ditebak.
- Encoding hash commit: `keccak256(abi.encode(uint256 idLomba, uint256 idKarya, uint8[] nilai, bytes32 salt, address juri))`.
  Kesamaan hash antara frontend dan kontrak dibuktikan di test #6.
- Lihat [CATATAN-DESAIN.md](CATATAN-DESAIN.md) untuk keputusan desain yang perlu dijelaskan saat presentasi.
