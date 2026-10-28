import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, Field, LoadingRows, NoPermission, PageHeader, Pill, selectClass } from "@/components/kit";
import { GenericStatus, StockBadge } from "@/components/status";
import { ArchivedToggle, CrudDialog, Table, td, docParse, useArchive, type FieldDef } from "@/components/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/hooks/use-membership";
import { PERM, stockAlert, validQuantity } from "@/lib/domain";
import { formatBRL, formatDateTime, formatNumber, parseDecimal } from "@/lib/format";
import { friendlyError } from "@/lib/errors";

const MOV = { abertura: "Saldo inicial", entrada: "Entrada", saida: "Saída", ajuste_entrada: "Ajuste (+)", ajuste_saida: "Ajuste (−)", estorno: "Estorno" } as const;

export const Route = createFileRoute("/_authenticated/estoque")({
  validateSearch: (s: Record<string, unknown>) => ({ alert: typeof s["alert"] === "string" ? s["alert"] : undefined }),
  head: () => ({ meta: [{ title: "Estoque de Peças — Empilha Nobre" }, { name: "description", content: "Peças, saldos e movimentações." }, { property: "og:title", content: "Estoque de Peças — Empilha Nobre" }, { property: "og:description", content: "Peças, saldos e movimentações." }] }),
  component: Page,
});

function Page() {
  const me = useMe();
  if (!PERM.seeStock(me.role)) return <NoPermission />;
  return (
    <>
      <PageHeader title="Estoque de Peças" description="Saldos, custo médio ponderado e movimentações." />
      <Tabs defaultValue="parts">
        <TabsList className="mb-4 flex-wrap"><TabsTrigger value="parts">Peças</TabsTrigger><TabsTrigger value="mov">Movimentações</TabsTrigger><TabsTrigger value="req">Solicitações</TabsTrigger><TabsTrigger value="sup">Fornecedores</TabsTrigger><TabsTrigger value="aux">Categorias e unidades</TabsTrigger></TabsList>
        <TabsContent value="parts"><Parts /></TabsContent>
        <TabsContent value="mov"><Movements /></TabsContent>
        <TabsContent value="req"><Requests /></TabsContent>
        <TabsContent value="sup"><Suppliers /></TabsContent>
        <TabsContent value="aux"><Aux /></TabsContent>
      </Tabs>
    </>
  );
}

function useLookups() {
  return useQuery({
    queryKey: ["stock-lookups"],
    queryFn: async () => {
      const [c, u, s] = await Promise.all([
        supabase.from("part_categories").select("id, name").order("name"),
        supabase.from("units").select("id, code, name, allows_fraction").order("code"),
        supabase.from("suppliers").select("id, name").is("archived_at", null).order("name"),
      ]);
      return { cats: c.data ?? [], units: u.data ?? [], sups: s.data ?? [] };
    },
  });
}

