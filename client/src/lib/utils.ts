import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Valor em dollars do jogo (ex.: venda NPC) — formatação legível PT */
export function formatNpcDollars(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) {
    const kk = value / 1_000_000;
    const rounded = Math.round(kk * 100) / 100;
    return rounded % 1 === 0 ? `${rounded} KK` : `${rounded.toFixed(2)} KK`;
  }
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

/** Remove máscara monetária textual e devolve inteiro >= 0. */
export function parseMaskedMoneyToInt(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Formata inteiro em máscara monetária pt-BR (sem símbolo). */
export function formatMoneyInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    value,
  );
}
