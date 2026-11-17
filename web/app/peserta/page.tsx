"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { parseEventLogs, type Address, type Hex } from "viem";
import { buatSalt, hitungHashKarya } from "@/lib/commitReveal";
import { ALAMAT_KONTRAK, CHAIN, kontrak } from "@/lib/config";
import { jurichainAbi } from "@/lib/jurichainAbi";
import { unduhJson, useLomba, useLombaTerpilih, usePeran, useSekarang, useTx } from "@/lib/hooks";
import { STATUS, formatWaktu, kodeKarya } from "@/lib/status";
import { PilihLomba } from "@/components/PilihLomba";
import { KartuTahap } from "@/components/KartuTahap";
import { Info, Kartu, Label, PesanTx, Tombol } from "@/components/ui";

type Bukti = {
  jenis: "bukti-karya-jurichain";
  chainId: number;
  kontrak: Address;
  idLomba: string;
  idKarya: string | null;
  peserta: Address;
  namaBerkas: string;
  ukuranByte: number;
  saltKarya: Hex;
  hashKarya: Hex;
  txHash: Hex | null;
  dibuat: string;
};

const unduhBukti = (b: Bukti) =>
  unduhJson(`bukti-karya_lomba${b.idLomba}_${b.idKarya ? `karya${b.idKarya}` : "belum-terkirim"}.json`, b);

export default function HalamanPeserta() {
  const [id] = useLombaTerpilih();
  const p = usePeran(id);
  const { lomba } = useLomba(id);
  const milik = useReadContract({
    ...kontrak,
    functionName: "karyaMilik",
    args: [id ?? 0n, p.address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!id && !!p.address },
  });
  const idKarya = milik.data ?? 0n;

  return (
    <>
      <h1 className="text-2xl font-bold">Peserta</h1>
      <PilihLomba />
      <KartuTahap id={id} />
      {!p.address ? (
        <Info>Hubungkan dompet peserta terlebih dahulu.</Info>
      ) : !lomba ? null : !p.isPeserta ? (
        <Info jenis="peringatan">Akun ini belum didaftarkan panitia sebagai peserta lomba #{lomba.id.toString()}.</Info>
      ) : idKarya > 0n ? (
        <KaryaSaya id={lomba.id} idKarya={idKarya} />
      ) : STATUS[lomba.status] === "PENDAFTARAN" ? (
        <KumpulkanKarya id={lomba.id} batas={Number(lomba.batasDaftar)} peserta={p.address} />
      ) : (
        <Info jenis="peringatan">
          Pengumpulan karya {STATUS[lomba.status] === "DIBUAT" ? "belum dibuka" : "sudah ditutup"}. Anda tidak mengumpulkan karya di lomba ini.
        </Info>
      )}
    </>
  );
}

function KumpulkanKarya({ id, batas, peserta }: { id: bigint; batas: number; peserta: Address }) {
  const tx = useTx();
  const sekarang = useSekarang();
  const [bukti, setBukti] = useState<Bukti | null>(null);
  const lewat = sekarang !== null && sekarang > batas;

  async function pilihBerkas(f?: File) {
    tx.reset();
    if (!f) return setBukti(null);
    const saltKarya = buatSalt();
    setBukti({
      jenis: "bukti-karya-jurichain",
      chainId: CHAIN.id,
      kontrak: ALAMAT_KONTRAK,
      idLomba: id.toString(),
      idKarya: null,
      peserta,
      namaBerkas: f.name,
      ukuranByte: f.size,
      saltKarya,
      hashKarya: await hitungHashKarya(f, saltKarya),
      txHash: null,
      dibuat: new Date().toISOString(),
    });
  }

  async function kumpulkan() {
    if (!bukti) return;
    const r = await tx.kirim("kumpulkanKarya", [id, bukti.hashKarya], "Karya terkumpul! Bukti (salt + hash) sudah diunduh — simpan baik-baik.");
    if (r) {
      const ev = parseEventLogs({ abi: jurichainAbi, logs: r.logs, eventName: "KaryaDikumpulkan" })[0];
      const final = { ...bukti, idKarya: ev?.args.idKarya.toString() ?? null, txHash: r.transactionHash };
      setBukti(final);
      unduhBukti(final);
    }
  }

  return (
    <Kartu judul="Kumpulkan karya">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Berkas karya <b>tidak diunggah ke mana pun</b>. Browser Anda menghitung <i>salted hash</i>{" "}
          <code>keccak256(salt ‖ isi berkas)</code>, dan hanya hash itu yang dicatat on-chain sebagai bukti waktu & keaslian.
        </p>
        <Label teks="Berkas karya">
          <input type="file" className="block w-full text-sm" onChange={(e) => pilihBerkas(e.target.files?.[0])} disabled={tx.sedang} />
        </Label>
        {bukti && (
          <div className="space-y-1 rounded-lg bg-slate-50 p-3 font-mono text-xs break-all">
            <div>berkas : {bukti.namaBerkas}</div>
            <div>salt   : {bukti.saltKarya}</div>
            <div>hash   : {bukti.hashKarya}</div>
          </div>
        )}
        {lewat && <Info jenis="galat">Batas pendaftaran sudah lewat. Karya akan ditolak kontrak.</Info>}
        <div className="flex flex-wrap gap-2">
          <Tombol disabled={!bukti || tx.sedang} onClick={kumpulkan}>
            Kumpulkan Karya
          </Tombol>
          <Tombol varian="kedua" disabled={!bukti} onClick={() => bukti && unduhBukti(bukti)}>
            Unduh bukti (salt + hash)
          </Tombol>
        </div>
        <Info jenis="peringatan">
          Simpan berkas bukti dan berkas karya asli. Tanpa <b>salt</b>, berkas Anda tidak bisa dicocokkan dengan hash on-chain.
        </Info>
        <PesanTx tx={tx} />
      </div>
    </Kartu>
  );
}

function KaryaSaya({ id, idKarya }: { id: bigint; idKarya: bigint }) {
  const k = useReadContract({ ...kontrak, functionName: "daftarKarya", args: [id, idKarya] });
  const [, , hashKarya, waktuKumpul] = k.data ?? [];
  return (
    <Kartu judul="Karya Anda sudah terkumpul ✅">
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-500">Kode karya</dt>
        <dd className="font-semibold">{kodeKarya(idKarya)}</dd>
        <dt className="text-slate-500">Hash on-chain</dt>
        <dd className="font-mono text-xs break-all">{hashKarya ?? "..."}</dd>
        <dt className="text-slate-500">Waktu kumpul</dt>
        <dd>{waktuKumpul ? formatWaktu(waktuKumpul) : "..."}</dd>
      </dl>
      <p className="mt-3 text-sm text-slate-600">
        Setiap peserta hanya boleh mengumpulkan sekali. Anda bisa mencocokkan berkas Anda dengan hash ini di halaman hasil.
      </p>
    </Kartu>
  );
}
