import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, ErrorState, LoadingRows, PageHeader, Stat, EmptyState } from "@/components/kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/use-membership";
import { formatBRL, formatDateTime, firstDayOfMonth, spDate } from "@/lib/format";
import { PERM, WO_STATUS_LABEL, type WoStatus } from "@/lib/domain";

const search = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Dashboard — Empilha Nobre" }, { name: "description", content: "Indicadores operacionais." }, { property: "og:title", content: "Dashboard — Empilha Nobre" }, { property: "og:description", content: "Indicadores operacionais." }] }),
  component: Dashboard,
});

type Kpis = {
  open_wo: number; late_wo: number; tech_in_service: number; tech_active: number;
  veh_in_use: number | null; veh_available: number | null; veh_maintenance: number | null;
  parts_alert: number | null; parts_zero: number | null;
  status_dist: Partial<Record<WoStatus, number>>;
  costs: { parts: number; labor: number; expenses: number; fleet: number } | null;
  monthly: { month: string; closed: number; cost: number | null }[];
  generated_at: string;
};

function Dashboard() {
  const me = useMe();
  const sp = Route.useSearch();
  const navigate = Route.useNavigate();
  const today = spDate();
  const from = sp.from ?? firstDayOfMonth(today, 5);
  const to = sp.to ?? today;
  const q = useQuery({
    queryKey: ["dashboard", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_kpis", { p_from: from, p_to: to });
      if (error) throw error;
      return data as unknown as Kpis;
    },
  });

  return (
    <>
      <PageHeader title="Dashboard" description={q.data ? `Atualizado em ${formatDateTime(q.data.generated_at)}` : "Indicadores calculados a partir dos registros"}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div><Label htmlFor="from" className="text-xs">De</Label><Input id="from" type="date" className="h-11" value={from} max={to} onChange={(e) => e.target.value && navigate({ search: { from: e.target.value, to } })} /></div>
            <div><Label htmlFor="to" className="text-xs">Até</Label><Input id="to" type="date" className="h-11" value={to} min={from} onChange={(e) => e.target.value && navigate({ search: { from, to: e.target.value } })} /></div>
          </div>
        } />
      {q.isPending ? <LoadingRows rows={4} /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/os" search={{ open: true }} className="rounded-lg focus-visible:outline-2"><Stat label="OS em aberto" value={q.data.open_wo} help="Aberta, em diagnóstico, aguardando peça, em andamento e concluída tecnicamente (pendente de aprovação). Exclui encerradas e canceladas. Estado atual, não filtrado pelo período." /></Link>
            <Link to="/os" search={{ late: true }} className="rounded-lg"><Stat label="OS atrasadas" value={q.data.late_wo} tone={q.data.late_wo > 0 ? "danger" : undefined} help="OS pendentes com prazo anterior à data de hoje em São Paulo." /></Link>
            <Stat label="Técnicos em serviço" value={`${q.data.tech_in_service} / ${q.data.tech_active}`} help="Técnicos com status 'Em serviço' sobre técnicos ativos no cadastro. Não é um índice de produtividade." />
            {q.data.parts_alert !== null && <Link to="/estoque" search={{ alert: "alerta" }} className="rounded-lg"><Stat label="Peças em alerta" value={q.data.parts_alert} tone={q.data.parts_alert ? "warning" : undefined} help={`Peças com saldo zero (${q.data.parts_zero}) ou menor/igual ao mínimo, sem dupla contagem.`} /></Link>}
            {q.data.veh_in_use !== null && <Stat label="Veículos em uso" value={q.data.veh_in_use} help={`Status 'Em uso'. Disponíveis: ${q.data.veh_available}; em manutenção: ${q.data.veh_maintenance}.`} />}
            {q.data.costs && (
              <>
                <Stat label="Custo de execução no período" value={formatBRL(q.data.costs.parts + q.data.costs.labor + q.data.costs.expenses)}
                  help="Peças consumidas em OS (custo médio gravado no movimento, menos devoluções) + mão de obra apontada (hora × custo/hora vigente no apontamento) + despesas de OS. Competência: data do movimento, início do apontamento e data da despesa, em São Paulo." />
                <Stat label="Peças / Mão de obra / Despesas" value={<span className="text-base">{formatBRL(q.data.costs.parts)} · {formatBRL(q.data.costs.labor)} · {formatBRL(q.data.costs.expenses)}</span>} />
                <Stat label="Custos de frota no período" value={formatBRL(q.data.costs.fleet)} help="Soma das despesas de veículos pela data da despesa." />
              </>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-semibold">OS por status (atual)</h2>
              <StatusChart dist={q.data.status_dist} />
            </Card>
            <Card>
              <h2 className="font-semibold">OS encerradas por mês</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={q.data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} />
                  <RTooltip formatter={(v: number) => [v, "Encerradas"]} />
                  <Bar dataKey="closed" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            {PERM.seeCosts(me.role) && (
              <Card className="lg:col-span-2">
                <h2 className="font-semibold">Custos de execução por mês (R$)</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={q.data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} tickFormatter={(v) => formatBRL(v)} width={90} />
                    <RTooltip formatter={(v: number) => [formatBRL(v), "Custo"]} />
                    <Line type="monotone" dataKey="cost" stroke="var(--color-chart-1)" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>
          <Card>
            <h2 className="font-semibold">Rastreamento de veículos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Integração não configurada. Nenhuma localização é exibida.</p>
          </Card>
        </div>
      )}
    </>
  );
}

function StatusChart({ dist }: { dist: Partial<Record<WoStatus, number>> }) {
  const data = (Object.keys(WO_STATUS_LABEL) as WoStatus[]).map((s) => ({ status: WO_STATUS_LABEL[s], total: dist[s] ?? 0 }));
  if (data.every((d) => d.total === 0)) return <div className="mt-4"><EmptyState title="Nenhuma OS registrada" /></div>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="status" width={140} fontSize={12} />
        <RTooltip /><Bar dataKey="total" name="OS" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
