"use client";

import { useState, type FormEvent } from "react";
import { usePublicClient } from "wagmi";
import { isAddress, parseEventLogs, type Address, type Hex } from "viem";
import { CHAIN } from "@/lib/config";
import { hitungHashPanduan } from "@/lib/commitReveal";
import { jurichainAbi } from "@/lib/jurichainAbi";
import { useLomba, useLombaTerpilih, usePeran, useTx } from "@/lib/hooks";
import { STATUS } from "@/lib/status";
import { PilihLomba } from "@/components/PilihLomba";
import { KartuTahap } from "@/components/KartuTahap";
import { Info, Kartu, Label, PesanTx, TautanAlamat, Tombol, kelasInput } from "@/components/ui";

export default function HalamanPanitia() {
  const [id] = useLombaTerpilih();
  const p = usePeran(id);

  return (
    <>
      <h1 className="text-2xl font-bold">Panitia</h1>
      {!p.address && <Info>Hubungkan dompet panitia terlebih dahulu.</Info>}
      {p.address && !p.memuat && !p.isPanitiaGlobal && !p.isAdmin && (
        <Info jenis="peringatan">Akun ini belum punya peran Panitia. Minta admin kontrak (akun deployer) memberikannya.</Info>
      )}
      {p.isAdmin && <AturPanitia />}
      {p.isPanitiaGlobal && <BuatLomba />}
      {p.isPanitiaGlobal && <KelolaLomba id={id} />}
    </>
  );
}

// ---------------------------------------------------------------------------
function AturPanitia() {
  const [akun, setAkun] = useState("");
  const tx = useTx();
  const valid = isAddress(akun);
  return (
    <Kartu judul="Admin: beri / cabut peran Panitia">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-72 flex-1">
          <Label teks="Alamat akun">
            <input className={kelasInput} value={akun} onChange={(e) => setAkun(e.target.value.trim())} placeholder="0x..." />
          </Label>
        </div>
        <Tombol disabled={!valid || tx.sedang} onClick={() => tx.kirim("aturPanitia", [akun, true], "Peran Panitia diberikan.")}>
          Jadikan Panitia
        </Tombol>
        <Tombol varian="kedua" disabled={!valid || tx.sedang} onClick={() => tx.kirim("aturPanitia", [akun, false], "Peran Panitia dicabut.")}>
          Cabut
        </Tombol>
      </div>
      <div className="mt-3">
        <PesanTx tx={tx} />
      </div>
    </Kartu>
  );
}

// ---------------------------------------------------------------------------
type Kriteria = { nama: string; bobot: number };

