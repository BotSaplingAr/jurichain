"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { ALAMAT_VALID, CHAIN } from "@/lib/config";
import { singkat } from "@/lib/status";
import { pesanError } from "@/lib/errors";
import { Tombol } from "./ui";

const MENU = [
  { href: "/", label: "Beranda" },
  { href: "/panitia", label: "Panitia" },
  { href: "/peserta", label: "Peserta" },
  { href: "/juri", label: "Juri" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-lg font-bold text-indigo-700">
            ⚖️ JuriChain
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {MENU.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className={`rounded-md px-3 py-1.5 ${path === m.href ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {m.label}
              </Link>
            ))}
          </nav>
        </div>
        <HubungkanDompet />
      </div>
      <PeringatanJaringan />
    </header>
  );
}

function HubungkanDompet() {
  const { address, isConnected } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700" title={address}>
          {singkat(address)}
        </span>
        <Tombol varian="kedua" onClick={() => disconnect.mutate()}>
          Putuskan
        </Tombol>
      </div>
    );
  }
  const injected = connectors[0];
  return (
    <div className="flex flex-col items-end gap-1">
      <Tombol
        disabled={!injected || connect.isPending}
        onClick={() => injected && connect.mutate({ connector: injected, chainId: CHAIN.id })}
      >
        {connect.isPending ? "Menghubungkan..." : "Hubungkan MetaMask"}
      </Tombol>
      {connect.error && <span className="text-xs text-rose-600">{pesanError(connect.error)}</span>}
    </div>
  );
}

function PeringatanJaringan() {
  const { isConnected, chainId } = useConnection();
  const sw = useSwitchChain();
  if (!ALAMAT_VALID) {
    return (
      <div className="bg-rose-50 px-4 py-2 text-center text-sm text-rose-800">
        Alamat kontrak belum diatur. Isi <code>NEXT_PUBLIC_JURICHAIN_ADDRESS</code> di <code>web/.env.local</code> lalu restart{" "}
        <code>npm run dev</code>.
      </div>
    );
  }
  if (!isConnected || chainId === CHAIN.id) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      Dompet terhubung ke jaringan lain. Aplikasi ini memakai <b>{CHAIN.name}</b> (chainId {CHAIN.id}).
      <Tombol varian="kedua" onClick={() => sw.mutate({ chainId: CHAIN.id })} disabled={sw.isPending}>
        Ganti jaringan
      </Tombol>
      {sw.error && <span className="text-rose-700">{pesanError(sw.error)}</span>}
    </div>
  );
}
