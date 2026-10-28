import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, Field, NoPermission, PageHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-membership";
import { PERM, STOCK_ALERT_LABEL, WO_STATUS_LABEL, WO_TYPE_LABEL, stockAlert } from "@/lib/domain";
import { addDays, firstDayOfMonth, spDate } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { exportPdf, exportXlsx, type Column } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Empilha Nobre" }, { name: "description", content: "Relatórios em PDF e Excel." }, { property: "og:title", content: "Relatórios — Empilha Nobre" }, { property: "og:description", content: "Relatórios em PDF e Excel." }] }),
  component: Page,
});

type Report = { kind: string; title: string; desc: string; load: (from: string, to: string) => Promise<{ cols: Column[]; rows: Record<string, unknown>[] }> };

const REPORTS: Report[] = [
  {
    kind: "ordens_servico", title: "Ordens de serviço", desc: "OS abertas no período, com status, cliente e equipamento.",
    load: async (from, to) => {
      const { data, error } = await supabase.from("work_orders").select("number, status, type, opened_at, closed_at, due_date, customers(legal_name), equipment(serial, model)").gte("opened_at", `${from}T03:00:00Z`).lt("opened_at", `${addDays(to, 1)}T03:00:00Z`).order("opened_at");
      if (error) throw error;
      return { cols: [{ header: "OS", key: "n" }, { header: "Status", key: "s" }, { header: "Tipo", key: "t" }, { header: "Cliente", key: "c" }, { header: "Equipamento", key: "e" }, { header: "Abertura", key: "o", type: "date" }, { header: "Encerramento", key: "f", type: "date" }],
        rows: data.map((w) => ({ n: w.number, s: WO_STATUS_LABEL[w.status], t: WO_TYPE_LABEL[w.type], c: w.customers?.legal_name, e: `${w.equipment?.serial} ${w.equipment?.model}`, o: w.opened_at, f: w.closed_at })) };
    },
  },
  {
    kind: "manutencoes_custos", title: "Manutenções e custos", desc: "OS encerradas no período com custo de peças, mão de obra e despesas.",
    load: async (from, to) => {
      const { data, error } = await supabase.from("work_orders").select("id, number, type, closed_at, customers(legal_name), equipment(serial)").eq("status", "encerrada").gte("closed_at", `${from}T03:00:00Z`).lt("closed_at", `${addDays(to, 1)}T03:00:00Z`).order("closed_at");
      if (error) throw error;
      const rows = await Promise.all(data.map(async (w) => { const c = (await supabase.rpc("wo_costs", { p_wo: w.id })).data as { parts: number; labor: number; expenses: number; total: number } | null; return { n: w.number, t: WO_TYPE_LABEL[w.type], c: w.customers?.legal_name, e: w.equipment?.serial, d: w.closed_at, p: c?.parts, l: c?.labor, x: c?.expenses, tt: c?.total }; }));
      return { cols: [{ header: "OS", key: "n" }, { header: "Tipo", key: "t" }, { header: "Cliente", key: "c" }, { header: "Série", key: "e" }, { header: "Encerrada", key: "d", type: "date" }, { header: "Peças", key: "p", type: "money" }, { header: "Mão de obra", key: "l", type: "money" }, { header: "Despesas", key: "x", type: "money" }, { header: "Total", key: "tt", type: "money" }], rows };
    },
  },
  {
    kind: "estoque", title: "Posição de estoque", desc: "Saldo atual, mínimo, custo médio e alerta de cada peça.",
    load: async () => {
      const { data, error } = await supabase.from("parts").select("code, description, min_qty, units(code), stock_balances(qty, avg_cost)").is("archived_at", null).order("code");
      if (error) throw error;
      return { cols: [{ header: "Código", key: "c" }, { header: "Descrição", key: "d" }, { header: "Un.", key: "u" }, { header: "Saldo", key: "q", type: "number" }, { header: "Mínimo", key: "m", type: "number" }, { header: "Custo médio", key: "a", type: "money" }, { header: "Valor", key: "v", type: "money" }, { header: "Alerta", key: "al" }],
        rows: data.map((p) => { const b = (Array.isArray(p.stock_balances) ? p.stock_balances[0] : p.stock_balances) as { qty: number; avg_cost: number } | null; const q = Number(b?.qty ?? 0); return { c: p.code, d: p.description, u: p.units?.code, q, m: p.min_qty, a: b?.avg_cost ?? 0, v: q * Number(b?.avg_cost ?? 0), al: STOCK_ALERT_LABEL[stockAlert(q, Number(p.min_qty))] }; }) };
    },
  },
  {
    kind: "frotas", title: "Frotas — despesas", desc: "Despesas dos veículos no período.",
    load: async (from, to) => {
      const { data, error } = await supabase.from("vehicle_expenses").select("expense_date, category, amount, description, vehicles(plate, model)").gte("expense_date", from).lte("expense_date", to).order("expense_date");
      if (error) throw error;
      return { cols: [{ header: "Data", key: "d", type: "date" }, { header: "Placa", key: "p" }, { header: "Modelo", key: "m" }, { header: "Categoria", key: "c" }, { header: "Valor", key: "v", type: "money" }, { header: "Descrição", key: "x" }],
        rows: data.map((e) => ({ d: e.expense_date, p: e.vehicles?.plate, m: e.vehicles?.model, c: e.category, v: e.amount, x: e.description })) };
    },
  },
];

function Page() {
  const me = useMe(); const today = spDate();
  const [from, setFrom] = useState(firstDayOfMonth(today)); const [to, setTo] = useState(today); const [busy, setBusy] = useState<string | null>(null);
  if (!PERM.export(me.role)) return <NoPermission />;
  async function run(r: Report, fmt: "pdf" | "xlsx") {
    if (from > to) { toast.error("Período inválido"); return; }
    setBusy(r.kind + fmt);
    try {
      const { cols, rows } = await r.load(from, to); const params = { from, to };
      if (fmt === "xlsx") await exportXlsx(r.kind, r.title, cols, rows, params); else await exportPdf(r.kind, r.title, cols, rows, params, `Período: ${from.split("-").reverse().join("/")} a ${to.split("-").reverse().join("/")}`);
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(null); }
  }
  return (
    <>
      <PageHeader title="Relatórios" description="Exportações ficam registradas na auditoria." />
      <div className="mb-4 flex flex-wrap gap-3">
        <Field id="rf" label="De"><Input id="rf" type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field id="rt" label="Até"><Input id="rt" type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.kind}>
            <h2 className="font-semibold">{r.title}</h2><p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="min-h-11" disabled={!!busy} onClick={() => run(r, "pdf")}><FileDown className="mr-1 h-4 w-4" />{busy === r.kind + "pdf" ? "Gerando…" : "PDF"}</Button>
              <Button variant="outline" className="min-h-11" disabled={!!busy} onClick={() => run(r, "xlsx")}><FileSpreadsheet className="mr-1 h-4 w-4" />{busy === r.kind + "xlsx" ? "Gerando…" : "Excel"}</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
