import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { CrudDialog, Table, td, type FieldDef } from "@/components/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { formatNumber } from "@/lib/format";

export const equipmentFields: FieldDef[] = [
  { key: "serial", label: "Número de série", required: true },
  { key: "manufacturer", label: "Fabricante", required: true },
  { key: "model", label: "Modelo", required: true },
  { key: "type", label: "Tipo", required: true, hint: "Ex.: Empilhadeira a combustão, elétrica, transpaleteira" },
  { key: "status", label: "Situação", type: "select", required: true, options: [{ value: "operacional", label: "Operacional" }, { value: "em_manutencao", label: "Em manutenção" }, { value: "parado", label: "Parado" }, { value: "inativo", label: "Inativo" }] },
];

export const Route = createFileRoute("/_authenticated/equipamentos/")({
  head: () => ({ meta: [{ title: "Equipamentos — Nobre" }, { name: "description", content: "Equipamentos dos clientes." }, { property: "og:title", content: "Equipamentos — Nobre" }, { property: "og:description", content: "Equipamentos dos clientes." }] }),
  component: Page,
});

function Page() {
  const me = useMe(); const [q, setQ] = useState(""); const [open, setOpen] = useState(false); const [cust, setCust] = useState("");
  const customers = useQuery({ queryKey: ["customers-min"], queryFn: async () => (await supabase.from("customers").select("id, legal_name").is("archived_at", null).order("legal_name")).data ?? [] });
  const list = useQuery({
    queryKey: ["equipment", q],
    queryFn: async () => {
      let s = supabase.from("equipment").select("id, serial, manufacturer, model, type, status, hour_meter, archived_at, customers(legal_name)").is("archived_at", null).order("serial").limit(300);
      if (q.trim()) s = s.or(`serial.ilike.%${q.trim()}%,model.ilike.%${q.trim()}%,manufacturer.ilike.%${q.trim()}%`);
      const { data, error } = await s; if (error) throw error; return data;
    },
  });
  const fields: FieldDef[] = [{ key: "customer_id", label: "Cliente", type: "select", required: true, options: (customers.data ?? []).map((c) => ({ value: c.id, label: c.legal_name })) }, ...equipmentFields];
  return (
    <>
      <PageHeader title="Equipamentos" actions={PERM.manage(me.role) && <Button className="min-h-11" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Novo equipamento</Button>} />
      <Input placeholder="Buscar série, modelo ou fabricante" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 h-11 max-w-sm" aria-label="Buscar" />
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data.length ? <EmptyState title="Nenhum equipamento" /> : (
        <Table head={["Série", "Equipamento", "Cliente", "Horímetro", "Situação"]}>
          {list.data.map((e) => (
            <tr key={e.id}><td className={td}><Link to="/equipamentos/$id" params={{ id: e.id }} className="font-medium text-primary hover:underline">{e.serial}</Link></td>
              <td className={td}>{e.manufacturer} {e.model}<div className="text-xs text-muted-foreground">{e.type}</div></td>
              <td className={td}>{e.customers?.legal_name}</td><td className={td}>{e.hour_meter !== null ? `${formatNumber(e.hour_meter)} h` : "—"}</td>
              <td className={td}><GenericStatus value={e.status} /></td></tr>
          ))}
        </Table>
      )}
      {cust === "" && null}
      <CrudDialog open={open} onOpenChange={(o) => { setOpen(o); setCust(""); }} table="equipment" title="equipamento" fields={fields} invalidate={[["equipment"]]} />
    </>
  );
}
