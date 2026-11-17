import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, InsufficientFundsError } from "viem";
import { LABEL_STATUS, namaStatus } from "./status";

/** Terjemahan custom error kontrak JuriChain ke Bahasa Indonesia. */
const PESAN: Record<string, (args: readonly unknown[]) => string> = {
  BukanAdmin: () => "Hanya admin kontrak yang boleh melakukan ini.",
  BukanPanitia: () => "Akun Anda belum diberi peran Panitia oleh admin.",
  BukanPanitiaLomba: () => "Hanya panitia yang membuat lomba ini yang boleh melakukan ini.",
  BukanJuri: () => "Akun Anda bukan juri di lomba ini.",
  BukanPeserta: () => "Akun Anda belum didaftarkan panitia sebagai peserta lomba ini.",
  LombaTidakAda: () => "Lomba tidak ditemukan.",
  StatusSalah: ([s]) => `Aksi ini tidak bisa dilakukan saat lomba berada di tahap "${LABEL_STATUS[namaStatus(Number(s))]}".`,
  TenggatTidakValid: () => "Tenggat harus di masa depan dan berurutan: pendaftaran < commit < reveal.",
  BobotTidakValid: () => "Setiap kriteria harus punya bobot dan total bobot harus tepat 100.",
  KuorumTidakValid: () => "Kuorum minimal 1 dan tidak boleh melebihi jumlah juri.",
  JuriKurang: () => "Minimal 3 juri harus ditetapkan terlebih dahulu.",
  KonflikPeran: ([a]) =>
    `Alamat ${String(a)} tidak bisa dipakai: alamat kosong/ganda, atau bentrok peran (panitia, juri, dan peserta harus berbeda).`,
  SudahDiset: () => "Juri untuk lomba ini sudah ditetapkan dan tidak bisa diubah.",
  TenggatLewat: () => "Tenggat untuk tahap ini sudah lewat.",
  TenggatBelumLewat: () => "Tenggat tahap ini belum lewat, jadi tahap belum bisa dimajukan.",
  KaryaTidakAda: () => "Karya tidak ditemukan.",
  SudahMengumpulkan: () => "Anda sudah mengumpulkan karya untuk lomba ini (hanya boleh sekali).",
  SudahKomit: () => "Anda sudah mengirim komitmen nilai untuk karya ini.",
  BelumKomit: () => "Tidak ada komitmen nilai dari akun ini untuk karya tersebut.",
  SudahReveal: () => "Nilai untuk karya ini sudah dibuka (reveal) sebelumnya.",
  HashTidakCocok: () =>
    "Nilai/salt tidak cocok dengan komitmen. Pastikan berkas kunci reveal benar, tidak diubah, dan milik akun ini.",
  NilaiDiLuarRentang: () => "Nilai harus di antara 0 dan 100.",
  JumlahNilaiSalah: () => "Jumlah nilai tidak sama dengan jumlah kriteria.",
  HashKosong: () => "Hash tidak boleh kosong.",
};

export function pesanError(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const nama = revert.data?.errorName;
      if (nama && PESAN[nama]) return PESAN[nama](revert.data?.args ?? []);
      if (revert.reason) return `Transaksi ditolak kontrak: ${revert.reason}`;
    }
    if (e.walk((x) => x instanceof UserRejectedRequestError)) return "Transaksi dibatalkan di dompet.";
    if (e.walk((x) => x instanceof InsufficientFundsError)) return "Saldo ETH tidak cukup untuk membayar gas.";
    if (/chain|network/i.test(e.shortMessage) && /mismatch|does not match/i.test(e.message))
      return "Jaringan di dompet berbeda. Ganti jaringan dompet ke jaringan yang dipakai aplikasi.";
    return e.shortMessage;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
