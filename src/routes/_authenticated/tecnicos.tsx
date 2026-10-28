import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { IdCard, Plus, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { ArchivedToggle, CrudDialog, phoneParse, useArchive, type FieldDef } from "@/components/crud";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon, waLink } from "@/components/icons";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { formatBRL } from "@/lib/format";

const fields: FieldDef[] = [
  { key: "name", label: "Nome", required: true },
  { key: "specialty", label: "Especialidade" },
  { key: "status", label: "Situação", type: "select", required: true, options: [{ value: "disponivel", label: "Disponível" }, { value: "em_servico", label: "Em serviço" }, { value: "afastado", label: "Afastado" }, { value: "inativo", label: "Inativo" }] },
];
const privFields: FieldDef[] = [
  { key: "phone", label: "Telefone", parse: phoneParse },
  { key: "hourly_cost", label: "Custo por hora (R$)", type: "number" },
];

export const Route = createFileRoute("/_authenticated/tecnicos")({
  head: () => ({ meta: [{ title: "Quadro Técnico — Empilha Nobre" }, { name: "description", content: "Equipe técnica da Empilha Nobre." }, { property: "og:title", content: "Quadro Técnico — Empilha Nobre" }, { property: "og:description", content: "Equipe técnica." }] }),
  component: Page,
});

function formatPhone(p: string | null | undefined) {
  const d = (p ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p || "—";
}

/** Percentual de OS dos últimos 90 dias concluídas tecnicamente ou encerradas. */
export function productivity(statuses: string[]): number | null {
  const valid = statuses.filter((s) => s !== "cancelada");
  if (!valid.length) return null;
  const done = valid.filter((s) => s === "concluida_tecnicamente" || s === "encerrada").length;
  return Math.round((done / valid.length) * 100);
}

function Page() {
  const me = useMe(); const mgr = PERM.manage(me.role);
  const [archived, setArchived] = useState(false);
  const [row, setRow] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [priv, setPriv] = useState<{ id: string; row: Record<string, unknown> | null } | null>(null);
  const list = useQuery({
    queryKey: ["technicians", archived],
    queryFn: async () => {
      let s = supabase.from("technicians").select("*").order("name");
      s = archived ? s.not("archived_at", "is", null) : s.is("archived_at", null);
      const { data, error } = await s;
      if (error) throw error;
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const [p, a] = await Promise.all([
        mgr ? supabase.from("technician_private").select("*") : Promise.resolve({ data: [] as never[] }),
        supabase.from("work_order_assignments").select("technician_id, work_orders!inner(status, opened_at)").is("unassigned_at", null).gte("work_orders.opened_at", since),
      ]);
      const asg = (a.data ?? []) as unknown as { technician_id: string; work_orders: { status: string } }[];
      return data.map((t) => ({
        ...t,
        priv: (p.data ?? []).find((x: { technician_id: string }) => x.technician_id === t.id) as { phone: string | null; hourly_cost: number | null } | null ?? null,
        prod: productivity(asg.filter((x) => x.technician_id === t.id).map((x) => x.work_orders.status)),
      }));
    },
  });
  const arch = useArchive("technicians", [["technicians"]]);
  return (
    <>
      <PageHeader title="Quadro Técnico" description="Especialistas em empilhadeiras elétricas, a combustão e baterias."
        actions={<><ArchivedToggle value={archived} onChange={setArchived} />{mgr && <Button className="min-h-11" onClick={() => setRow(null)}><Plus className="mr-1 h-4 w-4" />Novo técnico</Button>}</>} />
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data.length ? <EmptyState title={archived ? "Nenhum técnico arquivado" : "Nenhum técnico"} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.map((t) => {
            const wa = waLink(t.priv?.phone);
            return (
              <article key={t.id} className={`flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${t.archived_at ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{t.name}</h2>
                    <p className="text-xs text-muted-foreground">{t.code}</p>
                  </div>
                  <GenericStatus value={t.status} archived={!!t.archived_at} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{t.specialty || "Sem especialidade informada"}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Telefone:</div><div className="font-semibold tabular-nums">{mgr ? formatPhone(t.priv?.phone) : "Restrito"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Produtividade:</div><div className="font-semibold text-success">{t.prod === null ? "—" : `${t.prod}%`}</div></div>
                  {mgr && t.priv?.hourly_cost != null && <div className="col-span-2 text-xs text-muted-foreground">Custo/h: {formatBRL(t.priv.hourly_cost)}</div>}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="min-h-11 flex-1 justify-start" disabled={!mgr} onClick={() => setRow(t)}><IdCard className="mr-2 h-4 w-4" />Ficha</Button>
                  {wa ? (
                    <Button asChild className="min-h-11 w-11 px-0" aria-label={`WhatsApp de ${t.name}`}><a href={wa} target="_blank" rel="noreferrer"><WhatsAppIcon /></a></Button>
                  ) : (
                    <Button className="min-h-11 w-11 px-0" disabled aria-label="Sem telefone" title="Sem telefone cadastrado"><WhatsAppIcon /></Button>
                  )}
                  {mgr && (t.archived_at ? (
                    <Button variant="outline" className="min-h-11 w-11 px-0" aria-label="Restaurar" title="Restaurar" onClick={() => arch.mutate({ row: t, archive: false, userId: me.userId })}><RotateCcw className="h-4 w-4" /></Button>
                  ) : (
                    <Button variant="outline" className="min-h-11 w-11 px-0 text-destructive hover:text-destructive" aria-label="Arquivar" title="Arquivar" onClick={() => arch.mutate({ row: t, archive: true, userId: me.userId })}><Trash2 className="h-4 w-4" /></Button>
                  ))}
                </div>
                {mgr && <button type="button" className="mt-2 self-start text-xs text-primary hover:underline" onClick={() => setPriv({ id: t.id, row: t.priv })}>Editar telefone e custo/hora</button>}
              </article>
            );
          })}
        </div>
      )}
      <CrudDialog open={row !== undefined} onOpenChange={(o) => !o && setRow(undefined)} table="technicians" title="técnico" fields={fields} row={row} invalidate={[["technicians"]]} />
      {priv && <CrudDialog open onOpenChange={(o) => !o && setPriv(null)} table="technician_private" title="dados restritos" fields={privFields}
        idKey="technician_id" row={priv.row} extra={{ technician_id: priv.id }} invalidate={[["technicians"]]} />}
    </>
  );
}
