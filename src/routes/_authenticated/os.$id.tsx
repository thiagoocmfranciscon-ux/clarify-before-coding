import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, ConfirmDialog, ErrorState, Field, LoadingRows, PageHeader, Pill, Stat, selectClass, textareaClass } from "@/components/kit";
import { GenericStatus, WoStatusBadge } from "@/components/status";
import { CrudDialog, Table, td, type FieldDef } from "@/components/crud";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { NewWorkOrderDialog } from "@/components/wo-new";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/hooks/use-membership";
import { PERM, WO_PRIORITY_LABEL, WO_STATUS_LABEL, WO_TYPE_LABEL, allowedTransitions, transitionNeedsReason, type WoStatus } from "@/lib/domain";
import { formatBRL, formatDate, formatDateTime, formatNumber, parseDecimal } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { downloadWoReport, downloadWoSheet } from "@/lib/reports";

const DEFAULT_CHECKLIST = ["Inspeção de segurança realizada", "Teste de funcionamento após o serviço", "Vazamentos verificados", "Área limpa e organizada", "Cliente informado"];
const EXP = { deslocamento: "Deslocamento", terceiros: "Serviço de terceiros", alimentacao: "Alimentação", hospedagem: "Hospedagem", outros: "Outros" };

export const Route = createFileRoute("/_authenticated/os/$id")({
  head: () => ({ meta: [{ title: "Detalhe da OS — Empilha Nobre" }, { name: "description", content: "Execução, peças, custos e histórico da ordem de serviço." }, { property: "og:title", content: "Detalhe da OS — Empilha Nobre" }, { property: "og:description", content: "Detalhe da ordem de serviço." }] }),
  component: Page,
});

function useWo(id: string) {
  return useQuery({
    queryKey: ["wo", id],
    queryFn: async () => {
      const [w, a, l, e, s, r, m] = await Promise.all([
        supabase.from("work_orders").select("*, customers(id, legal_name), equipment(id, serial, manufacturer, model, hour_meter)").eq("id", id).single(),
        supabase.from("work_order_assignments").select("id, technician_id, is_primary, unassigned_at, technicians(name)").eq("work_order_id", id).is("unassigned_at", null),
        supabase.from("work_logs").select("*, technicians(name)").eq("work_order_id", id).order("started_at", { ascending: false }),
        supabase.from("work_order_expenses").select("*").eq("work_order_id", id).order("expense_date", { ascending: false }),
        supabase.from("work_order_status_events").select("*").eq("work_order_id", id).order("created_at", { ascending: false }),
        supabase.from("part_requests").select("*, parts(code, description)").eq("work_order_id", id).order("created_at", { ascending: false }),
        supabase.from("stock_movements").select("id, type, qty, unit_cost, total_cost, created_at, reversed_movement_id, parts(code, description)").eq("work_order_id", id).order("created_at", { ascending: false }),
      ]);
      if (w.error) throw w.error;
      const costs = (await supabase.rpc("wo_costs", { p_wo: id })).data as null | { parts: number; labor: number; expenses: number; minutes: number; total: number };
      return { wo: w.data, assigns: a.data ?? [], logs: l.data ?? [], expenses: e.data ?? [], events: s.data ?? [], requests: r.data ?? [], movements: m.data ?? [], costs };
    },
  });
}

