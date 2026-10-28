// Formatação pt-BR, BRL e fuso America/Sao_Paulo.
export const TZ = "America/Sao_Paulo";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function formatBRL(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  return brl.format(n);
}

export function formatNumber(v: number | string | null | undefined, maxFrac = 3): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: maxFrac }).format(n);
}

/** Data de calendário (YYYY-MM-DD) exibida sem conversão de fuso. */
export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.slice(0, 10));
  if (m && d.length <= 10) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short" }).format(new Date(d));
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(d));
}

/** Data local de São Paulo (YYYY-MM-DD) para um instante. */
export function spDate(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function firstDayOfMonth(isoDate: string, monthsBack = 0): string {
  const [y, m] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 - monthsBack, 1));
  return dt.toISOString().slice(0, 10);
}

/** Converte texto pt-BR ("1.234,5") em número. Retorna null para vazio e NaN para inválido. */
export function parseDecimal(input: string): number | null {
  const t = input.trim();
  if (t === "") return null;
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  if (!/^-?\d+(\.\d+)?$/.test(norm)) return Number.NaN;
  return Number(norm);
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}
