import { Suspense } from "react";
import HasilLomba from "./HasilLomba";

export default function HalamanHasil() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat...</p>}>
      <HasilLomba />
    </Suspense>
  );
}
