import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, NoPermission, PageHeader, Pill } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { ArchivedToggle, CrudDialog, Table, td, useArchive } from "@/components/crud";
import { vehicleFields } from "@/components/fields";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { formatDate, formatNumber, spDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/frotas/")({
  head: () => ({ meta: [{ title: "Frotas — Empilha Nobre" }, { name: "description", content: "Frotas, horímetros e revisões." }, { property: "og:title", content: "Frotas — Empilha Nobre" }, { property: "og:description", content: "Frotas, horímetros e revisões." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Page,
});

function Page() {
  const me = useMe(); const [open, setOpen] = useState(false); const [archived, setArchived] = useState(false);
  const arch = useArchive("vehicles", [["vehicles"]]);
  const list = useQuery({
    queryKey: ["vehicles", archived], enabled: PERM.fleet(me.role) || me.role === "tecnico",
    queryFn: async () => { let s = supabase.from("vehicles").select("*").order("plate"); s = archived ? s.not("archived_at", "is", null) : s.is("archived_at", null); const { data, error } = await s; if (error) throw error; return data; },
  });
  if (!PERM.fleet(me.role) && me.role !== "tecnico") return <NoPermission />;
  const today = spDate();
  return (
    <>
      <PageHeader title="Frotas" description="Horímetros, revisões e despesas." actions={<><ArchivedToggle value={archived} onChange={setArchived} />{PERM.manage(me.role) && <Button className="min-h-11" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Adicionar frota</Button>}</>} />
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data.length ? <EmptyState title="Nenhum veículo" /> : (
        <Table head={["Série", "Frota", "Horímetro", "Próx. revisão", "Situação", ""]}>
          {list.data.map((v) => {
            const kmDue = v.next_service_km !== null && v.odometer !== null && v.odometer >= v.next_service_km;
            const dateDue = !!v.next_service_date && v.next_service_date < today;
            return (
              <tr key={v.id} className={v.archived_at ? "opacity-60" : ""}>
                <td className={td}><Link to="/frotas/$id" params={{ id: v.id }} className="font-medium text-primary hover:underline">{v.plate}</Link></td>
                <td className={td}>{v.model} {v.year ?? ""}<div className="text-xs text-muted-foreground">{v.type}</div></td>
                 <td className={td}>{v.odometer !== null ? `${formatNumber(v.odometer)} h` : "—"}</td>
                 <td className={td}>{[v.next_service_km !== null && `${formatNumber(v.next_service_km)} h`, formatDate(v.next_service_date)].filter((x) => x && x !== "—").join(" / ") || "—"} {(kmDue || dateDue) && <Pill tone="danger">Vencida</Pill>}</td>
                <td className={td}><GenericStatus value={v.status} archived={!!v.archived_at} /></td>
                <td className={`${td} text-right`}>{PERM.manage(me.role) && <Button size="sm" variant="ghost" onClick={() => arch.mutate({ row: v, archive: !v.archived_at, userId: me.userId })}>{v.archived_at ? "Restaurar" : "Arquivar"}</Button>}</td>
              </tr>
            );
          })}
        </Table>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Rastreamento em tempo real: integração não configurada.</p>
      <CrudDialog open={open} onOpenChange={setOpen} table="vehicles" title="frota" fields={vehicleFields()} invalidate={[["vehicles"]]} />
    </>
  );
}
