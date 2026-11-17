# JuriChain — Prototype DApp (UTS CTJ483 Kelompok 3)

Sistem penjurian lomba berbasis commit-reveal di Base Sepolia (Ethereum L2).
Rancangan lengkap: laporan UTS Kelompok 3 (Bagian 4 Arsitektur, Bagian 5 Smart Contract, Bagian 7.3 MVP).
Bahasa komunikasi dengan user: Bahasa Indonesia.

## Kondisi awal
- Folder ini sudah berisi:
  - `contracts/JuriChain.sol` — draf kontrak (BELUM pernah di-compile, mungkin ada error kecil).
  - `frontend/lib/commitReveal.ts` — helper hash commit-reveal (viem). Encoding hash HARUS tetap
    `keccak256(abi.encode(uint256 idLomba, uint256 idKarya, uint8[] nilai, bytes32 salt, address juri))`.
- Komputer user kemungkinan BELUM punya Node.js, npm, atau Git. Cek dulu sebelum mulai.

## Tugas (kerjakan berurutan, laporkan tiap tahap selesai)

### 0. Cek & siapkan tools
- Cek `node -v` (butuh Node 20 LTS atau lebih baru), `npm -v`, `git --version`.
- Kalau belum ada, pasang dengan package manager OS (Windows: `winget install OpenJS.NodeJS.LTS` dan
  `winget install Git.Git`; macOS: `brew install node git`; Linux: nvm atau apt). Minta izin user dulu,
  dan beri tahu kalau terminal perlu dibuka ulang setelah instalasi.
- `git init` dan buat `.gitignore` (node_modules, .env, .env.local, artifacts, cache, .next, typechain-types).

### 1. Proyek kontrak (Hardhat, folder `contracts-hh/` atau root)
- Setup Hardhat + TypeScript + `@nomicfoundation/hardhat-toolbox`, Solidity 0.8.24, optimizer on.
- Pindahkan/pakai `contracts/JuriChain.sol`. Compile, perbaiki error TANPA mengubah perilaku yang
  tertulis di laporan (state machine 6 status, commit-reveal, kuorum, RBAC Panitia/Juri/Peserta,
  majukanTahap bisa dipanggil siapa saja, tanpa fungsi hapus/override, non-upgradeable, tokenless).
- Tulis test lengkap (pakai `time.increase` untuk tenggat):
  1. Alur sukses sampai DIUMUMKAN (3 juri, 2 peserta, kuorum 2), cek skor tertimbang benar.
  2. Karya setelah batasDaftar ditolak.
  3. Reveal dengan nilai/salt beda → HashTidakCocok.
  4. Juri tidak reveal → jmlGagalReveal bertambah; kuorum tidak terpenuhi → SENGKETA.
  5. Panitia tidak bisa tetapkanJuri/ubah apa pun setelah bukaPendaftaran.
  6. Hash dari helper TypeScript (viem) sama dengan `hitungHashNilai` di kontrak.
- Script deploy ke Base Sepolia (chainId 84532). Private key & RPC dibaca dari `.env`
  (`PRIVATE_KEY`, `BASE_SEPOLIA_RPC_URL`). Buat `.env.example` saja; JANGAN pernah menulis,
  mencetak, atau meng-commit private key. Ingatkan user memakai dompet KHUSUS testnet.
- Opsional: verifikasi kontrak di Basescan (butuh API key, tanyakan user).

### 2. Frontend (Next.js App Router + TypeScript + wagmi + viem + @tanstack/react-query)
- Folder `web/`. Chain: `baseSepolia`. Alamat kontrak dari `NEXT_PUBLIC_JURICHAIN_ADDRESS`.
  ABI diambil dari hasil compile Hardhat.
- Pakai `frontend/lib/commitReveal.ts` (pindahkan ke `web/lib/`).
- Halaman:
  - `/` — hubungkan MetaMask, tampilkan peran akun untuk lomba terpilih, daftar lomba + status.
  - `/panitia` — buat lomba (upload panduan → hash, kriteria + bobot total 100, tenggat dalam menit
    dari sekarang untuk demo, kuorum), tetapkan juri, daftarkan peserta, buka pendaftaran.
  - `/peserta` — upload karya → salted hash di browser → kumpulkanKarya; unduh bukti (salt + hash).
  - `/juri` — daftar karya berkode anonim; input nilai per kriteria → commit + unduh berkas kunci
    reveal (JSON); tahap reveal: upload berkas kunci → revealNilai.
  - `/hasil/[id]` — peringkat dari `lihatSkor`, status lomba, link ke Basescan, dan alat cocokkan
    berkas karya dengan hash on-chain.
  - Tombol "Majukan Tahap" yang bisa diklik siapa saja + hitung mundur tenggat.
- Tampilkan pesan error kontrak (custom error) dalam Bahasa Indonesia yang ramah.
- UI sederhana dan rapi (Tailwind boleh). Jangan berlebihan.

### 3. Demo lokal dulu, baru testnet
- Sediakan cara menjalankan di node lokal (`npx hardhat node` + deploy lokal) agar bisa dites tanpa ETH.
- Setelah itu deploy ke Base Sepolia.
- Tulis `README.md` (Bahasa Indonesia): cara install, jalankan lokal, deploy, dan skenario demo UAS
  (6 akun: 1 panitia, 3 juri, 2 peserta; tenggat beberapa menit; tunjukkan karya terlambat ditolak
  dan juri gagal reveal).

## Aturan
- Jalankan test setelah setiap perubahan kontrak.
- Jangan menambah token, paymaster, multisig, atau IPFS (masuk kategori "dapat dilepas").
- Kalau perlu keputusan desain yang menyimpang dari laporan, tanya user dulu.
