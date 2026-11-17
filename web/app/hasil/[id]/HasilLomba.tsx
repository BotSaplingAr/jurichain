"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useReadContracts } from "wagmi";
import { isHex, type Address, type Hex } from "viem";
import { hitungHashKarya, hitungHashPanduan } from "@/lib/commitReveal";
import { ALAMAT_KONTRAK, kontrak, urlExplorer } from "@/lib/config";
import { useLomba } from "@/lib/hooks";
import { STATUS, formatSkor, formatWaktu, kodeKarya } from "@/lib/status";
import { KartuTahap } from "@/components/KartuTahap";
import { Info, Kartu, Label, TautanAlamat, kelasInput } from "@/components/ui";

type BarisHasil = {
  idKarya: bigint;
  peserta: Address;
  hashKarya: Hex;
  waktuKumpul: bigint;
  jumlahReveal: number;
  rata: bigint;
};

export default function HasilLomba() {
  const params = useParams<{ id: string }>();
  const id = /^\d+$/.test(params.id ?? "") ? BigInt(params.id) : undefined;
  const { lomba, kriteria, bobot, juri, memuat } = useLomba(id);
  const n = Number(lomba?.jumlahKarya ?? 0n);
  const ids = Array.from({ length: n }, (_, i) => BigInt(i + 1));

  const data = useReadContracts({
    allowFailure: false,
    contracts: ids.flatMap((k) => [
      { ...kontrak, functionName: "daftarKarya" as const, args: [id ?? 0n, k] as const },
      { ...kontrak, functionName: "lihatSkor" as const, args: [id ?? 0n, k] as const },
    ]),
    query: { enabled: n > 0, refetchInterval: 4000 },
  });
  const gagal = useReadContracts({
    allowFailure: false,
    contracts: juri.map((j) => ({ ...kontrak, functionName: "jmlGagalReveal" as const, args: [j] as const })),
    query: { enabled: juri.length > 0, refetchInterval: 4000 },
  });

  if (!id) return <Info jenis="galat">ID lomba tidak valid.</Info>;
  if (memuat) return <p className="text-sm text-slate-500">Memuat...</p>;
  if (!lomba) return <Info jenis="galat">Lomba #{id.toString()} tidak ditemukan.</Info>;

  const status = STATUS[lomba.status];
  const final = status === "DIUMUMKAN" || status === "SENGKETA";

  const baris: BarisHasil[] = ids.map((k, i) => {
    const karya = data.data?.[i * 2] as readonly [bigint, Address, Hex, bigint, bigint, number] | undefined;
    const skor = data.data?.[i * 2 + 1] as readonly [bigint, number, bigint] | undefined;
    return {
      idKarya: k,
      peserta: karya?.[1] ?? "0x0000000000000000000000000000000000000000",
      hashKarya: karya?.[2] ?? "0x",
      waktuKumpul: karya?.[3] ?? 0n,
      jumlahReveal: skor?.[1] ?? 0,
      rata: skor?.[2] ?? 0n,
    };
  });
  const urut = [...baris].sort((a, b) => (b.rata === a.rata ? Number(a.idKarya - b.idKarya) : b.rata > a.rata ? 1 : -1));
  const urlKontrak = urlExplorer("address", ALAMAT_KONTRAK);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Hasil lomba #{lomba.id.toString()}</h1>
        <Link href="/" className="text-sm text-indigo-700 underline">
          ← Beranda
        </Link>
      </div>

      <KartuTahap id={id} tautanHasil={false} />

      <Kartu judul="Peringkat">
        {status === "DIUMUMKAN" && <Info jenis="sukses">Hasil final. Semua karya memenuhi kuorum {lomba.kuorum} juri.</Info>}
        {status === "SENGKETA" && (
          <Info jenis="galat">
            Status SENGKETA: ada karya yang nilainya dibuka oleh kurang dari {lomba.kuorum} juri (kuorum), atau tidak ada karya. Hasil di bawah
            tidak sah sebagai pengumuman dan perlu ditindaklanjuti panitia di luar rantai.
          </Info>
        )}
        {!final && <Info jenis="peringatan">Hasil sementara — penilaian belum selesai. Skor hanya dari nilai yang sudah di-reveal.</Info>}
        {n === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Belum ada karya.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Peringkat</th>
                  <th className="py-2 pr-3">Karya</th>
                  <th className="py-2 pr-3">Peserta</th>
                  <th className="py-2 pr-3">Juri reveal</th>
                  <th className="py-2 pr-3 text-right">Skor (0–100)</th>
                </tr>
              </thead>
              <tbody>
                {urut.map((b, i) => (
                  <tr key={b.idKarya.toString()} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-semibold">{i + 1}</td>
                    <td className="py-2 pr-3">{kodeKarya(b.idKarya)}</td>
                    <td className="py-2 pr-3">{final ? <TautanAlamat alamat={b.peserta} /> : <span className="text-slate-400">disembunyikan</span>}</td>
                    <td className={`py-2 pr-3 ${b.jumlahReveal < lomba.kuorum ? "text-rose-600" : ""}`}>
                      {b.jumlahReveal} / {juri.length} {b.jumlahReveal < lomba.kuorum && "(di bawah kuorum)"}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-base font-semibold">{formatSkor(b.rata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">
              Skor = rata-rata Σ(nilai × bobot) dari juri yang reveal, dibagi 100. Dihitung on-chain oleh lihatSkor().
            </p>
          </div>
        )}
      </Kartu>

      <Kartu judul="Detail lomba">
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-slate-500">Kontrak</dt>
          <dd>
            <TautanAlamat alamat={ALAMAT_KONTRAK} pendek={false} />
            {urlKontrak && (
              <a className="ml-2 text-indigo-700 underline" href={urlKontrak} target="_blank" rel="noreferrer">
                Basescan ↗
              </a>
            )}
          </dd>
          <dt className="text-slate-500">Panitia</dt>
          <dd>
            <TautanAlamat alamat={lomba.panitia} pendek={false} />
          </dd>
          <dt className="text-slate-500">Hash panduan</dt>
          <dd className="font-mono text-xs break-all">{lomba.hashPanduan}</dd>
          <dt className="text-slate-500">Kriteria</dt>
          <dd>{kriteria.map((k, i) => `${k} (${bobot[i]})`).join(" · ")}</dd>
          <dt className="text-slate-500">Kuorum</dt>
          <dd>{lomba.kuorum} juri per karya</dd>
          <dt className="text-slate-500">Juri</dt>
          <dd>
            <ul className="space-y-1">
              {juri.map((j, i) => {
                const g = gagal.data?.[i] as bigint | undefined;
                return (
                  <li key={j}>
                    <TautanAlamat alamat={j} pendek={false} />{" "}
                    <span className={`text-xs ${g ? "text-rose-600" : "text-slate-500"}`}>— gagal reveal (semua lomba): {g?.toString() ?? "…"}</span>
                  </li>
                );
              })}
            </ul>
          </dd>
        </dl>
      </Kartu>

      <AlatCocok baris={baris} hashPanduan={lomba.hashPanduan} />
    </>
  );
}

// ---------------------------------------------------------------------------
function AlatCocok({ baris, hashPanduan }: { baris: BarisHasil[]; hashPanduan: Hex }) {
  const [salt, setSalt] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [hasil, setHasil] = useState<{ hash: Hex; cocok?: BarisHasil } | null>(null);
  const [panduan, setPanduan] = useState<{ hash: Hex; cocok: boolean } | null>(null);
  const saltValid = isHex(salt) && salt.length === 66;

  async function cocokkan(f: File | null, s: string) {
    setHasil(null);
    if (!f || !(isHex(s) && s.length === 66)) return;
    const hash = await hitungHashKarya(f, s as Hex);
    setHasil({ hash, cocok: baris.find((b) => b.hashKarya.toLowerCase() === hash.toLowerCase()) });
  }

  async function bacaBukti(f?: File) {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (typeof j.saltKarya === "string") {
        setSalt(j.saltKarya);
        cocokkan(berkas, j.saltKarya);
      }
    } catch {
      /* abaikan berkas tidak valid */
    }
  }

  return (
    <Kartu judul="Cocokkan berkas dengan hash on-chain">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-semibold">Berkas karya</h3>
          <Label teks="Berkas karya asli">
            <input
              type="file"
              className="block w-full text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setBerkas(f);
                cocokkan(f, salt);
              }}
            />
          </Label>
          <Label teks="Salt karya (0x… 32 byte)" catatan="Atau unggah berkas bukti-karya_*.json di bawah untuk mengisi otomatis.">
            <input
              className={`${kelasInput} font-mono text-xs`}
              value={salt}
              onChange={(e) => {
                setSalt(e.target.value.trim());
                cocokkan(berkas, e.target.value.trim());
              }}
              placeholder="0x..."
            />
          </Label>
          <input type="file" accept=".json,application/json" className="block w-full text-sm" onChange={(e) => bacaBukti(e.target.files?.[0])} />
          {salt && !saltValid && <Info jenis="peringatan">Salt harus 0x + 64 karakter heksadesimal.</Info>}
          {hasil &&
            (hasil.cocok ? (
              <Info jenis="sukses">
                ✅ Cocok dengan <b>{kodeKarya(hasil.cocok.idKarya)}</b>, dikumpulkan {formatWaktu(hasil.cocok.waktuKumpul)}.
              </Info>
            ) : (
              <Info jenis="galat">
                ❌ Tidak cocok dengan karya mana pun di lomba ini.
                <div className="mt-1 font-mono text-xs break-all">hash: {hasil.hash}</div>
              </Info>
            ))}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Dokumen panduan</h3>
          <Label teks="Berkas panduan">
            <input
              type="file"
              className="block w-full text-sm"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return setPanduan(null);
                const hash = await hitungHashPanduan(f);
                setPanduan({ hash, cocok: hash.toLowerCase() === hashPanduan.toLowerCase() });
              }}
            />
          </Label>
          {panduan &&
            (panduan.cocok ? (
              <Info jenis="sukses">✅ Panduan sama persis dengan yang dikunci saat lomba dibuat.</Info>
            ) : (
              <Info jenis="galat">
                ❌ Panduan berbeda dari yang dikunci on-chain.
                <div className="mt-1 font-mono text-xs break-all">hash: {panduan.hash}</div>
              </Info>
            ))}
        </div>
      </div>
    </Kartu>
  );
}
