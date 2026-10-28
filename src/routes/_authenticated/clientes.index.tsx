import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { CrudDialog, Table, td, docParse, ufParse, type FieldDef } from "@/components/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";

export const customerFields: FieldDef[] = [
  { key: "legal_name", label: "Razão social / nome", required: true },
  { key: "trade_name", label: "Nome fantasia" },
  { key: "document", label: "CPF/CNPJ", parse: docParse },
  { key: "segment", label: "Segmento" },
  { key: "city", label: "Cidade" },
  { key: "uf", label: "UF", parse: ufParse },
  { key: "status", label: "Situação", type: "select", required: true, options: [{ value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" }] },
  { key: "notes", label: "Observações", type: "textarea" },
];

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Nobre" }, { name: "description", content: "Cadastro de clientes da Nobre Empilhadeiras." }, { property: "og:title", content: "Clientes — Nobre" }, { property: "og:description", content: "Cadastro de clientes." }] }),
  component: Page,
});

function Page() {
  const me = useMe();
  const [q, setQ] = useState(""); const [archived, setArchived] = useState(false); const [open, setOpen] = useState(false);
  const list = useQuery({
    queryKey: ["customers", q, archived],
    queryFn: async () => {
      let s = supabase.from("customers").select("id, legal_name, trade_name, city, uf, status, archived_at, equipment(count)").order("legal_name").limit(200);
      s = archived ? s.not("archived_at", "is", null) : s.is("archived_at", null);
      if (q.trim()) s = s.or(`legal_name.ilike.%${q.trim()}%,trade_name.ilike.%${q.trim()}%`);
      const { data, error } = await s; if (error) throw error; return data;
    },
  });
  return (
    <>
      <PageHeader title="Clientes" description="Empresas atendidas e seus equipamentos." actions={PERM.manage(me.role) && <Button className="min-h-11" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Novo cliente</Button>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-xs" aria-label="Buscar" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />Arquivados</label>
      </div>
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data.length ? <EmptyState title="Nenhum cliente" /> : (
        <Table head={["Cliente", "Cidade", "Equipamentos", "Situação"]}>
          {list.data.map((c) => (
            <tr key={c.id} className="hover:bg-muted/40">
              <td className={td}><Link to="/clientes/$id" params={{ id: c.id }} className="font-medium text-primary hover:underline">{c.legal_name}</Link>{c.trade_name && <div className="text-xs text-muted-foreground">{c.trade_name}</div>}</td>
              <td className={td}>{c.city ? `${c.city}${c.uf ? `/${c.uf}` : ""}` : "—"}</td>
              <td className={td}>{(c.equipment as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
              <td className={td}><GenericStatus value={c.status} archived={!!c.archived_at} /></td>
            </tr>
          ))}
        </Table>
      )}
      <CrudDialog open={open} onOpenChange={setOpen} table="customers" title="cliente" fields={customerFields} invalidate={[["customers"]]} />
    </>
  );
}