function Parts() {
  const me = useMe(); const can = PERM.stock(me.role); const sp = Route.useSearch(); const lk = useLookups();
  const [q, setQ] = useState(""); const [alert, setAlert] = useState(sp.alert ?? "");
  const [row, setRow] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [move, setMove] = useState<{ id: string; code: string; allowsFraction: boolean } | null>(null);
  const [archived, setArchived] = useState(false);
  const list = useQuery({
    queryKey: ["parts", archived],
    queryFn: async () => { let s = supabase.from("parts").select("*, units(code, allows_fraction), part_categories(name), suppliers(name), stock_balances(qty, avg_cost, last_cost)").order("code"); s = archived ? s.not("archived_at", "is", null) : s.is("archived_at", null); const { data, error } = await s; if (error) throw error; return data; },
  });
  const arch = useArchive("parts", [["parts"]]);
  const fields: FieldDef[] = [
    { key: "code", label: "Código", required: true }, { key: "description", label: "Descrição", required: true },
    { key: "category_id", label: "Categoria", type: "select", required: true, options: (lk.data?.cats ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { key: "unit_id", label: "Unidade", type: "select", required: true, options: (lk.data?.units ?? []).map((u) => ({ value: u.id, label: `${u.code} — ${u.name}` })) },
    { key: "min_qty", label: "Estoque mínimo", type: "number", required: true }, { key: "location", label: "Localização" },
    { key: "supplier_id", label: "Fornecedor preferencial", type: "select", options: (lk.data?.sups ?? []).map((s) => ({ value: s.id, label: s.name })) },
    { key: "status", label: "Situação", type: "select", required: true, options: [{ value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" }] },
  ];
  const rows = (list.data ?? []).map((p) => {
    const b = (Array.isArray(p.stock_balances) ? p.stock_balances[0] : p.stock_balances) as { qty: number; avg_cost: number } | null | undefined;
    const qty = Number(b?.qty ?? 0); return { ...p, qty, avg: Number(b?.avg_cost ?? 0), alert: stockAlert(qty, Number(p.min_qty)) };
  }).filter((p) => (!alert || p.alert === alert || (alert === "critico" && p.alert !== "normal")) && (!q || `${p.code} ${p.description}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input className="h-11 max-w-xs" placeholder="Buscar código ou descrição" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar peça" />
        <select className={`${selectClass} max-w-48`} value={alert} onChange={(e) => setAlert(e.target.value)} aria-label="Alerta"><option value="">Todos</option><option value="sem_estoque">Sem estoque</option><option value="baixo">Baixo</option><option value="critico">Sem estoque ou baixo</option><option value="normal">Normal</option></select>
        <ArchivedToggle value={archived} onChange={setArchived} />
        {can && <Button className="ml-auto min-h-11" onClick={() => setRow(null)} disabled={!lk.data?.cats.length || !lk.data?.units.length}><Plus className="mr-1 h-4 w-4" />Nova peça</Button>}
      </div>
      {can && lk.data && (!lk.data.cats.length || !lk.data.units.length) && <p className="mb-3 text-sm text-warning-foreground">Cadastre ao menos uma categoria e uma unidade na aba “Categorias e unidades”.</p>}
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} /> : !rows.length ? <EmptyState title="Nenhuma peça" /> : (
        <Table head={["Código", "Descrição", "Saldo", "Mínimo", "Custo médio", "Alerta", ""]}>
          {rows.map((p) => (
            <tr key={p.id} className={p.archived_at ? "opacity-60" : ""}>
              <td className={`${td} font-medium`}>{p.code}{p.archived_at && <div className="text-xs text-muted-foreground">Arquivada</div>}</td><td className={td}>{p.description}<div className="text-xs text-muted-foreground">{p.part_categories?.name} · {p.location ?? "sem local"}</div></td>
              <td className={`${td} tabular-nums`}>{formatNumber(p.qty)} {p.units?.code}</td><td className={td}>{formatNumber(p.min_qty)}</td>
              <td className={td}>{PERM.seeCosts(me.role) || can ? formatBRL(p.avg) : "—"}</td><td className={td}><StockBadge alert={p.alert} /></td>
              <td className={`${td} whitespace-nowrap text-right`}>{can && <>
                <Button size="sm" variant="outline" onClick={() => setMove({ id: p.id, code: p.code, allowsFraction: !!p.units?.allows_fraction })}>Movimentar</Button>
                <Button size="sm" variant="ghost" onClick={() => setRow(p)}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => arch.mutate({ row: p, archive: !p.archived_at, userId: me.userId })}>{p.archived_at ? "Restaurar" : "Arquivar"}</Button></>}</td>
            </tr>
          ))}
        </Table>
      )}
      <CrudDialog open={row !== undefined} onOpenChange={(o) => !o && setRow(undefined)} table="parts" title="peça" fields={fields} row={row ?? { min_qty: 0 }} invalidate={[["parts"]]} />
      {move && <MoveDialog part={move} onClose={() => setMove(null)} />}
    </>
  );
}

function MoveDialog({ part, onClose, preset }: { part: { id: string; code: string; allowsFraction: boolean }; onClose: () => void; preset?: { type?: string; qty?: string; workOrderId?: string; requestId?: string } }) {
  const qc = useQueryClient(); const lk = useLookups();
  const [key] = useState(() => crypto.randomUUID());
  const [f, setF] = useState({ type: preset?.type ?? "entrada", qty: preset?.qty ?? "", cost: "", reason: "", supplier: "", doc: "", wo: preset?.workOrderId ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const wos = useQuery({ queryKey: ["open-wos-min"], queryFn: async () => (await supabase.from("work_orders").select("id, number").not("status", "in", "(encerrada,cancelada)").order("opened_at", { ascending: false }).limit(200)).data ?? [] });
  const m = useMutation({
    mutationFn: async () => {
      const qty = parseDecimal(f.qty) ?? NaN; const ve = validQuantity(qty, part.allowsFraction); if (ve) throw new Error(ve);
      const cost = parseDecimal(f.cost);
      if ((f.type === "entrada" || f.type === "abertura") && (cost === null || Number.isNaN(cost) || cost < 0)) throw new Error("Informe o custo unitário");
      if (f.type !== "entrada" && f.type !== "abertura" && !f.reason.trim()) throw new Error("Informe o motivo");
      const { error } = await supabase.rpc("stock_move", {
        p_part_id: part.id, p_type: f.type as "entrada", p_qty: qty, p_unit_cost: (cost ?? 0) as number, p_reason: f.reason.trim() || (null as unknown as string),
        p_work_order_id: (f.wo || null) as string, p_supplier_id: (f.supplier || null) as string, p_document_ref: (f.doc.trim() || null) as string,
        p_idempotency_key: key, p_part_request_id: (preset?.requestId ?? null) as string,
      });
      if (error) throw error;
    },
    onSuccess: () => { ["parts", "movements", "part-requests", "wo"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); toast.success("Movimentação registrada"); onClose(); },
    onError: (e) => setErr(friendlyError(e)),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const isIn = f.type === "entrada" || f.type === "abertura";
  return (
    <Dialog open onOpenChange={(o) => !o && !m.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Movimentar {part.code}</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); setErr(null); m.mutate(); }}>
          <Field id="mt" label="Tipo" required><select id="mt" className={selectClass} value={f.type} onChange={set("type")} disabled={!!preset?.requestId}>{(["abertura", "entrada", "saida", "ajuste_entrada", "ajuste_saida"] as const).map((t) => <option key={t} value={t}>{MOV[t]}</option>)}</select></Field>
          <Field id="mq" label="Quantidade" required><Input id="mq" className="h-11" inputMode="decimal" value={f.qty} onChange={set("qty")} /></Field>
          {isIn && <Field id="mc" label="Custo unitário (R$)" required><Input id="mc" className="h-11" inputMode="decimal" value={f.cost} onChange={set("cost")} /></Field>}
          {f.type === "entrada" && <>
            <Field id="ms" label="Fornecedor"><select id="ms" className={selectClass} value={f.supplier} onChange={set("supplier")}><option value="">—</option>{lk.data?.sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field id="md" label="Nota fiscal / documento"><Input id="md" className="h-11" value={f.doc} onChange={set("doc")} /></Field></>}
          {f.type === "saida" && <Field id="mw" label="OS de destino"><select id="mw" className={selectClass} value={f.wo} onChange={set("wo")} disabled={!!preset?.workOrderId}><option value="">— sem OS —</option>{wos.data?.map((w) => <option key={w.id} value={w.id}>{w.number}</option>)}</select></Field>}
          {!isIn && <Field id="mr" label="Motivo" required><Input id="mr" className="h-11" value={f.reason} onChange={set("reason")} /></Field>}
          {err && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <DialogFooter><Button type="submit" className="min-h-11" disabled={m.isPending}>{m.isPending ? "Registrando…" : "Confirmar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Movements() {
  const me = useMe(); const qc = useQueryClient();
  const list = useQuery({ queryKey: ["movements"], queryFn: async () => { const { data, error } = await supabase.from("stock_movements").select("*, parts(code, description), work_orders(id, number)").order("created_at", { ascending: false }).limit(200); if (error) throw error; return data; } });
  const rev = useMutation({
    mutationFn: async (m: { id: string; part_id: string; qty: number }) => {
      const reason = window.prompt("Motivo do estorno:"); if (!reason?.trim()) throw new Error("Estorno cancelado: motivo obrigatório");
      const { error } = await supabase.rpc("stock_move", { p_part_id: m.part_id, p_type: "estorno", p_qty: m.qty, p_unit_cost: 0, p_reason: reason, p_work_order_id: null as unknown as string, p_supplier_id: null as unknown as string, p_document_ref: null as unknown as string, p_idempotency_key: `rev-${m.id}`, p_reversed_movement_id: m.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["movements"] }); qc.invalidateQueries({ queryKey: ["parts"] }); toast.success("Estorno registrado"); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  if (list.isPending) return <LoadingRows />;
  if (list.isError) return <ErrorState error={list.error} />;
  const reversed = new Set(list.data.map((m) => m.reversed_movement_id).filter(Boolean));
  return !list.data.length ? <EmptyState title="Nenhuma movimentação" /> : (
    <Table head={["Data", "Peça", "Tipo", "Qtd", "Custo un.", "Saldo após", "Motivo / OS", ""]}>
      {list.data.map((m) => (
        <tr key={m.id}>
          <td className={td}>{formatDateTime(m.created_at)}</td><td className={td}>{m.parts?.code}</td><td className={td}>{MOV[m.type]}</td>
          <td className={`${td} tabular-nums`}>{formatNumber(m.qty)}</td><td className={td}>{formatBRL(m.unit_cost)}</td><td className={td}>{formatNumber(m.balance_after)}</td>
          <td className={td}>{m.reason}{m.work_orders && <> · <Link to="/os/$id" params={{ id: m.work_orders.id }} className="text-primary hover:underline">{m.work_orders.number}</Link></>}{m.document_ref && ` · NF ${m.document_ref}`}</td>
          <td className={td}>{PERM.stock(me.role) && m.type !== "estorno" && m.type !== "abertura" && (reversed.has(m.id) ? <Pill>Estornada</Pill> : <Button size="sm" variant="ghost" onClick={() => rev.mutate({ id: m.id, part_id: m.part_id, qty: Number(m.qty) })}>Estornar</Button>)}</td>
        </tr>
      ))}
    </Table>
  );
}

function Requests() {
  const me = useMe(); const qc = useQueryClient(); const [serve, setServe] = useState<null | { part: { id: string; code: string; allowsFraction: boolean }; qty: string; wo: string; req: string }>(null);
  const list = useQuery({ queryKey: ["part-requests"], queryFn: async () => { const { data, error } = await supabase.from("part_requests").select("*, parts(id, code, description, units(allows_fraction)), work_orders(id, number)").order("created_at", { ascending: false }).limit(200); if (error) throw error; return data; } });
  const reject = useMutation({
    mutationFn: async (id: string) => { const note = window.prompt("Motivo da recusa:") ?? ""; const { error } = await supabase.rpc("reject_part_request", { p_id: id, p_note: note }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["part-requests"] }); toast.success("Solicitação recusada"); }, onError: (e) => toast.error(friendlyError(e)),
  });
  if (list.isPending) return <LoadingRows />;
  if (list.isError) return <ErrorState error={list.error} />;
  return (
    <>
      {!list.data.length ? <EmptyState title="Nenhuma solicitação" /> : (
        <Table head={["Data", "OS", "Peça", "Qtd", "Obs.", "Situação", ""]}>
          {list.data.map((r) => (
            <tr key={r.id}>
              <td className={td}>{formatDateTime(r.created_at)}</td><td className={td}>{r.work_orders && <Link to="/os/$id" params={{ id: r.work_orders.id }} className="text-primary hover:underline">{r.work_orders.number}</Link>}</td>
              <td className={td}>{r.parts?.code} — {r.parts?.description}</td><td className={td}>{formatNumber(r.qty)}</td><td className={td}>{r.note}</td>
              <td className={td}><GenericStatus value={r.status} /></td>
              <td className={`${td} whitespace-nowrap`}>{PERM.stock(me.role) && r.status === "pendente" && r.parts && <>
                <Button size="sm" onClick={() => setServe({ part: { id: r.parts!.id, code: r.parts!.code, allowsFraction: !!r.parts!.units?.allows_fraction }, qty: String(r.qty), wo: r.work_order_id, req: r.id })}>Atender</Button>
                <Button size="sm" variant="ghost" onClick={() => reject.mutate(r.id)}>Recusar</Button></>}</td>
            </tr>
          ))}
        </Table>
      )}
      {serve && <MoveDialog part={serve.part} onClose={() => setServe(null)} preset={{ type: "saida", qty: serve.qty, workOrderId: serve.wo, requestId: serve.req }} />}
    </>
  );
}

function Suppliers() {
  const me = useMe(); const [row, setRow] = useState<Record<string, unknown> | null | undefined>(undefined); const [archived, setArchived] = useState(false);
  const list = useQuery({ queryKey: ["suppliers", archived], queryFn: async () => { const s = supabase.from("suppliers").select("*").order("name"); return (await (archived ? s.not("archived_at", "is", null) : s.is("archived_at", null))).data ?? []; } });
  const arch = useArchive("suppliers", [["suppliers"], ["stock-lookups"]]);
  const fields: FieldDef[] = [{ key: "name", label: "Nome", required: true }, { key: "document", label: "CPF/CNPJ", parse: docParse }, { key: "contact", label: "Contato" }];
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">{PERM.stock(me.role) && <Button className="min-h-11" onClick={() => setRow(null)}><Plus className="mr-1 h-4 w-4" />Novo fornecedor</Button>}<ArchivedToggle value={archived} onChange={setArchived} /></div>
      {!list.data?.length ? <EmptyState title="Nenhum fornecedor" /> : (
        <Table head={["Nome", "Documento", "Contato", ""]}>{list.data.map((s) => <tr key={s.id} className={s.archived_at ? "opacity-60" : ""}><td className={`${td} font-medium`}>{s.name}</td><td className={td}>{s.document ?? "—"}</td><td className={td}>{s.contact ?? "—"}</td>
          <td className={`${td} text-right`}>{PERM.stock(me.role) && <><Button size="sm" variant="ghost" onClick={() => setRow(s)}>Editar</Button><Button size="sm" variant="ghost" onClick={() => arch.mutate({ row: s, archive: !s.archived_at, userId: me.userId })}>{s.archived_at ? "Restaurar" : "Arquivar"}</Button></>}</td></tr>)}</Table>
      )}
      <CrudDialog open={row !== undefined} onOpenChange={(o) => !o && setRow(undefined)} table="suppliers" title="fornecedor" fields={fields} row={row} invalidate={[["suppliers"], ["stock-lookups"]]} />
    </>
  );
}

function Aux() {
  const me = useMe(); const lk = useLookups(); const [cat, setCat] = useState(false); const [unit, setUnit] = useState(false);
  const can = PERM.stock(me.role);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div><div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Categorias</h2>{can && <Button size="sm" variant="outline" onClick={() => setCat(true)}><Plus className="mr-1 h-4 w-4" />Categoria</Button>}</div>
        <ul className="divide-y rounded-lg border bg-card text-sm">{lk.data?.cats.map((c) => <li key={c.id} className="px-3 py-2">{c.name}</li>)}</ul></div>
      <div><div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Unidades</h2>{can && <Button size="sm" variant="outline" onClick={() => setUnit(true)}><Plus className="mr-1 h-4 w-4" />Unidade</Button>}</div>
        <ul className="divide-y rounded-lg border bg-card text-sm">{lk.data?.units.map((u) => <li key={u.id} className="px-3 py-2">{u.code} — {u.name} {u.allows_fraction && <Pill>aceita fração</Pill>}</li>)}</ul></div>
      <CrudDialog open={cat} onOpenChange={setCat} table="part_categories" title="categoria" fields={[{ key: "name", label: "Nome", required: true }]} extra={{ organization_id: me.organizationId }} invalidate={[["stock-lookups"]]} />
      <CrudDialog open={unit} onOpenChange={setUnit} table="units" title="unidade" extra={{ organization_id: me.organizationId }} invalidate={[["stock-lookups"]]}
        fields={[{ key: "code", label: "Sigla", required: true, hint: "Ex.: UN, L, KG, M" }, { key: "name", label: "Nome", required: true }, { key: "allows_fraction", label: "Aceita fração?", type: "select", required: true, options: [{ value: "false", label: "Não" }, { value: "true", label: "Sim" }], parse: (v) => v === "true" }]} />
    </div>
  );
}
