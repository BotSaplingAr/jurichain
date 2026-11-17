"use client";

import Link from "next/link";
import { useLomba, useSekarang, useTx } from "@/lib/hooks";
import { LABEL_STATUS, STATUS, formatSisa, formatWaktu } from "@/lib/status";
import { Kartu, Lencana, PesanTx, Tombol } from "./ui";

/** Tenggat yang sedang berjalan untuk tiap status (indeks enum). */
function tenggatAktif(status: number, l: { batasDaftar: bigint; batasCommit: bigint; batasReveal: bigint }) {
  switch (STATUS[status]) {
    case "PENDAFTARAN":
      return { batas: Number(l.batasDaftar), berikut: "PENILAIAN_COMMIT" as const };
    case "PENILAIAN_COMMIT":
      return { batas: Number(l.batasCommit), berikut: "PENILAIAN_REVEAL" as const };
    case "PENILAIAN_REVEAL":
      return { batas: Number(l.batasReveal), berikut: null };
    default:
      return null;
  }
}

/** Status lomba, tenggat, hitung mundur, dan tombol "Majukan Tahap" (boleh diklik siapa saja). */
export function KartuTahap({ id, tautanHasil = true }: { id?: bigint; tautanHasil?: boolean }) {
  const { lomba } = useLomba(id);
  const sekarang = useSekarang();
  const tx = useTx();

  if (!id) return null;
  if (!lomba) return <Kartu>Memuat lomba #{id.toString()}...</Kartu>;

  const aktif = tenggatAktif(lomba.status, lomba);
  const sisa = aktif && sekarang !== null ? aktif.batas - sekarang : null;
  const bisaMaju = sisa !== null && sisa < 0;

  const baris = [
    { label: "Batas pendaftaran", t: lomba.batasDaftar, s: "PENDAFTARAN" },
    { label: "Batas commit nilai", t: lomba.batasCommit, s: "PENILAIAN_COMMIT" },
    { label: "Batas reveal nilai", t: lomba.batasReveal, s: "PENILAIAN_REVEAL" },
  ];

  return (
    <Kartu
      judul={
        <span className="flex flex-wrap items-center gap-2">
          #{lomba.id.toString()} {lomba.nama} <Lencana status={lomba.status} />
        </span>
      }
      aksi={
        tautanHasil && (
          <Link href={`/hasil/${lomba.id}`} className="text-sm text-indigo-700 underline">
            Lihat hasil & detail →
          </Link>
        )
      }
    >
      <ul className="grid gap-2 text-sm sm:grid-cols-3">
        {baris.map((b) => {
          const sedang = STATUS[lomba.status] === b.s;
          return (
            <li key={b.s} className={`rounded-lg border px-3 py-2 ${sedang ? "border-indigo-300 bg-indigo-50" : "border-slate-200"}`}>
              <div className="text-slate-500">{b.label}</div>
              <div className="font-medium text-slate-900">{formatWaktu(b.t)}</div>
              {sekarang !== null && (
                <div className={`font-mono text-xs ${Number(b.t) - sekarang <= 0 ? "text-slate-400" : "text-indigo-700"}`}>
                  {formatSisa(Number(b.t) - sekarang)}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {aktif ? (
          <>
            <Tombol
              onClick={() => tx.kirim("majukanTahap", [lomba.id], "Tahap lomba berhasil dimajukan.")}
              disabled={tx.sedang || !bisaMaju}
              title="Siapa saja boleh memajukan tahap setelah tenggat lewat"
            >
              Majukan Tahap
            </Tombol>
            <span className="text-sm text-slate-600">
              {bisaMaju
                ? `Tenggat lewat — siapa pun bisa memajukan ke "${aktif.berikut ? LABEL_STATUS[aktif.berikut] : "Diumumkan / Sengketa"}".`
                : sisa !== null
                  ? `Bisa dimajukan dalam ${formatSisa(sisa)}.`
                  : ""}
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-600">
            {STATUS[lomba.status] === "DIBUAT"
              ? "Menunggu panitia menetapkan juri dan membuka pendaftaran."
              : "Lomba sudah final. Tidak ada tahap berikutnya."}
          </span>
        )}
      </div>
      <div className="mt-3">
        <PesanTx tx={tx} />
      </div>
    </Kartu>
  );
}
