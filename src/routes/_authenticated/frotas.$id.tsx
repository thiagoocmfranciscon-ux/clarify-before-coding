import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, ErrorState, LoadingRows, PageHeader } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { CrudDialog, Table, td, useArchive, type FieldDef } from "@/components/crud";
import { vehicleFields } from "@/components/fields";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { formatBRL, formatDate, formatNumber, spDate } from "@/lib/format";

const EXP = { combustivel: "Combustível", manutencao: "Manutenção", seguro: "Seguro", pedagio: "Pedágio", multa: "Multa", outros: "Outros" };
const KIND = { odometro: "Leitura de odômetro", manutencao: "Manutenção", revisao: "Revisão" };

export const Route = createFileRoute("/_authenticated/frotas/$id")({
  head: () => ({ meta: [{ title: "Veículo — Empilha Nobre" }, { name: "description", content: "Eventos e despesas do veículo." }, { property: "og:title", content: "Veículo — Empilha Nobre" }, { property: "og:description", content: "Eventos e despesas do veículo." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams(); const me = useMe(); const mgr = PERM.manage(me.role);
  const [edit, setEdit] = useState(false); const [ev, setEv] = useState(false); const [ex, setEx] = useState(false);
  const techs = useQuery({ queryKey: ["techs-min"], queryFn: async () => (await supabase.from("technicians").select("id, name").is("archived_at", null).order("name")).data ?? [] });
  const q = useQuery({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      const [v, e, x] = await Promise.all([
        supabase.from("vehicles").select("*, technicians(name)").eq("id", id).single(),
        supabase.from("vehicle_events").select("*").eq("vehicle_id", id).order("event_date", { ascending: false }),
        supabase.from("vehicle_expenses").select("*").eq("vehicle_id", id).order("expense_date", { ascending: false }),
      ]);
      if (v.error) throw v.error; return { v: v.data, events: e.data ?? [], expenses: x.data ?? [] };
    },
  });
  const arch = useArchive("vehicles", [["vehicle", id], ["vehicles"]]);
  if (q.isPending) return <LoadingRows />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { v, events, expenses } = q.data;
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const evFields: FieldDef[] = [
    { key: "kind", label: "Tipo", type: "select", required: true, options: Object.entries(KIND).map(([value, label]) => ({ value, label })) },
    { key: "event_date", label: "Data", type: "date", required: true }, { key: "odometer", label: "Odômetro (km)", type: "number" }, { key: "description", label: "Descrição", type: "textarea" },
  ];
  const exFields: FieldDef[] = [
    { key: "category", label: "Categoria", type: "select", required: true, options: Object.entries(EXP).map(([value, label]) => ({ value, label })) },
    { key: "expense_date", label: "Data", type: "date", required: true }, { key: "amount", label: "Valor (R$)", type: "number", required: true }, { key: "description", label: "Descrição" },
  ];
  const base = { vehicle_id: id, organization_id: me.organizationId, created_by: me.userId };
  return (
    <>
      <PageHeader title={v.plate} description={`${v.model} ${v.year ?? ""} · ${v.type}`} actions={mgr && <>
        <Button variant="outline" className="min-h-11" onClick={() => setEdit(true)}>Editar</Button>
        <Button variant="outline" className="min-h-11" onClick={() => arch.mutate({ row: v, archive: !v.archived_at, userId: me.userId })}>{v.archived_at ? "Restaurar" : "Arquivar"}</Button></>} />
      <Card className="mb-4"><div className="grid gap-2 text-sm sm:grid-cols-4">
        <div>Situação: <GenericStatus value={v.status} /></div><div>Motorista: {v.technicians?.name ?? "—"}</div>
        <div>Odômetro: {v.odometer !== null ? `${formatNumber(v.odometer)} km` : "—"}</div><div>Seguro: {formatDate(v.insurance_due)}</div>
      </div></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Eventos</h2>{mgr && <Button size="sm" variant="outline" onClick={() => setEv(true)}><Plus className="mr-1 h-4 w-4" />Evento</Button>}</div>
          <Table head={["Data", "Tipo", "Km", "Descrição"]}>{events.map((e) => <tr key={e.id}><td className={td}>{formatDate(e.event_date)}</td><td className={td}>{KIND[e.kind as keyof typeof KIND]}</td><td className={td}>{formatNumber(e.odometer)}</td><td className={td}>{e.description}</td></tr>)}</Table>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Despesas · {formatBRL(total)}</h2>{mgr && <Button size="sm" variant="outline" onClick={() => setEx(true)}><Plus className="mr-1 h-4 w-4" />Despesa</Button>}</div>
          <Table head={["Data", "Categoria", "Valor", "Descrição"]}>{expenses.map((e) => <tr key={e.id}><td className={td}>{formatDate(e.expense_date)}</td><td className={td}>{EXP[e.category as keyof typeof EXP]}</td><td className={td}>{formatBRL(e.amount)}</td><td className={td}>{e.description}</td></tr>)}</Table>
        </div>
      </div>
      <div className="mt-6"><AttachmentsPanel entityType="vehicle" entityId={id} canUpload={mgr} /></div>
      <CrudDialog open={edit} onOpenChange={setEdit} table="vehicles" title="veículo" fields={vehicleFields((techs.data ?? []).map((t) => ({ value: t.id, label: t.name })))} row={v} invalidate={[["vehicle", id], ["vehicles"]]} />
      <CrudDialog open={ev} onOpenChange={setEv} table="vehicle_events" title="evento" fields={evFields} row={{ event_date: spDate() }} extra={base} invalidate={[["vehicle", id]]} />
      <CrudDialog open={ex} onOpenChange={setEx} table="vehicle_expenses" title="despesa" fields={exFields} row={{ expense_date: spDate() }} extra={base} invalidate={[["vehicle", id]]} />
    </>
  );
}
