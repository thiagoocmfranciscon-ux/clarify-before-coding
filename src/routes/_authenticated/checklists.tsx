import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Plus, ListChecks, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, EmptyState, ErrorState, Field, LoadingRows, PageHeader, Pill, selectClass, textareaClass } from "@/components/kit";
import { Table, td } from "@/components/crud";
import { AttachmentsPanel } from "@/components/attachments-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { formatDate, spDate } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { CHECKLIST_TYPES, KIND_LABEL, MACHINE_TYPES, countBad, isMachineType, unanswered, type Answer, type ChecklistKind, type MachineType } from "@/lib/checklist";
import { downloadChecklistPdf } from "@/lib/checklist-pdf";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/checklists")({
  validateSearch: (s: Record<string, unknown>): { tipo: MachineType } => ({ tipo: isMachineType(s["tipo"]) ? s["tipo"] : "combustao" }),
  head: () => ({ meta: [
    { title: "Checklists — Empilha Nobre" }, { name: "description", content: "Checklists de entrega e retorno de empilhadeiras." },
    { property: "og:title", content: "Checklists — Empilha Nobre" }, { property: "og:description", content: "Entrega e retorno de máquinas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

type Template = { id: string; version: number; items: string[]; needs_validation: boolean };
type Row = {
  id: string; machine_type: MachineType; kind: ChecklistKind; customer_id: string | null; equipment_id: string | null; consultant: string | null;
  responsible_name: string | null; responsible_cpf: string | null; customer_signer: string | null; invoice: string | null; contract: string | null;
  brand: string | null; model: string | null; serial: string | null; fleet_number: string | null; hour_meter: number | null; check_date: string;
  check_time: string | null; types: string[]; answers: Record<string, Answer>; bad_count: number; tech_notes: string | null; customer_notes: string | null;
  template_id: string; template_version: number; created_by: string | null; customer_name: string | null; customers: { legal_name: string; trade_name: string | null } | null;
};

function Page() {
  const me = useMe(); const readOnly = me.role === "leitura";
  const { tipo } = Route.useSearch(); const navigate = useNavigate({ from: "/checklists" });
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { data: att } = await supabase.from("attachments").select("storage_path").eq("entity_type", "checklist").eq("entity_id", id);
      if (att?.length) await supabase.storage.from("attachments").remove(att.map((a) => a.storage_path)).catch(() => {});
      const { error } = await supabase.from("checklists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Checklist excluído"); qc.invalidateQueries({ queryKey: ["checklists", tipo] }); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const tpl = useQuery({
    queryKey: ["checklist_template", tipo],
    queryFn: async () => {
      const { data, error } = await supabase.from("checklist_templates").select("id, version, items, needs_validation").eq("machine_type", tipo).order("version", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error; return data as Template | null;
    },
  });
  const list = useQuery({
    queryKey: ["checklists", tipo],
    queryFn: async () => {
      const { data, error } = await supabase.from("checklists").select("*, customers(legal_name, trade_name)").eq("machine_type", tipo).is("archived_at", null).order("check_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
      if (error) throw error; return data as unknown as Row[];
    },
  });

  return (
    <>
      <PageHeader title="Checklists" description="Entrega e retorno de máquinas, item por item."
        actions={!readOnly && <Button className="min-h-11" onClick={() => setEditing("new")} disabled={!tpl.data}><Plus className="mr-1 h-4 w-4" />Novo checklist</Button>} />
      <div role="tablist" aria-label="Tipo de máquina" className="mb-5 grid grid-cols-2 gap-1 rounded-xl border bg-card p-1 sm:flex sm:overflow-x-auto [scrollbar-width:none]">
        {MACHINE_TYPES.map((m) => (
          <button key={m.key} role="tab" aria-selected={tipo === m.key} onClick={() => navigate({ search: { tipo: m.key } })}
            className={cn("min-h-11 rounded-lg px-3 py-1 text-center text-sm font-medium leading-tight transition sm:shrink-0 sm:px-4", tipo === m.key ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted")}>
            {m.label}
          </button>
        ))}
      </div>
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : list.data.length === 0 ? (
        <EmptyState title="Nenhum checklist ainda" action={!readOnly && <Button onClick={() => setEditing("new")} disabled={!tpl.data}><Plus className="mr-1 h-4 w-4" />Novo checklist</Button>} />
      ) : (
        <Table head={["Data", "Tipo", "Cliente", "Nº frota", "Responsável", "Itens ruins", ""]}>
          {list.data.map((r) => (
            <tr key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditing(r)}>
              <td className={td}>{formatDate(r.check_date)}</td>
              <td className={td}><Pill tone={r.kind === "entrega" ? "info" : "neutral"}>{KIND_LABEL[r.kind]}</Pill></td>
              <td className={td}>{r.customer_name || r.customers?.trade_name || r.customers?.legal_name || "—"}</td>
              <td className={td}>{r.fleet_number || "—"}</td>
              <td className={td}>{r.responsible_name || "—"}</td>
              <td className={td}>{r.bad_count > 0 ? <Pill tone="danger">{r.bad_count}</Pill> : <Pill tone="success">0</Pill>}</td>
              <td className={td}><div className="flex gap-1"><Button size="sm" variant="ghost">Abrir</Button>
                {!readOnly && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label="Excluir checklist" onClick={(e) => { e.stopPropagation(); setDelId(r.id); }}><Trash2 className="h-4 w-4" /></Button>}</div></td>
            </tr>
          ))}
        </Table>
      )}
      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir este checklist?</AlertDialogTitle>
            <AlertDialogDescription>As fotos dele também serão apagadas. Não dá para desfazer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (delId) del.mutate(delId); setDelId(null); }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {editing && tpl.data && <ChecklistDialog tipo={tipo} template={tpl.data} row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ChecklistDialog({ tipo, template, row, onClose }: { tipo: MachineType; template: Template; row: Row | null; onClose: () => void }) {
  const me = useMe(); const qc = useQueryClient();
  const items = row && row.template_id !== template.id ? Object.keys(row.answers) : template.items;
  const [savedId, setSavedId] = useState<string | null>(row?.id ?? null);
  const [f, setF] = useState(() => ({
    kind: (row?.kind ?? "entrega") as ChecklistKind, consultant: row?.consultant ?? "", responsible_name: row?.responsible_name ?? me.fullName ?? "",
    responsible_cpf: row?.responsible_cpf ?? "", customer_signer: row?.customer_signer ?? "", customer_name: row?.customer_name ?? row?.customers?.trade_name ?? row?.customers?.legal_name ?? "",
    invoice: row?.invoice ?? "", contract: row?.contract ?? "", brand: row?.brand ?? "", model: row?.model ?? "", serial: row?.serial ?? "",
    fleet_number: row?.fleet_number ?? "", hour_meter: row?.hour_meter != null ? String(row.hour_meter) : "", check_date: row?.check_date ?? spDate(),
    check_time: row?.check_time ?? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
    types: row?.types ?? [] as string[], tech_notes: row?.tech_notes ?? "", customer_notes: row?.customer_notes ?? "",
  }));
  const [answers, setAnswers] = useState<Record<string, Answer>>(row?.answers ?? {});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const canEdit = me.role !== "leitura" && (!row || row.created_by === me.userId || PERM.manage(me.role));

  const pending = unanswered(items, answers);
  const bad = countBad(items, answers);

  const save = useMutation({
    mutationFn: async () => {
      const hm = f.hour_meter.trim() ? Number(f.hour_meter.replace(",", ".")) : null;
      if (hm !== null && (Number.isNaN(hm) || hm < 0)) throw new Error("Horímetro inválido");
      const payload = {
        kind: f.kind, consultant: f.consultant || null, responsible_name: f.responsible_name || null, responsible_cpf: f.responsible_cpf || null,
        customer_signer: f.customer_signer || null, customer_name: f.customer_name.trim() || null, invoice: f.invoice || null,
        contract: f.contract || null, brand: f.brand || null, model: f.model || null, serial: f.serial || null, fleet_number: f.fleet_number || null,
        hour_meter: hm, check_date: f.check_date, check_time: f.check_time || null, types: f.types, answers, bad_count: bad,
        tech_notes: f.tech_notes || null, customer_notes: f.customer_notes || null,
      };
      if (savedId) {
        const { error } = await supabase.from("checklists").update(payload).eq("id", savedId);
        if (error) throw error; return savedId;
      }
      const { data, error } = await supabase.from("checklists").insert({ ...payload, organization_id: me.organizationId, machine_type: tipo, template_id: template.id, template_version: template.version }).select("id").single();
      if (error) throw error; return data.id;
    },
    onSuccess: (id) => { setSavedId(id); toast.success("Checklist salvo"); qc.invalidateQueries({ queryKey: ["checklists", tipo] }); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const pdf = async () => {
    if (!savedId) return;
    try {
      await downloadChecklistPdf({ id: savedId, machine_type: tipo, kind: f.kind, consultant: f.consultant, responsible_name: f.responsible_name, responsible_cpf: f.responsible_cpf,
        customer_signer: f.customer_signer, customer_name: f.customer_name || null, invoice: f.invoice, contract: f.contract, brand: f.brand, model: f.model, serial: f.serial,
        fleet_number: f.fleet_number, hour_meter: f.hour_meter ? Number(f.hour_meter.replace(",", ".")) : null, check_date: f.check_date, check_time: f.check_time,
        types: f.types, answers, tech_notes: f.tech_notes, customer_notes: f.customer_notes, items });
    } catch (e) { toast.error(friendlyError(e)); }
  };

  const txt = (k: keyof typeof f, label: string, props: Record<string, unknown> = {}) => (
    <Field id={`c-${k}`} label={label}><Input id={`c-${k}`} className="h-11" value={f[k] as string} disabled={!canEdit} onChange={(e) => set(k, e.target.value as never)} {...props} /></Field>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{row ? "Checklist" : "Novo checklist"} · {MACHINE_TYPES.find((m) => m.key === tipo)!.label}</DialogTitle></DialogHeader>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-2 gap-2">
            {(["entrega", "retorno"] as const).map((k) => (
              <button type="button" key={k} disabled={!canEdit} onClick={() => set("kind", k)} aria-pressed={f.kind === k}
                className={cn("min-h-12 rounded-lg border text-sm font-semibold transition", f.kind === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              {txt("consultant", "Consultor")}
              {txt("responsible_name", "Responsável pelo check-list")}
              {txt("customer_name", "Cliente")}
              {txt("invoice", "Nota fiscal")}{txt("contract", "Contrato")}
              {txt("brand", "Marca")}{txt("model", "Modelo")}
              {txt("serial", "Série")}{txt("fleet_number", "Nº frota", { placeholder: "EN 0000" })}
              {txt("hour_meter", `Horímetro ${KIND_LABEL[f.kind].toLowerCase()}`, { inputMode: "decimal" })}
              <div className="grid grid-cols-2 gap-3">{txt("check_date", "Data", { type: "date" })}{txt("check_time", "Hora", { type: "time" })}</div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium">Tipo</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {CHECKLIST_TYPES.map((t) => {
                  const on = f.types.includes(t);
                  return <button type="button" key={t} disabled={!canEdit} aria-pressed={on} onClick={() => set("types", on ? f.types.filter((x) => x !== t) : [...f.types, t])}
                    className={cn("min-h-10 rounded-full border px-4 text-sm transition", on ? "border-primary bg-primary/10 font-semibold text-primary" : "hover:bg-muted")}>{t}</button>;
                })}
              </div>
            </div>
          </Card>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-semibold">Inspeção</h3>
              <span className="text-xs text-muted-foreground">{items.length - pending.length}/{items.length} respondidos · {bad} ruim</span>
            </div>
            <ul className="divide-y rounded-xl border bg-card">
              {items.map((it) => (
                <li key={it} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
                  <span className="min-w-0 text-sm">{it}</span>
                  <div className="flex gap-1.5">
                    {(["bom", "ruim"] as const).map((v) => (
                      <button type="button" key={v} disabled={!canEdit} aria-pressed={answers[it] === v} aria-label={`${it}: ${v}`}
                        onClick={() => setAnswers((p) => ({ ...p, [it]: v }))}
                        className={cn("h-10 w-16 rounded-lg border text-xs font-semibold uppercase transition",
                          answers[it] === v ? (v === "bom" ? "border-success bg-success text-success-foreground" : "border-destructive bg-destructive text-destructive-foreground") : "hover:bg-muted")}>{v}</button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="c-tn" label="Observações técnicas"><textarea id="c-tn" className={textareaClass} disabled={!canEdit} value={f.tech_notes} onChange={(e) => set("tech_notes", e.target.value)} /></Field>
            <Field id="c-cn" label="Observações do cliente"><textarea id="c-cn" className={textareaClass} disabled={!canEdit} value={f.customer_notes} onChange={(e) => set("customer_notes", e.target.value)} /></Field>
            {txt("responsible_cpf", "CPF do responsável", { inputMode: "numeric" })}
            {txt("customer_signer", "Nome de quem assina pelo cliente")}
          </div>

          {pending.length > 0 && <p className="text-sm text-muted-foreground">Faltam {pending.length} itens para responder.</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {savedId && <Button type="button" variant="outline" className="min-h-11" onClick={pdf}><FileDown className="mr-1 h-4 w-4" />Baixar PDF</Button>}
            {canEdit && <Button type="submit" className="min-h-11" disabled={save.isPending}><ListChecks className="mr-1 h-4 w-4" />{save.isPending ? "Salvando…" : "Salvar checklist"}</Button>}
          </div>
        </form>
        {savedId ? <div className="mt-2"><h3 className="mb-2 font-semibold">Fotos</h3><AttachmentsPanel entityType="checklist" entityId={savedId} canUpload={canEdit} /></div>
          : <p className="text-sm text-muted-foreground">Salve o checklist para adicionar fotos.</p>}
      </DialogContent>
    </Dialog>
  );
}
