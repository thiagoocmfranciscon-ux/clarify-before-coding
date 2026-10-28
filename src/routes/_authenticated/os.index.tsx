import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, PageHeader, Pager, Pill, selectClass } from "@/components/kit";
import { WoStatusBadge } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NewWorkOrderDialog } from "@/components/wo-new";
import { useMe } from "@/hooks/use-membership";
import { OPEN_STATUSES, PERM, WO_STATUS_LABEL, WO_TYPE_LABEL, isOverdue, type WoStatus } from "@/lib/domain";
import { formatDate, spDate } from "@/lib/format";

const search = z.object({
  status: z.string().optional(), customer: z.string().uuid().optional(), technician: z.string().uuid().optional(),
  from: z.string().optional(), to: z.string().optional(), late: z.boolean().optional(), open: z.boolean().optional(),
  q: z.string().max(80).optional(), page: z.number().int().min(1).optional(), sort: z.enum(["opened_desc", "opened_asc", "due_asc"]).optional(),
});

export const Route = createFileRoute("/_authenticated/os/")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Ordens de Serviço — Empilha Nobre" }, { name: "description", content: "Lista de ordens de serviço." }, { property: "og:title", content: "Ordens de Serviço — Empilha Nobre" }, { property: "og:description", content: "Lista de ordens de serviço." }] }),
  component: WoList,
});

const PAGE = 20;

