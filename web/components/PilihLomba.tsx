"use client";

import { useEffect } from "react";
import { useDaftarLomba, useLombaTerpilih } from "@/lib/hooks";
import { LABEL_STATUS, namaStatus } from "@/lib/status";
import { kelasInput } from "./ui";

/** Dropdown pemilih lomba; pilihan tersimpan dan dipakai bersama di semua halaman. */
export function PilihLomba({ saring }: { saring?: (status: number) => boolean }) {
  const { lomba, memuat } = useDaftarLomba();
  const [id, setId] = useLombaTerpilih();
  const daftar = saring ? lomba.filter((l) => saring(l.status)) : lomba;

  // Pilih otomatis lomba terbaru bila belum ada pilihan
  useEffect(() => {
    if (!id && lomba.length > 0) setId(lomba[lomba.length - 1].id);
  }, [id, lomba, setId]);

  if (memuat) return <p className="text-sm text-slate-500">Memuat daftar lomba...</p>;
  if (lomba.length === 0) return <p className="text-sm text-slate-500">Belum ada lomba di kontrak ini.</p>;

  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-slate-700">Lomba:</span>
      <select className={`${kelasInput} w-auto min-w-64`} value={id?.toString() ?? ""} onChange={(e) => setId(BigInt(e.target.value))}>
        {!daftar.some((l) => l.id === id) && id && <option value={id.toString()}>Lomba #{id.toString()}</option>}
        {daftar
          .slice()
          .reverse()
          .map((l) => (
            <option key={l.id.toString()} value={l.id.toString()}>
              #{l.id.toString()} — {l.nama} ({LABEL_STATUS[namaStatus(l.status)]})
            </option>
          ))}
      </select>
    </label>
  );
}