function BuatLomba() {
  const [, setId] = useLombaTerpilih();
  const tx = useTx();
  const publicClient = usePublicClient({ chainId: CHAIN.id });
  const [nama, setNama] = useState("");
  const [panduan, setPanduan] = useState<{ nama: string; hash: Hex } | null>(null);
  const [kriteria, setKriteria] = useState<Kriteria[]>([
    { nama: "Kreativitas", bobot: 40 },
    { nama: "Teknis", bobot: 30 },
    { nama: "Presentasi", bobot: 30 },
  ]);
  const [menit, setMenit] = useState({ daftar: 5, commit: 10, reveal: 15 });
  const [kuorum, setKuorum] = useState(2);

  const totalBobot = kriteria.reduce((t, k) => t + (Number.isFinite(k.bobot) ? k.bobot : 0), 0);
  const masalah: string[] = [];
  if (!nama.trim()) masalah.push("Nama lomba wajib diisi.");
  if (!panduan) masalah.push("Unggah dokumen panduan lomba.");
  if (kriteria.length === 0 || kriteria.some((k) => !k.nama.trim())) masalah.push("Setiap kriteria harus bernama.");
  if (kriteria.some((k) => !Number.isInteger(k.bobot) || k.bobot < 0 || k.bobot > 100)) masalah.push("Bobot harus bilangan bulat 0–100.");
  if (totalBobot !== 100) masalah.push(`Total bobot harus 100 (sekarang ${totalBobot}).`);
  if (!(menit.daftar > 0 && menit.daftar < menit.commit && menit.commit < menit.reveal))
    masalah.push("Tenggat harus berurutan: pendaftaran < commit < reveal (dalam menit dari sekarang).");
  if (!(kuorum >= 1 && kuorum <= 255)) masalah.push("Kuorum minimal 1.");

  async function kirim(e: FormEvent) {
    e.preventDefault();
    if (masalah.length || !panduan) return;
    // Pakai yang lebih maju antara jam browser dan jam rantai (rantai bisa sedikit mendahului).
    const blok = await publicClient?.getBlock().catch(() => null);
    const sekarang = Math.max(Math.floor(Date.now() / 1000), Number(blok?.timestamp ?? 0n));
    const tenggat = [menit.daftar, menit.commit, menit.reveal].map((m) => BigInt(sekarang + Math.round(m * 60)));
    const r = await tx.kirim(
      "buatLomba",
      [nama.trim(), panduan.hash, kriteria.map((k) => k.nama.trim()), kriteria.map((k) => k.bobot), tenggat, kuorum],
      "Lomba berhasil dibuat. Lanjutkan dengan menetapkan juri di bawah.",
    );
    if (r) {
      const ev = parseEventLogs({ abi: jurichainAbi, logs: r.logs, eventName: "LombaDibuat" })[0];
      if (ev) setId(ev.args.idLomba);
    }
  }

  const ubahKriteria = (i: number, k: Partial<Kriteria>) => setKriteria((s) => s.map((x, j) => (j === i ? { ...x, ...k } : x)));

  return (
    <Kartu judul="Buat lomba baru">
      <form onSubmit={kirim} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label teks="Nama lomba">
            <input className={kelasInput} value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Lomba Desain Poster 2026" />
          </Label>
          <Label
            teks="Dokumen panduan"
            catatan={panduan ? <span className="font-mono break-all">keccak256: {panduan.hash}</span> : "Hanya hash berkas yang disimpan on-chain."}
          >
            <input
              type="file"
              className="block w-full text-sm"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                setPanduan(f ? { nama: f.name, hash: await hitungHashPanduan(f) } : null);
              }}
            />
          </Label>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Kriteria & bobot</span>
            <span className={`text-sm font-semibold ${totalBobot === 100 ? "text-green-700" : "text-rose-600"}`}>Total: {totalBobot} / 100</span>
          </div>
          <div className="space-y-2">
            {kriteria.map((k, i) => (
              <div key={i} className="flex gap-2">
                <input className={kelasInput} value={k.nama} onChange={(e) => ubahKriteria(i, { nama: e.target.value })} placeholder="Nama kriteria" />
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${kelasInput} w-24`}
                  value={Number.isNaN(k.bobot) ? "" : k.bobot}
                  onChange={(e) => ubahKriteria(i, { bobot: e.target.valueAsNumber })}
                />
                <Tombol type="button" varian="kedua" onClick={() => setKriteria((s) => s.filter((_, j) => j !== i))} disabled={kriteria.length <= 1}>
                  ✕
                </Tombol>
              </div>
            ))}
          </div>
          <Tombol type="button" varian="kedua" className="mt-2" onClick={() => setKriteria((s) => [...s, { nama: "", bobot: 0 }])}>
            + Tambah kriteria
          </Tombol>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {(
            [
              ["daftar", "Batas pendaftaran"],
              ["commit", "Batas commit nilai"],
              ["reveal", "Batas reveal nilai"],
            ] as const
          ).map(([k, teks]) => (
            <Label key={k} teks={teks} catatan="menit dari sekarang">
              <input
                type="number"
                min={1}
                step="any"
                className={kelasInput}
                value={Number.isNaN(menit[k]) ? "" : menit[k]}
                onChange={(e) => setMenit((m) => ({ ...m, [k]: e.target.valueAsNumber }))}
              />
            </Label>
          ))}
          <Label teks="Kuorum juri" catatan="min. juri yang reveal per karya">
            <input
              type="number"
              min={1}
              className={kelasInput}
              value={Number.isNaN(kuorum) ? "" : kuorum}
              onChange={(e) => setKuorum(e.target.valueAsNumber)}
            />
          </Label>
        </div>

        {masalah.length > 0 && (
          <ul className="list-inside list-disc text-sm text-rose-600">
            {masalah.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        <Tombol type="submit" disabled={masalah.length > 0 || tx.sedang}>
          Buat Lomba
        </Tombol>
        <PesanTx tx={tx} />
      </form>
    </Kartu>
  );
}

// ---------------------------------------------------------------------------
function KelolaLomba({ id }: { id?: bigint }) {
  const { lomba, juri } = useLomba(id);
  const p = usePeran(id);
  const status = lomba ? STATUS[lomba.status] : undefined;

  return (
    <>
      <Kartu judul="Kelola lomba" aksi={<PilihLomba />}>
        {!lomba ? (
          <p className="text-sm text-slate-500">Pilih lomba.</p>
        ) : !p.isPanitiaLomba ? (
          <Info jenis="peringatan">
            Lomba ini dibuat oleh panitia lain (<TautanAlamat alamat={lomba.panitia} />). Hanya pembuatnya yang bisa mengelola.
          </Info>
        ) : (
          <div className="space-y-6">
            {status !== "DIBUAT" && (
              <Info>
                Pendaftaran sudah dibuka. Juri, kriteria, bobot, tenggat, dan kuorum <b>terkunci</b> dan tidak bisa diubah siapa pun.
              </Info>
            )}
            <TetapkanJuri id={lomba.id} juri={juri} kuorum={lomba.kuorum} bisa={status === "DIBUAT" && juri.length === 0} />
            <DaftarkanPeserta id={lomba.id} bisa={status === "DIBUAT" || status === "PENDAFTARAN"} />
            {status === "DIBUAT" && <BukaPendaftaran id={lomba.id} siap={juri.length >= 3} />}
          </div>
        )}
      </Kartu>
      <KartuTahap id={id} />
    </>
  );
}

function TetapkanJuri({ id, juri, kuorum, bisa }: { id: bigint; juri: readonly Address[]; kuorum: number; bisa: boolean }) {
  const [daftar, setDaftar] = useState(["", "", ""]);
  const tx = useTx();
  const bersih = daftar.map((a) => a.trim()).filter(Boolean);
  const valid = bersih.length >= 3 && bersih.every((a) => isAddress(a)) && bersih.length >= kuorum;

  return (
    <div>
      <h3 className="mb-2 font-semibold">1. Tetapkan juri (min. 3, sekali saja)</h3>
      {juri.length > 0 ? (
        <ol className="list-inside list-decimal text-sm">
          {juri.map((j) => (
            <li key={j}>
              <TautanAlamat alamat={j} pendek={false} />
            </li>
          ))}
        </ol>
      ) : bisa ? (
        <div className="space-y-2">
          {daftar.map((a, i) => (
            <input
              key={i}
              className={kelasInput}
              value={a}
              placeholder={`Alamat juri ${i + 1} (0x...)`}
              onChange={(e) => setDaftar((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            <Tombol varian="kedua" onClick={() => setDaftar((s) => [...s, ""])}>
              + Juri
            </Tombol>
            <Tombol disabled={!valid || tx.sedang} onClick={() => tx.kirim("tetapkanJuri", [id, bersih], "Juri berhasil ditetapkan.")}>
              Tetapkan Juri
            </Tombol>
          </div>
          {bersih.length > 0 && bersih.length < kuorum && <p className="text-sm text-rose-600">Jumlah juri harus ≥ kuorum ({kuorum}).</p>}
          <PesanTx tx={tx} />
        </div>
      ) : (
        <p className="text-sm text-slate-500">Juri tidak ditetapkan.</p>
      )}
    </div>
  );
}

function DaftarkanPeserta({ id, bisa }: { id: bigint; bisa: boolean }) {
  const [akun, setAkun] = useState("");
  const tx = useTx();
  return (
    <div>
      <h3 className="mb-2 font-semibold">2. Daftarkan peserta</h3>
      {bisa ? (
        <>
          <div className="flex flex-wrap gap-2">
            <input className={`${kelasInput} min-w-72 flex-1`} value={akun} placeholder="Alamat peserta (0x...)" onChange={(e) => setAkun(e.target.value.trim())} />
            <Tombol
              disabled={!isAddress(akun) || tx.sedang}
              onClick={async () => {
                if (await tx.kirim("daftarkanPeserta", [id, akun], `Peserta ${akun.slice(0, 8)}… terdaftar.`)) setAkun("");
              }}
            >
              Daftarkan
            </Tombol>
          </div>
          <p className="mt-1 text-xs text-slate-500">Bisa sampai batas pendaftaran. Peserta tidak boleh juri atau panitia lomba ini.</p>
          <div className="mt-2">
            <PesanTx tx={tx} />
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Pendaftaran peserta sudah ditutup.</p>
      )}
    </div>
  );
}

function BukaPendaftaran({ id, siap }: { id: bigint; siap: boolean }) {
  const tx = useTx();
  return (
    <div>
      <h3 className="mb-2 font-semibold">3. Buka pendaftaran</h3>
      <p className="mb-2 text-sm text-slate-600">Setelah dibuka, juri, kriteria, bobot, tenggat, dan kuorum terkunci permanen.</p>
      <Tombol disabled={!siap || tx.sedang} onClick={() => tx.kirim("bukaPendaftaran", [id], "Pendaftaran dibuka.")}>
        Buka Pendaftaran
      </Tombol>
      {!siap && <span className="ml-3 text-sm text-slate-500">Tetapkan juri dulu.</span>}
      <div className="mt-2">
        <PesanTx tx={tx} />
      </div>
    </div>
  );
}