function Page() {
  const { id } = Route.useParams(); const me = useMe(); const q = useWo(id); const qc = useQueryClient();
  const [trans, setTrans] = useState<WoStatus | null>(null); const [reason, setReason] = useState(""); const [returnParts, setReturnParts] = useState<"" | "sim" | "nao">("");
  const [rework, setRework] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["wo", id] }); qc.invalidateQueries({ queryKey: ["work_orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  if (q.isPending) return <LoadingRows />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const { wo, assigns, costs } = q.data;
  const assigned = !!me.technicianId && assigns.some((a) => a.technician_id === me.technicianId);
  const next = allowedTransitions(wo.status, me.role, assigned);
  const finished = wo.status === "encerrada" || wo.status === "cancelada";
  const canWork = !finished && (PERM.manage(me.role) || assigned);

  async function doTransition() {
    if (!trans) return;
    if (transitionNeedsReason(wo.status, trans) && !reason.trim()) { toast.error("Informe a justificativa"); return; }
    const hasParts = q.data!.movements.some((m) => m.type === "saida");
    if (trans === "cancelada" && hasParts && !returnParts) { toast.error("Informe se as peças voltaram ao estoque"); return; }
    const { error } = await supabase.rpc("wo_transition", { p_wo: id, p_to: trans, p_expected_version: wo.version, p_reason: reason.trim() || (null as unknown as string), p_return_parts: (returnParts ? returnParts === "sim" : null) as boolean });
    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(`OS ${WO_STATUS_LABEL[trans].toLowerCase()}`); setTrans(null); setReason(""); setReturnParts(""); refresh();
  }

  return (
    <>
      <PageHeader title={`OS ${wo.number}`} description={`${wo.customers?.legal_name ?? ""} · ${wo.equipment?.manufacturer} ${wo.equipment?.model} (${wo.equipment?.serial})`}
        actions={<>
          <WoStatusBadge status={wo.status} />
          {next.map((s) => <Button key={s} variant={s === "cancelada" ? "outline" : "default"} className="min-h-11" onClick={() => setTrans(s)}>{s === "em_andamento" && wo.status === "concluida_tecnicamente" ? "Reabrir (retrabalho)" : `→ ${WO_STATUS_LABEL[s]}`}</Button>)}
          {PERM.manage(me.role) && wo.status === "encerrada" && <Button variant="outline" className="min-h-11" onClick={() => setRework(true)}>OS de retrabalho</Button>}
          <Button variant="outline" className="min-h-11" onClick={() => downloadWoReport(q.data!, PERM.seeCosts(me.role)).catch((e) => toast.error(friendlyError(e)))}><FileDown className="mr-1 h-4 w-4" />Laudo PDF</Button>
          <Button variant="outline" className="min-h-11" onClick={() => downloadWoSheet(q.data!.wo as never, q.data!.assigns.map((a) => a.technicians?.name).filter(Boolean).join(", ")).catch((e) => toast.error(friendlyError(e)))}><FileDown className="mr-1 h-4 w-4" />Imprimir OS (PDF)</Button>
        </>} />
      <Tabs defaultValue="resumo">
        <TabsList className="mb-4 flex h-auto flex-wrap">
          {["resumo", "diagnostico", "execucao", "pecas", ...(PERM.seeCosts(me.role) ? ["custos"] : []), "documentos", "historico"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{({ resumo: "Resumo", diagnostico: "Diagnóstico", execucao: "Execução", pecas: "Peças", custos: "Custos", documentos: "Documentos", historico: "Histórico" } as Record<string, string>)[t]}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="resumo"><Summary data={q.data} onChange={refresh} /></TabsContent>
        <TabsContent value="diagnostico"><Diagnosis data={q.data} canEdit={canWork} onChange={refresh} /></TabsContent>
        <TabsContent value="execucao"><Execution data={q.data} canEdit={canWork} onChange={refresh} /></TabsContent>
        <TabsContent value="pecas"><PartsTab data={q.data} canRequest={canWork} onChange={refresh} /></TabsContent>
        {PERM.seeCosts(me.role) && <TabsContent value="custos">
          <div className="mb-4 grid gap-3 sm:grid-cols-4"><Stat label="Peças" value={formatBRL(costs?.parts)} /><Stat label="Mão de obra" value={formatBRL(costs?.labor)} help={`${formatNumber((costs?.minutes ?? 0) / 60, 2)} h apontadas × custo/h do técnico`} /><Stat label="Despesas" value={formatBRL(costs?.expenses)} /><Stat label="Total" value={formatBRL(costs?.total)} /></div>
        </TabsContent>}
        <TabsContent value="documentos"><AttachmentsPanel entityType="work_order" entityId={id} canUpload={canWork} /></TabsContent>
        <TabsContent value="historico">
          <Table head={["Quando", "De", "Para", "Justificativa"]}>{q.data.events.map((e) => <tr key={e.id}><td className={td}>{formatDateTime(e.created_at)}</td><td className={td}>{e.from_status ? WO_STATUS_LABEL[e.from_status] : "—"}</td><td className={td}>{WO_STATUS_LABEL[e.to_status]}</td><td className={td}>{e.reason}</td></tr>)}</Table>
        </TabsContent>
      </Tabs>
      <ConfirmDialog open={!!trans} onOpenChange={(o) => !o && setTrans(null)} title={trans ? `Mudar para “${WO_STATUS_LABEL[trans]}”?` : ""} confirmLabel="Confirmar" destructive={trans === "cancelada"} onConfirm={doTransition}
        description={trans === "encerrada" ? "Encerrar aprova o serviço e bloqueia novas alterações." : trans === "concluida_tecnicamente" ? "Exige diagnóstico, solução, técnico principal, checklist completo e nenhuma solicitação de peça pendente." : "A mudança fica registrada no histórico."}>
        {trans && transitionNeedsReason(wo.status, trans) && <Field id="tr" label="Justificativa" required><textarea id="tr" className={textareaClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
        {trans === "cancelada" && q.data.movements.some((m) => m.type === "saida") && <Field id="rp" label="As peças usadas voltaram fisicamente ao estoque?" required>
          <select id="rp" className={selectClass} value={returnParts} onChange={(e) => setReturnParts(e.target.value as "")}><option value="">Selecione</option><option value="sim">Sim — estornar ao estoque</option><option value="nao">Não — manter como consumidas</option></select></Field>}
      </ConfirmDialog>
      {rework && <NewWorkOrderDialog open={rework} onOpenChange={setRework} parentId={id} preset={{ customer: wo.customer_id, equipment: wo.equipment_id, type: "corretiva", description: `Retrabalho da OS ${wo.number}: ` }} />}
    </>
  );
}

type Data = NonNullable<ReturnType<typeof useWo>["data"]>;

function Summary({ data, onChange }: { data: Data; onChange: () => void }) {
  const me = useMe(); const { wo, assigns } = data; const mgr = PERM.manage(me.role) && wo.status !== "encerrada" && wo.status !== "cancelada";
  const [tech, setTech] = useState("");
  const techs = useQuery({ queryKey: ["active-techs"], enabled: mgr, queryFn: async () => (await supabase.from("technicians").select("id, name, specialty, status").is("archived_at", null).neq("status", "inativo").order("name")).data ?? [] });
  async function assign(technicianId: string, primary: boolean, remove = false) {
    const { error } = await supabase.rpc("wo_assign", { p_wo: wo.id, p_technician_id: technicianId, p_primary: primary, p_remove: remove });
    if (error) toast.error(friendlyError(error)); else { setTech(""); onChange(); }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h2 className="mb-2 font-semibold">Relato</h2><p className="whitespace-pre-wrap text-sm">{wo.description}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>Tipo: <strong>{WO_TYPE_LABEL[wo.type]}</strong></div><div>Prioridade: <strong>{WO_PRIORITY_LABEL[wo.priority]}</strong></div>
          <div>Abertura: {formatDateTime(wo.opened_at)}</div><div>Previsão: {formatDate(wo.due_date)}</div>
          <div>Cliente: {wo.customers && <Link to="/clientes/$id" params={{ id: wo.customers.id }} className="text-primary hover:underline">{wo.customers.legal_name}</Link>}</div>
          <div>Equipamento: {wo.equipment && <Link to="/equipamentos/$id" params={{ id: wo.equipment.id }} className="text-primary hover:underline">{wo.equipment.serial}</Link>}</div>
          <div>Horímetro na abertura: {wo.hour_meter_reading !== null ? `${formatNumber(wo.hour_meter_reading)} h` : "—"}</div>
          {wo.requester_name && <div>Solicitante: {wo.requester_name}{wo.requester_sector ? ` · ${wo.requester_sector}` : ""}</div>}
          {wo.consultant && <div>Consultor: {wo.consultant}</div>}
          {wo.contact && <div>Contato: {wo.contact}</div>}
          {wo.fleet_number && <div>Frota: {wo.fleet_number}</div>}
          {(wo.equipment_kind || wo.equipment_year) && <div>Equipamento: {[wo.equipment_kind, wo.equipment_year].filter(Boolean).join(" · ")}</div>}
          {wo.technician_name && <div>Técnico (informado): {wo.technician_name}</div>}
          {wo.notes && <div className="sm:col-span-2">Observações: {wo.notes}</div>}
          {wo.parent_work_order_id && <div>Retrabalho de: <Link to="/os/$id" params={{ id: wo.parent_work_order_id }} className="text-primary hover:underline">OS de origem</Link></div>}
          {wo.cancel_reason && <div className="sm:col-span-2 text-destructive">Motivo do cancelamento: {wo.cancel_reason}</div>}
        </dl>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Técnicos</h2>
        {!assigns.length ? <p className="text-sm text-muted-foreground">Nenhum técnico atribuído.</p> : (
          <ul className="space-y-2 text-sm">{assigns.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-1"><span>{a.technicians?.name} {a.is_primary && <Pill tone="primary">Principal</Pill>}</span>
              {mgr && <span>{!a.is_primary && <Button size="sm" variant="ghost" onClick={() => assign(a.technician_id, true)}>Tornar principal</Button>}<Button size="sm" variant="ghost" onClick={() => assign(a.technician_id, false, true)}>Remover</Button></span>}</li>
          ))}</ul>
        )}
        {mgr && <div className="mt-3 flex gap-2"><select className={selectClass} value={tech} onChange={(e) => setTech(e.target.value)} aria-label="Técnico"><option value="">Adicionar técnico…</option>{techs.data?.filter((t) => !assigns.some((a) => a.technician_id === t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}{t.specialty ? ` — ${t.specialty}` : ""}</option>)}</select>
          <Button className="min-h-11" disabled={!tech} onClick={() => assign(tech, !assigns.length)}>Atribuir</Button></div>}
      </Card>
    </div>
  );
}

function Diagnosis({ data, canEdit, onChange }: { data: Data; canEdit: boolean; onChange: () => void }) {
  const { wo } = data;
  const [diag, setDiag] = useState(wo.diagnosis ?? ""); const [sol, setSol] = useState(wo.solution ?? "");
  useEffect(() => { setDiag(wo.diagnosis ?? ""); setSol(wo.solution ?? ""); }, [wo.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = useMutation({
    mutationFn: async () => {
      const { data: r, error } = await supabase.from("work_orders").update({ diagnosis: diag.trim() || null, solution: sol.trim() || null }).eq("id", wo.id).eq("version", wo.version).select("id");
      if (error) throw error; if (!r?.length) throw new Error("A OS foi alterada por outra pessoa. Recarregue para conferir.");
    },
    onSuccess: () => { toast.success("Salvo"); onChange(); }, onError: (e) => toast.error(friendlyError(e)),
  });
  return (
    <Card>
      <div className="grid gap-4">
        <Field id="dg" label="Diagnóstico"><textarea id="dg" className={textareaClass} value={diag} onChange={(e) => setDiag(e.target.value)} disabled={!canEdit} maxLength={4000} /></Field>
        <Field id="sl" label="Solução aplicada"><textarea id="sl" className={textareaClass} value={sol} onChange={(e) => setSol(e.target.value)} disabled={!canEdit} maxLength={4000} /></Field>
        {canEdit && <Button className="min-h-11 w-fit" onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Salvando…" : "Salvar diagnóstico"}</Button>}
      </div>
    </Card>
  );
}

function Execution({ data, canEdit, onChange }: { data: Data; canEdit: boolean; onChange: () => void }) {
  const me = useMe(); const { wo, logs, expenses, assigns } = data;
  const checklist = (wo.checklist && typeof wo.checklist === "object" && !Array.isArray(wo.checklist) && Object.keys(wo.checklist).length ? wo.checklist : Object.fromEntries(DEFAULT_CHECKLIST.map((k) => [k, false]))) as Record<string, boolean>;
  const [log, setLog] = useState(false); const [exp, setExp] = useState(false);
  async function toggle(k: string) {
    const { data: r, error } = await supabase.from("work_orders").update({ checklist: { ...checklist, [k]: !checklist[k] } }).eq("id", wo.id).eq("version", wo.version).select("id");
    if (error || !r?.length) toast.error(error ? friendlyError(error) : "A OS foi alterada por outra pessoa. Recarregue."); onChange();
  }
  const techOpts = assigns.map((a) => ({ value: a.technician_id, label: a.technicians?.name ?? "" }));
  const logFields: FieldDef[] = [
    { key: "technician_id", label: "Técnico", type: "select", required: true, options: me.role === "tecnico" ? techOpts.filter((t) => t.value === me.technicianId) : techOpts },
    { key: "started_at", label: "Início (AAAA-MM-DD HH:MM)", required: true, parse: (v) => { const d = new Date(v.replace(" ", "T")); return Number.isNaN(+d) ? { error: "Data/hora inválida" } : d.toISOString(); } },
    { key: "ended_at", label: "Fim (AAAA-MM-DD HH:MM)", required: true, parse: (v) => { const d = new Date(v.replace(" ", "T")); return Number.isNaN(+d) ? { error: "Data/hora inválida" } : d.toISOString(); } },
    { key: "description", label: "Atividade realizada", type: "textarea", required: true },
  ];
  const expFields: FieldDef[] = [
    { key: "category", label: "Categoria", type: "select", required: true, options: Object.entries(EXP).map(([value, label]) => ({ value, label })) },
    { key: "expense_date", label: "Data", type: "date", required: true }, { key: "amount", label: "Valor (R$)", type: "number", required: true }, { key: "description", label: "Descrição" },
  ];
  const base = { work_order_id: wo.id, organization_id: me.organizationId, created_by: me.userId };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-2 font-semibold">Checklist de conclusão</h2>
        <ul className="space-y-2">{Object.entries(checklist).map(([k, v]) => (
          <li key={k}><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5" checked={v === true} disabled={!canEdit} onChange={() => toggle(k)} />{k}</label></li>
        ))}</ul>
      </Card>
      <Card>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Apontamentos de horas</h2>{canEdit && <Button size="sm" variant="outline" disabled={!assigns.length} onClick={() => setLog(true)}><Plus className="mr-1 h-4 w-4" />Apontar</Button>}</div>
        {!logs.length ? <p className="text-sm text-muted-foreground">Nenhum apontamento.</p> : <ul className="divide-y text-sm">{logs.map((l) => <li key={l.id} className="py-2"><strong>{l.technicians?.name}</strong> · {formatDateTime(l.started_at)} → {formatDateTime(l.ended_at)} ({formatNumber((l.duration_minutes ?? 0) / 60, 2)} h)<div className="text-muted-foreground">{l.description}</div></li>)}</ul>}
      </Card>
      <Card className="lg:col-span-2">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Despesas da OS</h2>{canEdit && PERM.manage(me.role) && <Button size="sm" variant="outline" onClick={() => setExp(true)}><Plus className="mr-1 h-4 w-4" />Despesa</Button>}</div>
        {!expenses.length ? <p className="text-sm text-muted-foreground">Nenhuma despesa.</p> : <Table head={["Data", "Categoria", "Valor", "Descrição"]}>{expenses.map((e) => <tr key={e.id}><td className={td}>{formatDate(e.expense_date)}</td><td className={td}>{EXP[e.category as keyof typeof EXP]}</td><td className={td}>{PERM.seeCosts(me.role) ? formatBRL(e.amount) : "—"}</td><td className={td}>{e.description}</td></tr>)}</Table>}
      </Card>
      <CrudDialog open={log} onOpenChange={setLog} table="work_logs" title="apontamento" fields={logFields} extra={base} invalidate={[["wo", wo.id]]} />
      <CrudDialog open={exp} onOpenChange={setExp} table="work_order_expenses" title="despesa" fields={expFields} extra={base} invalidate={[["wo", wo.id]]} />
    </div>
  );
}

function PartsTab({ data, canRequest, onChange }: { data: Data; canRequest: boolean; onChange: () => void }) {
  const me = useMe(); const { wo, requests, movements } = data;
  const [part, setPart] = useState(""); const [qty, setQty] = useState(""); const [note, setNote] = useState("");
  const parts = useQuery({ queryKey: ["parts-min"], enabled: canRequest, queryFn: async () => (await supabase.from("parts").select("id, code, description").is("archived_at", null).eq("status", "ativo").order("code")).data ?? [] });
  const m = useMutation({
    mutationFn: async () => {
      const n = parseDecimal(qty); if (!part || n === null || Number.isNaN(n) || n <= 0) throw new Error("Escolha a peça e a quantidade");
      const { error } = await supabase.from("part_requests").insert({ organization_id: me.organizationId, work_order_id: wo.id, part_id: part, qty: n, note: note.trim() || null, requested_by: me.userId, status: "pendente" });
      if (error) throw error;
    },
    onSuccess: () => { setPart(""); setQty(""); setNote(""); toast.success("Solicitação enviada ao almoxarifado"); onChange(); }, onError: (e) => toast.error(friendlyError(e)),
  });
  return (
    <div className="grid gap-4">
      {canRequest && <Card>
        <h2 className="mb-2 font-semibold">Solicitar peça</h2>
        <form className="grid gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <select className={selectClass} value={part} onChange={(e) => setPart(e.target.value)} aria-label="Peça"><option value="">Peça…</option>{parts.data?.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.description}</option>)}</select>
          <Input className="h-11" inputMode="decimal" placeholder="Qtd" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantidade" />
          <Input className="h-11" placeholder="Observação" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Observação" />
          <Button type="submit" className="min-h-11" disabled={m.isPending}>Solicitar</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">O almoxarife confirma a saída na tela de Estoque.</p>
      </Card>}
      <div><h2 className="mb-2 font-semibold">Solicitações</h2>
        {!requests.length ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : <Table head={["Data", "Peça", "Qtd", "Situação", "Obs."]}>{requests.map((r) => <tr key={r.id}><td className={td}>{formatDateTime(r.created_at)}</td><td className={td}>{r.parts?.code} — {r.parts?.description}</td><td className={td}>{formatNumber(r.qty)}</td><td className={td}><GenericStatus value={r.status} /></td><td className={td}>{r.note}</td></tr>)}</Table>}
      </div>
      <div><h2 className="mb-2 font-semibold">Peças aplicadas</h2>
        {!movements.length ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : <Table head={["Data", "Peça", "Tipo", "Qtd", ...(PERM.seeCosts(me.role) ? ["Custo"] : [])]}>{movements.map((m) => <tr key={m.id}><td className={td}>{formatDateTime(m.created_at)}</td><td className={td}>{m.parts?.code} — {m.parts?.description}</td><td className={td}>{m.type === "estorno" ? "Devolução" : "Saída"}</td><td className={td}>{formatNumber(m.qty)}</td>{PERM.seeCosts(me.role) && <td className={td}>{formatBRL(m.total_cost)}</td>}</tr>)}</Table>}
      </div>
    </div>
  );
}
