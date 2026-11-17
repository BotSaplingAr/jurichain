"use client";

import { useState } from "react";
import { usePublicClient, useReadContracts } from "wagmi";
import { isAddress, isHex, zeroHash, type Address, type Hex } from "viem";
import { bacaKunciReveal, buatSalt, hitungHashNilai, unduhKunciReveal, type KunciReveal } from "@/lib/commitReveal";
import { CHAIN, kontrak } from "@/lib/config";
import { useLomba, useLombaTerpilih, usePeran, useTx } from "@/lib/hooks";
import { STATUS, kodeKarya } from "@/lib/status";
import { PilihLomba } from "@/components/PilihLomba";
import { KartuTahap } from "@/components/KartuTahap";
import { Info, Kartu, PesanTx, Tombol, kelasInput } from "@/components/ui";

export default function HalamanJuri() {
  const [id] = useLombaTerpilih();
  const p = usePeran(id);
  const { lomba, kriteria, bobot } = useLomba(id);
  const status = lomba ? STATUS[lomba.status] : undefined;

  return (
    <>
      <h1 className="text-2xl font-bold">Juri</h1>
      <PilihLomba />
      <KartuTahap id={id} />
      {!p.address ? (
        <Info>Hubungkan dompet juri terlebih dahulu.</Info>
      ) : !lomba ? null : !p.isJuri ? (
        <Info jenis="peringatan">Akun ini bukan juri di lomba #{lomba.id.toString()}.</Info>
      ) : (
        <>
          {status === "PENDAFTARAN" || status === "DIBUAT" ? (
            <Info>Penilaian belum dimulai. Tahap commit dimulai setelah batas pendaftaran lewat dan tahap dimajukan.</Info>
          ) : null}
          {status === "PENILAIAN_REVEAL" && <UnggahKunci id={lomba.id} juri={p.address} />}
          <DaftarKarya
            id={lomba.id}
            juri={p.address}
            jumlah={Number(lomba.jumlahKarya)}
            kriteria={kriteria}
            bobot={bobot}
            bisaCommit={status === "PENILAIAN_COMMIT"}
          />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Daftar karya berkode anonim + form commit
// ---------------------------------------------------------------------------
function DaftarKarya(props: {
  id: bigint;
  juri: Address;
  jumlah: number;
  kriteria: readonly string[];
  bobot: readonly number[];
  bisaCommit: boolean;
}) {
  const { id, juri, jumlah } = props;
  const ids = Array.from({ length: jumlah }, (_, i) => BigInt(i + 1));
  const r = useReadContracts({
    allowFailure: false,
    contracts: ids.flatMap((k) => [
      { ...kontrak, functionName: "komitmen" as const, args: [id, k, juri] as const },
      { ...kontrak, functionName: "sudahReveal" as const, args: [id, k, juri] as const },
    ]),
    query: { enabled: jumlah > 0, refetchInterval: 4000 },
  });

  return (
    <Kartu judul={`Karya (${jumlah})`}>
      <p className="mb-3 text-sm text-slate-600">
        Karya ditampilkan dengan kode anonim. Berkas karya dibagikan panitia di luar rantai sesuai kode ini.
      </p>
      {jumlah === 0 ? (
        <p className="text-sm text-slate-500">Tidak ada karya yang dikumpulkan.</p>
      ) : (
        <div className="space-y-3">
          {ids.map((k, i) => {
            const komit = r.data?.[i * 2] as Hex | undefined;
            const reveal = r.data?.[i * 2 + 1] as boolean | undefined;
            return <BarisKarya key={k.toString()} {...props} idKarya={k} sudahKomit={!!komit && komit !== zeroHash} sudahReveal={!!reveal} />;
          })}
        </div>
      )}
    </Kartu>
  );
}

function BarisKarya({
  id,
  idKarya,
  juri,
  kriteria,
  bobot,
  bisaCommit,
  sudahKomit,
  sudahReveal,
}: {
  id: bigint;
  idKarya: bigint;
  juri: Address;
  kriteria: readonly string[];
  bobot: readonly number[];
  bisaCommit: boolean;
  sudahKomit: boolean;
  sudahReveal: boolean;
}) {
  const [isian, setIsian] = useState<Record<number, number>>({});
  const nilai = kriteria.map((_, i) => isian[i] ?? NaN);
  const [kunci, setKunci] = useState<KunciReveal | null>(null);
  const tx = useTx();
  const valid = nilai.length > 0 && nilai.every((n) => Number.isInteger(n) && n >= 0 && n <= 100);
  const skor = valid ? nilai.reduce((t, n, i) => t + n * bobot[i], 0) / 100 : null;

  async function commit() {
    if (!valid) return;
    const salt = buatSalt();
    const hash = hitungHashNilai(id, idKarya, nilai, salt, juri);
    const k: KunciReveal = { idLomba: id.toString(), idKarya: idKarya.toString(), nilai, salt, juri };
    // Kunci diunduh SEBELUM transaksi agar tidak hilang bila browser tertutup setelah commit.
    unduhKunciReveal(k);
    setKunci(k);
    await tx.kirim("commitNilai", [id, idKarya, hash], "Nilai terkunci (commit). Simpan berkas kunci reveal untuk tahap reveal.");
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{kodeKarya(idKarya)}</span>
        <span className="text-xs">
          {sudahReveal ? (
            <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">sudah reveal</span>
          ) : sudahKomit ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">sudah commit</span>
          ) : (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">belum dinilai</span>
          )}
        </span>
      </div>
      {bisaCommit && !sudahKomit && (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {kriteria.map((nama, i) => (
              <label key={i} className="text-sm">
                <span className="text-slate-600">
                  {nama} <span className="text-slate-400">(bobot {bobot[i]})</span>
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={kelasInput}
                  value={Number.isNaN(nilai[i]) ? "" : nilai[i]}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    setIsian((s) => ({ ...s, [i]: v }));
                  }}
                  placeholder="0–100"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tombol disabled={!valid || tx.sedang} onClick={commit}>
              Commit nilai + unduh kunci
            </Tombol>
            {skor !== null && <span className="text-sm text-slate-600">Skor tertimbang: {skor.toFixed(2)}</span>}
          </div>
        </div>
      )}
      {kunci && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Berkas kunci reveal sudah diunduh.</span>
          <Tombol varian="kedua" onClick={() => unduhKunciReveal(kunci)}>
            Unduh ulang kunci
          </Tombol>
        </div>
      )}
      <div className="mt-2">
        <PesanTx tx={tx} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tahap reveal: unggah berkas kunci → verifikasi lokal → revealNilai
// ---------------------------------------------------------------------------
type ItemKunci = { namaBerkas: string; kunci?: KunciReveal; masalah?: string };

function UnggahKunci({ id, juri }: { id: bigint; juri: Address }) {
  const [item, setItem] = useState<ItemKunci[]>([]);
  const publicClient = usePublicClient({ chainId: CHAIN.id });

  async function baca(files: FileList | null) {
    if (!files) return;
    const hasil: ItemKunci[] = [];
    for (const f of Array.from(files)) {
      try {
        const k = await bacaKunciReveal(f);
        const masalah = await periksa(k);
        hasil.push({ namaBerkas: f.name, kunci: k, masalah });
      } catch {
        hasil.push({ namaBerkas: f.name, masalah: "Berkas bukan JSON kunci reveal yang valid." });
      }
    }
    setItem(hasil);
  }

  async function periksa(k: KunciReveal): Promise<string | undefined> {
    if (!k || !Array.isArray(k.nilai) || !isHex(k.salt) || !isAddress(k.juri) || !/^\d+$/.test(k.idLomba) || !/^\d+$/.test(k.idKarya))
      return "Format berkas kunci tidak lengkap.";
    if (BigInt(k.idLomba) !== id) return `Kunci ini untuk lomba #${k.idLomba}, bukan lomba #${id}.`;
    if (k.juri.toLowerCase() !== juri.toLowerCase()) return "Kunci ini milik akun juri lain. Ganti akun di MetaMask.";
    if (!publicClient) return undefined;
    const komit = await publicClient.readContract({ ...kontrak, functionName: "komitmen", args: [id, BigInt(k.idKarya), juri] });
    if (komit === zeroHash) return "Tidak ada commit dari akun ini untuk karya tersebut.";
    if (hitungHashNilai(id, BigInt(k.idKarya), k.nilai, k.salt, juri) !== komit)
      return "Isi kunci tidak cocok dengan commit on-chain (mungkin berkas lama dari commit yang gagal, atau sudah diubah).";
    return undefined;
  }

  return (
    <Kartu judul="Reveal nilai">
      <p className="mb-3 text-sm text-slate-600">
        Unggah berkas <code>kunci-reveal_*.json</code> yang Anda unduh saat commit (boleh beberapa sekaligus). Kunci dicek dulu di browser
        sebelum dikirim.
      </p>
      <input type="file" accept="application/json,.json" multiple className="block w-full text-sm" onChange={(e) => baca(e.target.files)} />
      <div className="mt-3 space-y-2">
        {item.map((it, i) => (
          <BarisReveal key={`${it.namaBerkas}-${i}`} id={id} item={it} />
        ))}
      </div>
    </Kartu>
  );
}

function BarisReveal({ id, item }: { id: bigint; item: ItemKunci }) {
  const tx = useTx();
  const k = item.kunci;
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <b>{k ? kodeKarya(BigInt(k.idKarya)) : "?"}</b> <span className="text-slate-500">({item.namaBerkas})</span>
          {k && <span className="ml-2 font-mono text-xs text-slate-600">nilai: [{k.nilai.join(", ")}]</span>}
        </span>
        {k && !item.masalah && (
          <Tombol
            disabled={tx.sedang || (!!tx.pesan && !tx.error)}
            onClick={() => tx.kirim("revealNilai", [id, BigInt(k.idKarya), k.nilai, k.salt], "Nilai berhasil dibuka (reveal).")}
          >
            Reveal
          </Tombol>
        )}
      </div>
      {item.masalah && (
        <div className="mt-2">
          <Info jenis="galat">{item.masalah}</Info>
        </div>
      )}
      <div className="mt-2">
        <PesanTx tx={tx} />
      </div>
    </div>
  );
}
