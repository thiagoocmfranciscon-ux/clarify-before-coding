import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { ArchivedToggle, CrudDialog, Table, td, useArchive, type FieldDef } from "@/components/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { equipmentFields } from "@/components/fields";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import { DeleteEquipmentButton } from "@/components/equipment-delete";


export const Route = createFileRoute("/_authenticated/equipamentos/")({
  head: () => ({ meta: [{ title: "Equipamentos — Empilha Nobre" }, { name: "description", content: "Equipamentos dos clientes." }, { property: "og:title", content: "Equipamentos — Empilha Nobre" }, { property: "og:description", content: "Equipamentos dos clientes." }] }),
  component: Page,
});

function Page() {
  const me = useMe(); const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [cust, setCust] = useState(""); const [archived, setArchived] = useState(false);
  const arch = useArchive("equipment", [["equipment"]]);
  const customers = useQuery({ queryKey: ["customers-min"], queryFn: async () => (await supabase.from("customers").select("id, legal_name").is("archived_at", null).order("legal_name")).data ?? [] });
  const list = useQuery({
    queryKey: ["equipment", q, archived],
    queryFn: async () => {
      let s = supabase.from("equipment").select("id, version, serial, manufacturer, model, type, status, hour_meter, archived_at, customers(legal_name)").order("serial").limit(300);
      s = archived ? s.not("archived_at", "is", null) : s.is("archived_at", null);
      if (q.trim()) s = s.or(`serial.ilike.%${q.trim()}%,model.ilike.%${q.trim()}%,manufacturer.ilike.%${q.trim()}%`);
      const { data, error } = await s; if (error) throw error; return data;
    },
  });
  const fields: FieldDef[] = [{
    key: "customer_id", label: "Cliente", type: "datalist", required: true,
    hint: "Digite o nome; se for um cliente novo, ele é cadastrado automaticamente.",
    options: (customers.data ?? []).map((c) => ({ value: c.id, label: c.legal_name })),
    resolve: async (name) => {
      const found = (customers.data ?? []).find((c) => c.legal_name.trim().toLowerCase() === name.trim().toLowerCase());
      if (found) return found.id;
      const { data, error } = await supabase.from("customers").insert({ legal_name: name.trim() } as never).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
  }, ...equipmentFields];
  return (
    <>
      <PageHeader title="Equipamentos" actions={PERM.manage(me.role) && <Button className="min-h-11" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Novo equipamento</Button>} />
      <div className="mb-3 flex flex-wrap gap-2"><Input placeholder="Buscar série, modelo ou fabricante" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-sm" aria-label="Buscar" /><ArchivedToggle value={archived} onChange={setArchived} /></div>
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data.length ? <EmptyState title="Nenhum equipamento" /> : (
        <Table head={["Série", "Equipamento", "Cliente", "Horímetro", "Situação", ""]}>
          {list.data.map((e) => (
            <tr key={e.id} className={e.archived_at ? "opacity-60" : ""}><td className={td}><Link to="/equipamentos/$id" params={{ id: e.id }} className="font-medium text-primary hover:underline">{e.serial}</Link></td>
              <td className={td}>{e.manufacturer} {e.model}<div className="text-xs text-muted-foreground">{e.type}</div></td>
              <td className={td}>{e.customers?.legal_name}</td><td className={td}>{e.hour_meter !== null ? `${formatNumber(e.hour_meter)} h` : "—"}</td>
              <td className={td}><GenericStatus value={e.status} archived={!!e.archived_at} /></td>
              <td className={`${td} text-right`}>{PERM.manage(me.role) && <div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => arch.mutate({ row: e as never, archive: !e.archived_at, userId: me.userId })}>{e.archived_at ? "Restaurar" : "Arquivar"}</Button><DeleteEquipmentButton id={e.id} serial={e.serial} /></div>}</td></tr>
          ))}
        </Table>
      )}
      <CrudDialog open={open} onOpenChange={(o) => { setOpen(o); setCust(""); }} table="equipment" title="equipamento" fields={fields} invalidate={[["equipment"], ["customers-min"]]} />
    </>
  );
}
