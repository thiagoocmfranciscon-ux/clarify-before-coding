import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { CrudDialog, Table, td, phoneParse, useArchive, type FieldDef } from "@/components/crud";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { formatBRL } from "@/lib/format";

const fields: FieldDef[] = [
  { key: "code", label: "Código", required: true, hint: "Letras, números e hífen" },
  { key: "name", label: "Nome", required: true },
  { key: "specialty", label: "Especialidade" },
  { key: "status", label: "Situação", type: "select", required: true, options: [{ value: "disponivel", label: "Disponível" }, { value: "em_servico", label: "Em serviço" }, { value: "afastado", label: "Afastado" }, { value: "inativo", label: "Inativo" }] },
];
const privFields: FieldDef[] = [
  { key: "phone", label: "Telefone", parse: phoneParse },
  { key: "hourly_cost", label: "Custo por hora (R$)", type: "number" },
];

export const Route = createFileRoute("/_authenticated/tecnicos")({
  head: () => ({ meta: [{ title: "Técnicos — Nobre" }, { name: "description", content: "Equipe técnica." }, { property: "og:title", content: "Técnicos — Nobre" }, { property: "og:description", content: "Equipe técnica." }] }),
  component: Page,
});

function Page() {
  const me = useMe(); const mgr = PERM.manage(me.role);
  const [row, setRow] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [priv, setPriv] = useState<{ id: string; row: Record<string, unknown> | null } | null>(null);
  const list = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("*").is("archived_at", null).order("name");
      if (error) throw error;
      const p = mgr ? (await supabase.from("technician_private").select("*")).data ?? [] : [];
      return data.map((t) => ({ ...t, priv: p.find((x) => x.technician_id === t.id) ?? null }));
    },
  });
  const arch = useArchive("technicians", [["technicians"]]);
  return (
    <>
      <PageHeader title="Técnicos" actions={mgr && <Button className="min-h-11" onClick={() => setRow(null)}><Plus className="mr-1 h-4 w-4" />Novo técnico</Button>} />
      {list.isPending ? <LoadingRows /> : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data.length ? <EmptyState title="Nenhum técnico" /> : (
        <Table head={mgr ? ["Código", "Nome", "Especialidade", "Telefone", "Custo/h", "Situação", ""] : ["Código", "Nome", "Especialidade", "Situação"]}>
          {list.data.map((t) => (
            <tr key={t.id}>
              <td className={td}>{t.code}</td><td className={`${td} font-medium`}>{t.name}</td><td className={td}>{t.specialty ?? "—"}</td>
              {mgr && <><td className={td}>{t.priv?.phone ?? "—"}</td><td className={td}>{formatBRL(t.priv?.hourly_cost)}</td></>}
              <td className={td}><GenericStatus value={t.status} /></td>
              {mgr && <td className={`${td} whitespace-nowrap text-right`}>
                <Button size="sm" variant="ghost" onClick={() => setRow(t)}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => setPriv({ id: t.id, row: t.priv })}>Custo/contato</Button>
                <Button size="sm" variant="ghost" onClick={() => arch.mutate({ row: t, archive: true, userId: me.userId })}>Arquivar</Button>
              </td>}
            </tr>
          ))}
        </Table>
      )}
      <CrudDialog open={row !== undefined} onOpenChange={(o) => !o && setRow(undefined)} table="technicians" title="técnico" fields={fields} row={row} invalidate={[["technicians"]]} />
      {priv && <CrudDialog open onOpenChange={(o) => !o && setPriv(null)} table="technician_private" title="dados restritos" fields={privFields}
        idKey="technician_id" row={priv.row} extra={{ technician_id: priv.id }} invalidate={[["technicians"]]} />}
    </>
  );
}
