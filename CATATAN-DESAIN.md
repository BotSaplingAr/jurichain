# Catatan Desain — hal yang perlu diingat

Daftar keputusan/perilaku kontrak yang perlu dicek ulang terhadap laporan UTS
atau perlu dijelaskan saat presentasi UAS.

## 1. Panitia masih bisa mendaftarkan peserta selama tahap PENDAFTARAN

- **Perilaku saat ini (sesuai draf):** `daftarkanPeserta` boleh dipanggil panitia lomba pada status
  `DIBUAT` **dan** `PENDAFTARAN`, selama belum melewati `batasDaftar`.
- **Yang sudah terkunci setelah `bukaPendaftaran`:** daftar juri, kriteria, bobot, tenggat, kuorum
  (tidak ada fungsi untuk mengubahnya sama sekali).
- **Mengapa perlu diingat:** kalimat "panitia tidak bisa mengubah apa pun setelah bukaPendaftaran"
  tidak 100% berlaku — menambah peserta masih bisa. Penambahan peserta tetap tercatat transparan
  lewat event `PesertaDidaftarkan`, dan peserta yang sudah terdaftar tidak bisa dihapus.
- **Jika ingin dikunci:** ubah syarat di `daftarkanPeserta` menjadi hanya status `DIBUAT`
  (lalu sesuaikan test "pendaftaran peserta ditolak setelah batasDaftar...").
- Status: **dibiarkan seperti draf** (keputusan user, Tahap 1).
