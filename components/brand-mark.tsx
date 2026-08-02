import { Activity, ShieldCheck } from "lucide-react";

export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`relative grid size-9 place-items-center rounded-[11px] ${
          inverted ? "bg-white text-brand-700" : "bg-brand-700 text-white"
        }`}
      >
        <ShieldCheck className="size-5" strokeWidth={2.2} />
        <Activity className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-brand-200 p-0.5 text-brand-800" />
      </span>
      <span className={inverted ? "text-white" : "text-ink-strong"}>
        <span className="block text-[15px] font-bold leading-4 tracking-[-0.02em]">
          Aegis Health
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
            inverted ? "text-brand-200" : "text-ink-muted"
          }`}
        >
          Patient-owned care
        </span>
      </span>
    </span>
  );
}
