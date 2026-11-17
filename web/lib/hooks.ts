"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useConnection, usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { Address, Hex, TransactionReceipt, ContractFunctionName } from "viem";
import { ALAMAT_KONTRAK, ALAMAT_VALID, CHAIN, kontrak } from "./config";
import { jurichainAbi } from "./jurichainAbi";
import { pesanError } from "./errors";

const SEGAR = { refetchInterval: 4000 } as const;

// ---------------------------------------------------------------------------
// Data lomba
// ---------------------------------------------------------------------------
export type Lomba = {
  id: bigint;
  nama: string;
  hashPanduan: Hex;
  panitia: Address;
  batasDaftar: bigint;
  batasCommit: bigint;
  batasReveal: bigint;
  kuorum: number;
  jumlahKarya: bigint;
  status: number;
};

type TupelLomba = readonly [bigint, string, Hex, Address, bigint, bigint, bigint, number, bigint, number];

function keLomba(r: TupelLomba): Lomba {
  const [id, nama, hashPanduan, panitia, batasDaftar, batasCommit, batasReveal, kuorum, jumlahKarya, status] = r;
  return { id, nama, hashPanduan, panitia, batasDaftar, batasCommit, batasReveal, kuorum, jumlahKarya, status };
}

/** Semua lomba (1..jumlahLomba). */
export function useDaftarLomba() {
  const jumlah = useReadContract({ ...kontrak, functionName: "jumlahLomba", query: { enabled: ALAMAT_VALID, ...SEGAR } });
  const n = Number(jumlah.data ?? 0n);
  const list = useReadContracts({
    allowFailure: false,
    contracts: Array.from({ length: n }, (_, i) => ({
      ...kontrak,
      functionName: "daftarLomba" as const,
      args: [BigInt(i + 1)] as const,
    })),
    query: { enabled: n > 0, ...SEGAR },
  });
  return {
    lomba: (list.data ?? []).map((r) => keLomba(r as TupelLomba)),
    memuat: jumlah.isLoading || list.isLoading,
    error: jumlah.error ?? list.error,
  };
}

/** Satu lomba + kriteria + juri. */
export function useLomba(id?: bigint) {
  const aktif = ALAMAT_VALID && !!id;
  const l = useReadContract({ ...kontrak, functionName: "daftarLomba", args: [id ?? 0n], query: { enabled: aktif, ...SEGAR } });
  const k = useReadContract({ ...kontrak, functionName: "getKriteria", args: [id ?? 0n], query: { enabled: aktif } });
  const j = useReadContract({ ...kontrak, functionName: "getJuri", args: [id ?? 0n], query: { enabled: aktif, ...SEGAR } });
  const lomba = l.data && l.data[0] !== 0n ? keLomba(l.data as TupelLomba) : undefined;
  return {
    lomba,
    kriteria: (k.data?.[0] ?? []) as readonly string[],
    bobot: (k.data?.[1] ?? []) as readonly number[],
    juri: (j.data ?? []) as readonly Address[],
    memuat: l.isLoading,
  };
}

/** Peran akun yang terhubung untuk lomba tertentu. */
export function usePeran(id?: bigint) {
  const { address } = useConnection();
  const akun = address ?? "0x0000000000000000000000000000000000000000";
  const aktif = ALAMAT_VALID && !!address;
  const r = useReadContracts({
    allowFailure: false,
    contracts: [
      { ...kontrak, functionName: "admin" },
      { ...kontrak, functionName: "isPanitia", args: [akun] },
      { ...kontrak, functionName: "isJuri", args: [id ?? 0n, akun] },
      { ...kontrak, functionName: "isPeserta", args: [id ?? 0n, akun] },
    ],
    query: { enabled: aktif, ...SEGAR },
  });
  const { lomba } = useLomba(id);
  const [admin, panitiaGlobal, juri, peserta] = r.data ?? [];
  const sama = (a?: string) => !!address && !!a && a.toLowerCase() === address.toLowerCase();
  return {
    address,
    isAdmin: sama(admin as Address | undefined),
    isPanitiaGlobal: !!panitiaGlobal,
    isPanitiaLomba: sama(lomba?.panitia),
    isJuri: !!juri,
    isPeserta: !!peserta,
    memuat: r.isLoading,
  };
}

