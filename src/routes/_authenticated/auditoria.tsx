import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, NoPermission, PageHeader, Pager } from "@/components/kit";
import { Table, td } from "@/components/crud";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Empilha Nobre" }, { name: "description", content: "Registro de alterações e exportações." }, { property: "og:title", content: "Auditoria — Empilha Nobre" }, { property: "og:description", content: "Registro de alterações." }] }),
  component: Page,
});

const PAGE = 50;

function Page() {
  const me = useMe(); const [page, setPage] = useState(1); const [entity, setEntity] = useState("");
  const q = useQuery({
    queryKey: ["audit", page, entity], enabled: PERM.audit(me.role),
    queryFn: async () => {
      let s = supabase.from("audit_events").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
      if (entity.trim()) s = s.ilike("entity", `%${entity.trim()}%`);
      const { data, error, count } = await s; if (error) throw error;
      const ids = [...new Set(data.map((d) => d.actor_id).filter(Boolean))] as string[];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
      return { rows: data, count: count ?? 0, names: Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name])) };
    },
  });
  if (!PERM.audit(me.role)) return <NoPermission />;
  return (
    <>
      <PageHeader title="Auditoria" description="Quem fez o quê e quando. Os registros não podem ser alterados." />
      <Input className="mb-3 h-11 max-w-xs" placeholder="Filtrar por entidade (ex.: work_orders)" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} aria-label="Entidade" />
      {q.isPending ? <LoadingRows /> : q.isError ? <ErrorState error={q.error} /> : !q.data.rows.length ? <EmptyState title="Nenhum registro" /> : (
        <>
          <Table head={["Quando", "Usuário", "Ação", "Entidade", "Alterações"]}>
            {q.data.rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap`}>{formatDateTime(r.created_at)}</td><td className={td}>{(r.actor_id && q.data.names[r.actor_id]) || (r.actor_id ? r.actor_id.slice(0, 8) : "sistema")}</td>
                <td className={td}>{r.action}</td><td className={td}>{r.entity}</td>
                <td className={td}><code className="block max-w-md truncate text-xs" title={JSON.stringify(r.changes)}>{r.changes ? JSON.stringify(r.changes) : ""}</code></td>
              </tr>
            ))}
          </Table>
          <Pager page={page} pageSize={PAGE} total={q.data.count} onPage={setPage} />
        </>
      )}
    </>
  );
}
