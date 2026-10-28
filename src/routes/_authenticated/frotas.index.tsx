import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, NoPermission, PageHeader, Pill } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { CrudDialog, Table, td } from "@/components/crud";
import { vehicleFields } from "@/components/fields";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { addDays, formatDate, formatNumber, spDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/frotas/")({
  head: () => ({ meta: [{ title: "Frotas — Empilha Nobre" }, { name: "description", content: "Veículos de apoio." }, { property: "og:title", content: "Frotas — Empilha Nobre" }, { property: "og:description", content: "Veículos de apoio." }] }),
  component: Page,
});

function Page() {
  const me = useMe(); const [open, setOpen] = useState(false);
  const techs = useQuery({ queryKey: ["techs-min"], queryFn: async () => (await supabase.from("technicians").select("id, name").is("archived_at", null).order("name")).data ?? [] });
  const list = useQuery({
    queryKey: ["vehicles"], enabled: PERM.fleet(me.role) || me.role === "tecnico",
    queryFn: async () => { const { data, error } = await supabase.from("vehicles").select("*, technicians(name)").is("archived_at", null).order("plate"); if (error) throw error; return data; },
  });
  if (!PERM.fleet(me.role) && me.role !== "tecnico") return <NoPermission />;
  const today = spDate(); const soon = addDays(today, 30);
  return (
    <>
      <PageHeader title="Frotas" description="Veículos de apoio, revisões e despesas." actions={PERM.manage(me.role) && <Button className="min-h-11" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Novo veículo</Button>} />
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data.length ? <EmptyState title="Nenhum veículo" /> : (
        <Table head={["Placa", "Veículo", "Motorista", "Odômetro", "Próx. revisão", "Seguro", "Situação"]}>
          {list.data.map((v) => {
            const kmDue = v.next_service_km !== null && v.odometer !== null && v.odometer >= v.next_service_km;
            const dateDue = !!v.next_service_date && v.next_service_date < today;
            return (
              <tr key={v.id}>
                <td className={td}><Link to="/frotas/$id" params={{ id: v.id }} className="font-medium text-primary hover:underline">{v.plate}</Link></td>
                <td className={td}>{v.model} {v.year ?? ""}<div className="text-xs text-muted-foreground">{v.type}</div></td>
                <td className={td}>{v.technicians?.name ?? "—"}</td>
                <td className={td}>{v.odometer !== null ? `${formatNumber(v.odometer)} km` : "—"}</td>
                <td className={td}>{[v.next_service_km && `${formatNumber(v.next_service_km)} km`, formatDate(v.next_service_date)].filter((x) => x && x !== "—").join(" / ") || "—"} {(kmDue || dateDue) && <Pill tone="danger">Vencida</Pill>}</td>
                <td className={td}>{formatDate(v.insurance_due)} {v.insurance_due && v.insurance_due < today ? <Pill tone="danger">Vencido</Pill> : v.insurance_due && v.insurance_due <= soon ? <Pill tone="warning">Vence em breve</Pill> : null}</td>
                <td className={td}><GenericStatus value={v.status} /></td>
              </tr>
            );
          })}
        </Table>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Rastreamento em tempo real: integração não configurada.</p>
      <CrudDialog open={open} onOpenChange={setOpen} table="vehicles" title="veículo" fields={vehicleFields((techs.data ?? []).map((t) => ({ value: t.id, label: t.name })))} invalidate={[["vehicles"]]} />
    </>
  );
}
