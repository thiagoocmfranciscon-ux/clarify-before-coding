export type WoItem = { kind: "peca" | "servico"; description: string; code: string; qty: number; unit: number };

export const itemTotal = (i: WoItem) => Math.round(i.qty * i.unit * 100) / 100;

/** Subtotal de peças, serviços (linhas de serviço + valor avulso) e total geral. */
export function woTotals(items: WoItem[], servicesExtra = 0) {
  const parts = items.filter((i) => i.kind === "peca").reduce((s, i) => s + itemTotal(i), 0);
  const services = items.filter((i) => i.kind === "servico").reduce((s, i) => s + itemTotal(i), 0) + (servicesExtra || 0);
  const r = (n: number) => Math.round(n * 100) / 100;
  return { parts: r(parts), services: r(services), total: r(parts + services) };
}