function WoList() {
  const me = useMe();
  const sp = Route.useSearch();
  const navigate = Route.useNavigate();
  const [newOpen, setNewOpen] = useState(false);
  const [qText, setQText] = useState(sp.q ?? "");
  const page = sp.page ?? 1;
  const today = spDate();
  const set = (patch: Partial<z.infer<typeof search>>) => navigate({ search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }) });

  const lookups = useQuery({
    queryKey: ["wo-lookups"],
    queryFn: async () => {
      const [c, t] = await Promise.all([
        supabase.from("customers").select("id, legal_name").order("legal_name").limit(500),
        supabase.from("technicians").select("id, name").order("name").limit(500),
      ]);
      return { customers: c.data ?? [], technicians: t.data ?? [] };
    },
  });

  const q = useQuery({
    queryKey: ["work_orders", sp],
    queryFn: async () => {
      const assignSel = sp.technician ? "work_order_assignments!inner(technician_id, is_primary, unassigned_at, technicians(name))" : "work_order_assignments(technician_id, is_primary, unassigned_at, technicians(name))";
      let query = supabase.from("work_orders")
        .select(`id, number, status, type, priority, due_date, opened_at, description, customers(legal_name), equipment(serial, model, manufacturer), ${assignSel}`, { count: "exact" });
      if (sp.status) query = query.eq("status", sp.status as WoStatus);
      if (sp.open || sp.late) query = query.in("status", OPEN_STATUSES);
      if (sp.late) query = query.lt("due_date", today);
      if (sp.customer) query = query.eq("customer_id", sp.customer);
      if (sp.technician) query = query.eq("work_order_assignments.technician_id", sp.technician).is("work_order_assignments.unassigned_at", null);
      if (sp.from) query = query.gte("opened_at", `${sp.from}T00:00:00-03:00`);
      if (sp.to) query = query.lte("opened_at", `${sp.to}T23:59:59.999-03:00`);
      if (sp.q) { const s = sp.q.replace(/[%_,()]/g, " ").trim(); if (s) query = query.or(`number.ilike.%${s}%,description.ilike.%${s}%`); }
      const sort = sp.sort ?? "opened_desc";
      query = sort === "due_asc" ? query.order("due_date", { ascending: true, nullsFirst: false }) : query.order("opened_at", { ascending: sort === "opened_asc" });
      const { data, error, count } = await query.range((page - 1) * PAGE, page * PAGE - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  return (
    <>
      <PageHeader title="Ordens de Serviço" description={me.role === "tecnico" ? "OS atribuídas a você" : "Abertura, acompanhamento e encerramento"}
        actions={PERM.manage(me.role) && <Button className="min-h-11" onClick={() => setNewOpen(true)}><Plus className="mr-2 h-4 w-4" />Nova OS</Button>} />
      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <form className="sm:col-span-2" onSubmit={(e) => { e.preventDefault(); set({ q: qText.trim() || undefined }); }}>
          <Label htmlFor="wo-q">Buscar</Label>
          <Input id="wo-q" className="h-11" placeholder="Número ou texto do relato" value={qText} onChange={(e) => setQText(e.target.value)} onBlur={() => set({ q: qText.trim() || undefined })} />
        </form>
        <div><Label htmlFor="wo-status">Status</Label>
          <select id="wo-status" className={selectClass} value={sp.status ?? ""} onChange={(e) => set({ status: e.target.value || undefined })}>
            <option value="">Todos</option>
            {(Object.keys(WO_STATUS_LABEL) as WoStatus[]).map((s) => <option key={s} value={s}>{WO_STATUS_LABEL[s]}</option>)}
          </select></div>
        <div><Label htmlFor="wo-sort">Ordenar</Label>
          <select id="wo-sort" className={selectClass} value={sp.sort ?? "opened_desc"} onChange={(e) => set({ sort: e.target.value as "opened_desc" })}>
            <option value="opened_desc">Abertura (recentes)</option><option value="opened_asc">Abertura (antigas)</option><option value="due_asc">Previsão</option>
          </select></div>
        {me.role !== "tecnico" && <>
          <div><Label htmlFor="wo-c">Cliente</Label>
            <select id="wo-c" className={selectClass} value={sp.customer ?? ""} onChange={(e) => set({ customer: e.target.value || undefined })}>
              <option value="">Todos</option>{lookups.data?.customers.map((c) => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
            </select></div>
          <div><Label htmlFor="wo-t">Técnico</Label>
            <select id="wo-t" className={selectClass} value={sp.technician ?? ""} onChange={(e) => set({ technician: e.target.value || undefined })}>
              <option value="">Todos</option>{lookups.data?.technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select></div>
        </>}
        <div><Label htmlFor="wo-from">Aberta de</Label><Input id="wo-from" type="date" className="h-11" value={sp.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} /></div>
        <div><Label htmlFor="wo-to">até</Label><Input id="wo-to" type="date" className="h-11" value={sp.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} /></div>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" checked={!!sp.late} onChange={(e) => set({ late: e.target.checked || undefined })} />Somente atrasadas</label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" checked={!!sp.open} onChange={(e) => set({ open: e.target.checked || undefined })} />Somente em aberto</label>
        <Button variant="ghost" className="min-h-11 justify-self-start" onClick={() => { setQText(""); navigate({ search: {} }); }}>Limpar filtros</Button>
      </div>

      {q.isPending ? <LoadingRows /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.data.rows.length === 0 ? (
        <EmptyState title="Nenhuma OS encontrada" description="Ajuste os filtros ou abra uma nova OS." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-3">Número</th><th className="px-3">Cliente</th><th className="px-3">Equipamento / série</th><th className="px-3">Técnico</th><th className="px-3">Tipo</th><th className="px-3">Previsão</th><th className="px-3">Status</th></tr>
              </thead>
              <tbody>
                {q.data.rows.map((w) => {
                  const primary = w.work_order_assignments?.find((a) => a.is_primary && !a.unassigned_at);
                  const late = isOverdue(w.status as WoStatus, w.due_date, today);
                  return (
                    <tr key={w.id} className="border-t hover:bg-muted/40">
                      <td className="px-3 py-3 font-medium"><Link to="/os/$id" params={{ id: w.id }} className="text-primary hover:underline">{w.number}</Link></td>
                      <td className="px-3">{w.customers?.legal_name}</td>
                      <td className="px-3">{w.equipment?.manufacturer} {w.equipment?.model}<div className="text-xs text-muted-foreground">{w.equipment?.serial}</div></td>
                      <td className="px-3">{primary?.technicians?.name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3">{WO_TYPE_LABEL[w.type]}</td>
                      <td className="px-3">{formatDate(w.due_date)} {late && <Pill tone="danger">Atrasada</Pill>}</td>
                      <td className="px-3"><WoStatusBadge status={w.status as WoStatus} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {q.data.rows.map((w) => {
              const primary = w.work_order_assignments?.find((a) => a.is_primary && !a.unassigned_at);
              return (
                <li key={w.id}>
                  <Link to="/os/$id" params={{ id: w.id }} className="block rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold text-primary">{w.number}</span><WoStatusBadge status={w.status as WoStatus} /></div>
                    <div className="mt-1 text-sm">{w.customers?.legal_name}</div>
                    <div className="text-xs text-muted-foreground">{w.equipment?.model} · {w.equipment?.serial} · {primary?.technicians?.name ?? "sem técnico"}</div>
                    <div className="mt-1 text-xs">Previsão: {formatDate(w.due_date)} {isOverdue(w.status as WoStatus, w.due_date, today) && <Pill tone="danger">Atrasada</Pill>}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pager page={page} pageSize={PAGE} total={q.data.count} onPage={(p) => set({ page: p })} />
        </>
      )}
      {PERM.manage(me.role) && <NewWorkOrderDialog open={newOpen} onOpenChange={setNewOpen} />}
    </>
  );
}
