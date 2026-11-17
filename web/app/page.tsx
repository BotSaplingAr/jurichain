"use client";

import Link from "next/link";
import { useConnection } from "wagmi";
import { ALAMAT_KONTRAK, ALAMAT_VALID, CHAIN } from "@/lib/config";
import { useDaftarLomba, useLombaTerpilih, usePeran } from "@/lib/hooks";
import { formatWaktu } from "@/lib/status";
import { PilihLomba } from "@/components/PilihLomba";
import { KartuTahap } from "@/components/KartuTahap";
import { Info, Kartu, Lencana, TautanAlamat } from "@/components/ui";

export default function Beranda() {
  const { isConnected } = useConnection();
  const [id, setId] = useLombaTerpilih();
  const { lomba, memuat } = useDaftarLomba();

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Penjurian lomba yang transparan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Nilai juri dikunci dengan skema <b>commit-reveal</b> di {CHAIN.name}. Tidak ada yang bisa mengubah atau menghapus
          nilai setelah dikirim.
          {ALAMAT_VALID && (
            <>
              {" "}
              Kontrak: <TautanAlamat alamat={ALAMAT_KONTRAK} />
            </>
          )}
        </p>
      </div>

      {!isConnected && <Info>Hubungkan MetaMask (tombol kanan atas) untuk melihat peran akun Anda dan mengirim transaksi.</Info>}

      <Kartu judul="Peran akun Anda" aksi={<PilihLomba />}>
        <Peran id={id} />
      </Kartu>

      <KartuTahap id={id} />

      <Kartu judul="Daftar lomba">
        {memuat ? (
          <p className="text-sm text-slate-500">Memuat...</p>
        ) : lomba.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada lomba. Panitia dapat membuatnya di halaman{" "}
            <Link href="/panitia" className="underline">
              Panitia
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Karya</th>
                  <th className="py-2 pr-3">Batas daftar</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lomba
                  .slice()
                  .reverse()
                  .map((l) => (
                    <tr key={l.id.toString()} className={`border-b last:border-0 ${l.id === id ? "bg-indigo-50/50" : ""}`}>
                      <td className="py-2 pr-3">{l.id.toString()}</td>
                      <td className="py-2 pr-3">
                        <button className="text-left font-medium hover:underline" onClick={() => setId(l.id)}>
                          {l.nama}
                        </button>
                      </td>
                      <td className="py-2 pr-3">
                        <Lencana status={l.status} />
                      </td>
                      <td className="py-2 pr-3">{l.jumlahKarya.toString()}</td>
                      <td className="py-2 pr-3">{formatWaktu(l.batasDaftar)}</td>
                      <td className="py-2 text-right">
                        <Link href={`/hasil/${l.id}`} className="text-indigo-700 underline">
                          Hasil
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Kartu>
    </>
  );
}

function Peran({ id }: { id?: bigint }) {
  const p = usePeran(id);
  if (!p.address) return <p className="text-sm text-slate-500">Dompet belum terhubung.</p>;

  const peran: { teks: string; href?: string }[] = [];
  if (p.isAdmin) peran.push({ teks: "Admin kontrak (bisa memberi peran Panitia)", href: "/panitia" });
  if (p.isPanitiaLomba) peran.push({ teks: "Panitia lomba ini", href: "/panitia" });
  else if (p.isPanitiaGlobal) peran.push({ teks: "Panitia (bisa membuat lomba)", href: "/panitia" });
  if (p.isJuri) peran.push({ teks: "Juri lomba ini", href: "/juri" });
  if (p.isPeserta) peran.push({ teks: "Peserta lomba ini", href: "/peserta" });

  return (
    <div className="space-y-2 text-sm">
      <p>
        Akun: <TautanAlamat alamat={p.address} pendek={false} />
      </p>
      {p.memuat ? (
        <p className="text-slate-500">Memeriksa peran...</p>
      ) : peran.length === 0 ? (
        <p className="text-slate-600">Tidak punya peran di lomba ini (pengamat). Anda tetap bisa melihat hasil dan memajukan tahap.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {peran.map((r) => (
            <li key={r.teks}>
              <Link href={r.href ?? "/"} className="inline-block rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-800 hover:bg-indigo-200">
                {r.teks} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
