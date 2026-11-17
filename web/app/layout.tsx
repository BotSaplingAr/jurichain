import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "JuriChain — Penjurian Lomba Transparan",
  description: "Prototipe DApp penjurian lomba commit-reveal di Base Sepolia (UTS CTJ483 Kelompok 3)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <Providers>
          <Suspense fallback={<div className="h-14 border-b border-slate-200 bg-white" />}>
            <Navbar />
          </Suspense>
          <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">{children}</main>
          <footer className="py-4 text-center text-xs text-slate-400">JuriChain · Prototipe UTS CTJ483 Kelompok 3</footer>
        </Providers>
      </body>
    </html>
  );
}
