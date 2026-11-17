// Helper commit-reveal & hash karya untuk frontend JuriChain (Next.js + viem).
// Encoding HARUS sama dengan JuriChain.hitungHashNilai():
//   keccak256(abi.encode(uint256 idLomba, uint256 idKarya, uint8[] nilai, bytes32 salt, address juri))

import { encodeAbiParameters, keccak256, toHex, type Address, type Hex } from "viem";

/** Salt acak 32 byte dibuat di browser juri. */
export function buatSalt(): Hex {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** Hash yang dikirim lewat commitNilai(). */
export function hitungHashNilai(
  idLomba: bigint,
  idKarya: bigint,
  nilai: number[],
  salt: Hex,
  juri: Address,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint8[]" },
        { type: "bytes32" },
        { type: "address" },
      ],
      [idLomba, idKarya, nilai, salt, juri],
    ),
  );
}

/** Berkas "kunci reveal" yang diunduh juri setelah commit; diunggah lagi saat reveal. */
export type KunciReveal = {
  idLomba: string;
  idKarya: string;
  nilai: number[];
  salt: Hex;
  juri: Address;
};

export function unduhKunciReveal(k: KunciReveal) {
  const blob = new Blob([JSON.stringify(k, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `kunci-reveal_lomba${k.idLomba}_karya${k.idKarya}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function bacaKunciReveal(file: File): Promise<KunciReveal> {
  return JSON.parse(await file.text()) as KunciReveal;
}

/**
 * Salted hash berkas karya (dipakai di kumpulkanKarya).
 * hash = keccak256(saltKarya || isi berkas). Simpan saltKarya agar nanti
 * siapa pun bisa mencocokkan berkas pemenang dengan hash on-chain.
 */
export async function hitungHashKarya(file: File, saltKarya: Hex): Promise<Hex> {
  const isi = new Uint8Array(await file.arrayBuffer());
  const salt = hexKeBytes(saltKarya);
  const gabung = new Uint8Array(salt.length + isi.length);
  gabung.set(salt, 0);
  gabung.set(isi, salt.length);
  return keccak256(gabung);
}

/** Hash dokumen panduan (dipakai di buatLomba). */
export async function hitungHashPanduan(file: File): Promise<Hex> {
  return keccak256(new Uint8Array(await file.arrayBuffer()));
}

function hexKeBytes(h: Hex): Uint8Array {
  const s = h.slice(2);
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/*
Contoh pemakaian dengan wagmi:

  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // COMMIT
  const salt = buatSalt();
  const hash = hitungHashNilai(1n, 2n, [80, 75, 90], salt, address!);
  await writeContractAsync({ address: JURICHAIN, abi, functionName: "commitNilai", args: [1n, 2n, hash] });
  unduhKunciReveal({ idLomba: "1", idKarya: "2", nilai: [80, 75, 90], salt, juri: address! });

  // REVEAL
  const k = await bacaKunciReveal(fileDariInput);
  await writeContractAsync({
    address: JURICHAIN, abi, functionName: "revealNilai",
    args: [BigInt(k.idLomba), BigInt(k.idKarya), k.nilai, k.salt],
  });
*/
