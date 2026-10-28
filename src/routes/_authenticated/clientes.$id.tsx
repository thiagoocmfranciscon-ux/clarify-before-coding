import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/kit";
import { GenericStatus } from "@/components/status";
import { CrudDialog, Table, td, phoneParse, useArchive, type FieldDef } from "@/components/crud";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-membership";
import { PERM } from "@/lib/domain";
import { customerFields, equipmentFields } from "@/components/fields";

const contactFields: FieldDef[] = [
  { key: "name", label: "Nome", required: true }, { key: "role", label: "Cargo" },
  { key: "phone", label: "Telefone/WhatsApp", parse: phoneParse, hint: "Somente números com DDD" }, { key: "email", label: "E-mail", type: "email" },
];

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Nobre" }, { name: "description", content: "Detalhe do cliente." }, { property: "og:title", content: "Cliente — Nobre" }, { property: "og:description", content: "Detalhe do cliente." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams(); const me = useMe(); const mgr = PERM.manage(me.role);
  const [edit, setEdit] = useState(false); const [contact, setContact] = useState<Record<string, unknown> | null | undefined>(undefined); const [eq, setEq] = useState(false);
  const q = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*, customer_contacts(*), equipment(id, serial, manufacturer, model, type, status, archived_at)").eq("id", id).single();
      if (error) throw error; return data;
    },
  });
  const arch = useArchive("customers", [["customer", id], ["customers"]]);
  const archC = useArchive("customer_contacts", [["customer", id]]);
  if (q.isPending) return <LoadingRows />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data;
  return (
    <>
      <PageHeader title={c.legal_name} description={[c.trade_name, c.city && `${c.city}/${c.uf ?? ""}`].filter(Boolean).join(" · ")}
        actions={mgr && <>
          <Button variant="outline" className="min-h-11" onClick={() => setEdit(true)}>Editar</Button>
          <Button variant="outline" className="min-h-11" onClick={() => arch.mutate({ row: c, archive: !c.archived_at, userId: me.userId })}>{c.archived_at ? "Restaurar" : "Arquivar"}</Button>
        </>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-semibold">Dados</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline text-muted-foreground">Documento: </dt><dd className="inline">{c.document ?? "—"}</dd></div>
            <div><dt className="inline text-muted-foreground">Segmento: </dt><dd className="inline">{c.segment ?? "—"}</dd></div>
            <div><dt className="inline text-muted-foreground">Situação: </dt><dd className="inline"><GenericStatus value={c.status} archived={!!c.archived_at} /></dd></div>
            {c.notes && <p className="whitespace-pre-wrap pt-2">{c.notes}</p>}
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Contatos</h2>{mgr && <Button size="sm" variant="outline" onClick={() => setContact(null)}><Plus className="mr-1 h-4 w-4" />Contato</Button>}</div>
          {!c.customer_contacts.filter((x) => !x.archived_at).length ? <p className="text-sm text-muted-foreground">Nenhum contato.</p> : (
            <ul className="divide-y text-sm">
              {c.customer_contacts.filter((x) => !x.archived_at).map((ct) => (
                <li key={ct.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div><span className="font-medium">{ct.name}</span> {ct.role && <span className="text-muted-foreground">· {ct.role}</span>}<div className="text-muted-foreground">{[ct.phone, ct.email].filter(Boolean).join(" · ")}</div></div>
                  <div className="flex gap-1">
                    {ct.phone && <Button asChild size="sm" variant="outline"><a href={`https://wa.me/55${ct.phone}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-4 w-4" />WhatsApp</a></Button>}
                    {mgr && <Button size="sm" variant="ghost" onClick={() => setContact(ct)}>Editar</Button>}
                    {mgr && <Button size="sm" variant="ghost" onClick={() => archC.mutate({ row: ct, archive: true, userId: me.userId })}>Remover</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mb-2 mt-6 flex items-center justify-between"><h2 className="text-lg font-semibold">Equipamentos</h2>{mgr && <Button className="min-h-11" onClick={() => setEq(true)}><Plus className="mr-1 h-4 w-4" />Equipamento</Button>}</div>
      {!c.equipment.length ? <EmptyState title="Nenhum equipamento" /> : (
        <Table head={["Série", "Equipamento", "Tipo", "Situação"]}>
          {c.equipment.map((e) => (
            <tr key={e.id}><td className={td}><Link to="/equipamentos/$id" params={{ id: e.id }} className="font-medium text-primary hover:underline">{e.serial}</Link></td>
              <td className={td}>{e.manufacturer} {e.model}</td><td className={td}>{e.type}</td><td className={td}><GenericStatus value={e.status} archived={!!e.archived_at} /></td></tr>
          ))}
        </Table>
      )}
      <CrudDialog open={edit} onOpenChange={setEdit} table="customers" title="cliente" fields={customerFields} row={c} invalidate={[["customer", id], ["customers"]]} />
      <CrudDialog open={contact !== undefined} onOpenChange={(o) => !o && setContact(undefined)} table="customer_contacts" title="contato" fields={contactFields} row={contact} extra={{ customer_id: id }} invalidate={[["customer", id]]} />
      <CrudDialog open={eq} onOpenChange={setEq} table="equipment" title="equipamento" fields={equipmentFields} extra={{ customer_id: id }} invalidate={[["customer", id], ["equipment"]]} />
    </>
  );
}
