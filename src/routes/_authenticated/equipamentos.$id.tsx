import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, ErrorState, LoadingRows, PageHeader, Pill } from "@/components/kit";
import { GenericStatus, WoStatusBadge } from "@/components/status";
import { ArchivedToggle, CrudDialog, Table, td, useArchive, type FieldDef } from "@/components/crud";
import { equipmentFields } from "@/components/fields";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { NewWorkOrderDialog } from "@/components/wo-new";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-membership";
import { PERM, WO_TYPE_LABEL, maintenanceDue } from "@/lib/domain";
import { formatDate, formatDateTime, formatNumber, parseDecimal, spDate } from "@/lib/format";
import { friendlyError } from "@/lib/errors";

const planFields: FieldDef[] = [
  { key: "name", label: "Nome do plano", required: true, hint: "Ex.: Revisão 250 h" },
  { key: "interval_days", label: "Intervalo (dias)", type: "number" },
  { key: "interval_hours", label: "Intervalo (horas)", type: "number" },
  { key: "last_done_date", label: "Última execução (data)", type: "date" },
  { key: "last_done_hours", label: "Última execução (horímetro)", type: "number" },
];

export const Route = createFileRoute("/_authenticated/equipamentos/$id")({
  head: () => ({ meta: [{ title: "Equipamento — Empilha Nobre" }, { name: "description", content: "Histórico e planos do equipamento." }, { property: "og:title", content: "Equipamento — Empilha Nobre" }, { property: "og:description", content: "Histórico e planos do equipamento." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams(); const me = useMe(); const mgr = PERM.manage(me.role); const qc = useQueryClient();
  const [edit, setEdit] = useState(false); const [plan, setPlan] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [newWo, setNewWo] = useState(false); const [reading, setReading] = useState("");
  const q = useQuery({
    queryKey: ["equipment-detail", id],
    queryFn: async () => {
      const [e, p, w, r] = await Promise.all([
        supabase.from("equipment").select("*, customers(id, legal_name)").eq("id", id).single(),
        supabase.from("maintenance_plans").select("*").eq("equipment_id", id).order("name"),
        supabase.from("work_orders").select("id, number, type, status, opened_at, description").eq("equipment_id", id).order("opened_at", { ascending: false }).limit(50),
        supabase.from("equipment_readings").select("id, value, read_at, is_correction, note").eq("equipment_id", id).order("read_at", { ascending: false }).limit(20),
      ]);
      if (e.error) throw e.error;
      return { e: e.data, plans: p.data ?? [], wos: w.data ?? [], readings: r.data ?? [] };
    },
  });
  const arch = useArchive("equipment", [["equipment-detail", id], ["equipment"]]);
  const archPlan = useArchive("maintenance_plans", [["equipment-detail", id]]);
  const [showArch, setShowArch] = useState(false);
  const addReading = useMutation({
    mutationFn: async () => {
      const v = parseDecimal(reading); if (v === null || Number.isNaN(v) || v < 0) throw new Error("Horímetro inválido");
      const cur = q.data?.e.hour_meter; const correction = cur !== null && cur !== undefined && v < Number(cur);
      const { error } = await supabase.from("equipment_readings").insert({ organization_id: me.organizationId, equipment_id: id, value: v, read_at: new Date().toISOString(), is_correction: correction, note: correction ? "Correção manual" : null, created_by: me.userId });
      if (error) throw error;
    },
    onSuccess: () => { setReading(""); qc.invalidateQueries({ queryKey: ["equipment-detail", id] }); toast.success("Leitura registrada"); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  if (q.isPending) return <LoadingRows />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { e, plans, wos, readings } = q.data; const today = spDate();
  return (
    <>
      <PageHeader title={`${e.manufacturer} ${e.model}`} description={`Série ${e.serial} · ${e.type}`}
        actions={<>
          {mgr && <Button className="min-h-11" onClick={() => setNewWo(true)}><Plus className="mr-1 h-4 w-4" />Abrir OS</Button>}
          {mgr && <Button variant="outline" className="min-h-11" onClick={() => setEdit(true)}>Editar</Button>}
          {mgr && <Button variant="outline" className="min-h-11" onClick={() => arch.mutate({ row: e, archive: !e.archived_at, userId: me.userId })}>{e.archived_at ? "Restaurar" : "Arquivar"}</Button>}
        </>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-semibold">Dados</h2>
          <div className="space-y-1 text-sm">
            <div>Cliente: {e.customers && <Link to="/clientes/$id" params={{ id: e.customers.id }} className="text-primary hover:underline">{e.customers.legal_name}</Link>}</div>
            <div>Situação: <GenericStatus value={e.status} archived={!!e.archived_at} /></div>
            <div>Horímetro: <strong>{e.hour_meter !== null ? `${formatNumber(e.hour_meter)} h` : "—"}</strong> <span className="text-muted-foreground">({formatDateTime(e.hour_meter_at)})</span></div>
          </div>
          {mgr && <form className="mt-3 flex gap-2" onSubmit={(ev) => { ev.preventDefault(); addReading.mutate(); }}>
            <Input className="h-11" inputMode="decimal" placeholder="Nova leitura (h)" value={reading} onChange={(ev) => setReading(ev.target.value)} aria-label="Nova leitura do horímetro" />
            <Button type="submit" className="min-h-11" disabled={addReading.isPending}>Registrar</Button>
          </form>}
          {!!readings.length && <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{readings.slice(0, 6).map((r) => <li key={r.id}>{formatDateTime(r.read_at)} — {formatNumber(r.value)} h {r.is_correction && <Pill tone="warning">correção</Pill>}</li>)}</ul>}
        </Card>
        <Card className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Planos de manutenção</h2><div className="flex gap-2"><ArchivedToggle value={showArch} onChange={setShowArch} />{mgr && <Button size="sm" variant="outline" onClick={() => setPlan(null)}><Plus className="mr-1 h-4 w-4" />Plano</Button>}</div></div>
          {!plans.filter((p) => showArch ? !!p.archived_at : !p.archived_at).length ? <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p> : (
            <ul className="divide-y text-sm">{plans.filter((p) => showArch ? !!p.archived_at : !p.archived_at).map((p) => {
              const d = maintenanceDue({ ...p, interval_hours: p.interval_hours === null ? null : Number(p.interval_hours), last_done_hours: p.last_done_hours === null ? null : Number(p.last_done_hours) }, e.hour_meter === null ? null : Number(e.hour_meter), today);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div><span className="font-medium">{p.name}</span> {d.overdue ? <Pill tone="danger">Vencido</Pill> : d.neverDone ? <Pill tone="warning">Nunca executado</Pill> : <Pill tone="success">Em dia</Pill>}
                    <div className="text-muted-foreground">{[p.interval_days && `a cada ${p.interval_days} dias`, p.interval_hours && `a cada ${formatNumber(p.interval_hours)} h`].filter(Boolean).join(" ou ")} · próxima: {[d.nextDate && formatDate(d.nextDate), d.nextHours !== null && `${formatNumber(d.nextHours)} h`].filter(Boolean).join(" / ") || "—"}</div></div>
                  {mgr && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setPlan(p)}>Editar</Button><Button size="sm" variant="ghost" onClick={() => archPlan.mutate({ row: p, archive: !p.archived_at, userId: me.userId })}>{p.archived_at ? "Restaurar" : "Arquivar"}</Button></div>}
                </li>
              );
            })}</ul>
          )}
        </Card>
      </div>
      <h2 className="mb-2 mt-6 text-lg font-semibold">Histórico de OS</h2>
      {!wos.length ? <p className="text-sm text-muted-foreground">Nenhuma OS.</p> : (
        <Table head={["OS", "Tipo", "Abertura", "Status"]}>
          {wos.map((w) => <tr key={w.id}><td className={td}><Link to="/os/$id" params={{ id: w.id }} className="font-medium text-primary hover:underline">{w.number}</Link><div className="max-w-md truncate text-xs text-muted-foreground">{w.description}</div></td><td className={td}>{WO_TYPE_LABEL[w.type]}</td><td className={td}>{formatDate(w.opened_at)}</td><td className={td}><WoStatusBadge status={w.status} /></td></tr>)}
        </Table>
      )}
      <div className="mt-6"><AttachmentsPanel entityType="equipment" entityId={id} canUpload={mgr} /></div>
      <CrudDialog open={edit} onOpenChange={setEdit} table="equipment" title="equipamento" fields={equipmentFields} row={e} invalidate={[["equipment-detail", id], ["equipment"]]} />
      <CrudDialog open={plan !== undefined} onOpenChange={(o) => !o && setPlan(undefined)} table="maintenance_plans" title="plano" fields={planFields} row={plan} extra={{ equipment_id: id }} invalidate={[["equipment-detail", id]]} />
      {newWo && <NewWorkOrderDialog open={newWo} onOpenChange={setNewWo} preset={{ customer: e.customer_id, equipment: e.id, type: "preventiva" }} />}
    </>
  );
}
