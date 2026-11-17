import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LABEL_STATUS, WARNA_STATUS, namaStatus } from "@/lib/status";
import { urlExplorer } from "@/lib/config";
import type { StatusTx } from "@/lib/hooks";

export function Kartu({ judul, children, aksi }: { judul?: ReactNode; children: ReactNode; aksi?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {(judul || aksi) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {judul && <h2 className="text-lg font-semibold text-slate-900">{judul}</h2>}
          {aksi}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tombol({
  varian = "utama",
  className = "",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: "utama" | "kedua" | "bahaya" }) {
  const gaya = {
    utama: "bg-indigo-600 text-white hover:bg-indigo-700",
    kedua: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    bahaya: "bg-rose-600 text-white hover:bg-rose-700",
  }[varian];
  return (
    <button
      {...p}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${gaya} ${className}`}
    />
  );
}

export const kelasInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function Label({ teks, children, catatan }: { teks: string; children: ReactNode; catatan?: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{teks}</span>
      {children}
      {catatan && <span className="block text-xs text-slate-500">{catatan}</span>}
    </label>
  );
}

export function Lencana({ status }: { status: number }) {
  const n = namaStatus(status);
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${WARNA_STATUS[n]}`}>{LABEL_STATUS[n]}</span>;
}

export function Info({ jenis = "info", children }: { jenis?: "info" | "sukses" | "galat" | "peringatan"; children: ReactNode }) {
  const gaya = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    sukses: "border-green-200 bg-green-50 text-green-900",
    galat: "border-rose-200 bg-rose-50 text-rose-900",
    peringatan: "border-amber-200 bg-amber-50 text-amber-900",
  }[jenis];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${gaya}`}>{children}</div>;
}

export function TautanTx({ hash }: { hash: string }) {
  const url = urlExplorer("tx", hash);
  const teks = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="font-mono underline">
      {teks}
    </a>
  ) : (
    <span className="font-mono">{teks}</span>
  );
}

export function TautanAlamat({ alamat, pendek = true }: { alamat: string; pendek?: boolean }) {
  const url = urlExplorer("address", alamat);
  const teks = pendek ? `${alamat.slice(0, 6)}…${alamat.slice(-4)}` : alamat;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="font-mono underline decoration-dotted" title={alamat}>
      {teks}
    </a>
  ) : (
    <span className="font-mono" title={alamat}>
      {teks}
    </span>
  );
}

/** Menampilkan progres / hasil / error dari useTx(). */
export function PesanTx({ tx }: { tx: StatusTx }) {
  if (tx.error) return <Info jenis="galat">⚠️ {tx.error}</Info>;
  if (!tx.pesan) return null;
  return (
    <Info jenis={tx.sedang ? "info" : "sukses"}>
      {tx.sedang ? "⏳ " : "✅ "}
      {tx.pesan}
      {tx.hash && (
        <>
          {" "}
          Tx: <TautanTx hash={tx.hash} />
        </>
      )}
    </Info>
  );
}