// ---------------------------------------------------------------------------
// Kirim transaksi: simulasi dulu (agar custom error terbaca), lalu tulis & tunggu receipt
// ---------------------------------------------------------------------------
type FungsiTulis = ContractFunctionName<typeof jurichainAbi, "nonpayable">;

export type StatusTx = { sedang: boolean; pesan?: string; error?: string; hash?: Hex };

export function useTx() {
  const publicClient = usePublicClient({ chainId: CHAIN.id });
  const { address, chainId } = useConnection();
  const { mutateAsync } = useWriteContract();
  const qc = useQueryClient();
  const [st, setSt] = useState<StatusTx>({ sedang: false });

  async function kirim(
    functionName: FungsiTulis,
    args: readonly unknown[],
    pesanSukses = "Transaksi berhasil.",
  ): Promise<TransactionReceipt | null> {
    setSt({ sedang: true, pesan: "Memeriksa transaksi..." });
    try {
      if (!ALAMAT_VALID) throw new Error("Alamat kontrak belum diatur (NEXT_PUBLIC_JURICHAIN_ADDRESS).");
      if (!address) throw new Error("Hubungkan dompet terlebih dahulu.");
      if (chainId !== CHAIN.id) throw new Error(`Jaringan dompet salah. Ganti ke ${CHAIN.name} (chainId ${CHAIN.id}).`);
      if (!publicClient) throw new Error("Koneksi RPC belum siap.");

      const params = { address: ALAMAT_KONTRAK, abi: jurichainAbi, functionName, args } as never;
      await publicClient.simulateContract({ ...(params as object), account: address } as never);

      setSt({ sedang: true, pesan: "Silakan konfirmasi transaksi di MetaMask..." });
      const hash = await mutateAsync({ ...(params as object), chainId: CHAIN.id } as never);

      setSt({ sedang: true, pesan: "Transaksi terkirim, menunggu masuk blok...", hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaksi gagal (reverted) di jaringan.");

      await qc.invalidateQueries();
      setSt({ sedang: false, pesan: pesanSukses, hash });
      return receipt;
    } catch (e) {
      console.error(e);
      setSt({ sedang: false, error: pesanError(e) });
      return null;
    }
  }

  return { ...st, kirim, reset: () => setSt({ sedang: false }) };
}

// ---------------------------------------------------------------------------
// Utilitas UI
// ---------------------------------------------------------------------------
/** Waktu sekarang (detik), diperbarui tiap detik. null saat render server. */
export function useSekarang() {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setT(Math.floor(Date.now() / 1000));
    const awal = setTimeout(tick, 0);
    const i = setInterval(tick, 1000);
    return () => {
      clearTimeout(awal);
      clearInterval(i);
    };
  }, []);
  return t;
}

/** Lomba terpilih, disimpan di localStorage agar sama di semua halaman. */
const KUNCI_LOMBA = "jurichain:lombaTerpilih";
const pendengar = new Set<() => void>();
function langganan(cb: () => void) {
  pendengar.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    pendengar.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function bacaLomba() {
  try {
    return localStorage.getItem(KUNCI_LOMBA) ?? "";
  } catch {
    return "";
  }
}
export function useLombaTerpilih(): [bigint | undefined, (id: bigint) => void] {
  const v = useSyncExternalStore(langganan, bacaLomba, () => "");
  const set = (id: bigint) => {
    try {
      localStorage.setItem(KUNCI_LOMBA, id.toString());
    } catch {
      /* abaikan */
    }
    pendengar.forEach((f) => f());
  };
  return [/^\d+$/.test(v) && v !== "0" ? BigInt(v) : undefined, set];
}

/** Unduh objek sebagai berkas JSON. */
export function unduhJson(namaBerkas: string, isi: unknown) {
  const blob = new Blob([JSON.stringify(isi, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = namaBerkas;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
