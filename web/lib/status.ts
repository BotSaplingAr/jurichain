/** Urutan sama dengan enum StatusLomba di kontrak. */
export const STATUS = ["DIBUAT", "PENDAFTARAN", "PENILAIAN_COMMIT", "PENILAIAN_REVEAL", "DIUMUMKAN", "SENGKETA"] as const;
export type StatusNama = (typeof STATUS)[number];

export const LABEL_STATUS: Record<StatusNama, string> = {
  DIBUAT: "Dibuat",
  PENDAFTARAN: "Pendaftaran",
  PENILAIAN_COMMIT: "Penilaian (commit)",
  PENILAIAN_REVEAL: "Penilaian (reveal)",
  DIUMUMKAN: "Diumumkan",
  SENGKETA: "Sengketa",
};

export const WARNA_STATUS: Record<StatusNama, string> = {
  DIBUAT: "bg-slate-100 text-slate-700",
  PENDAFTARAN: "bg-blue-100 text-blue-800",
  PENILAIAN_COMMIT: "bg-amber-100 text-amber-800",
  PENILAIAN_REVEAL: "bg-orange-100 text-orange-800",
  DIUMUMKAN: "bg-green-100 text-green-800",
  SENGKETA: "bg-red-100 text-red-800",
};

export const namaStatus = (s: number): StatusNama => STATUS[s] ?? "DIBUAT";

/** Kode anonim karya untuk juri, mis. K-003. */
export const kodeKarya = (id: bigint | number) => `K-${String(id).padStart(3, "0")}`;

export const singkat = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "-");

/** Skor 0..10000 → "80,50" */
export const formatSkor = (x100: bigint) => (Number(x100) / 100).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatWaktu(detik: bigint | number) {
  return new Date(Number(detik) * 1000).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" });
}

export function formatSisa(detik: number) {
  if (detik <= 0) return "sudah lewat";
  const j = Math.floor(detik / 3600);
  const m = Math.floor((detik % 3600) / 60);
  const d = detik % 60;
  return (j ? `${j}j ` : "") + `${String(m).padStart(2, "0")}m ${String(d).padStart(2, "0")}d`;
}
