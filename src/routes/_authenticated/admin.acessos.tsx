import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card, ErrorState, Field, LoadingRows, NoPermission, PageHeader, Pill, selectClass } from "@/components/kit";
import { Table, td } from "@/components/crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-membership";
import { ASSIGNABLE_ROLES, PERM, ROLE_LABEL, type AppRole } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { deleteInvitation, inviteUser, listMembers, resendInvite, updateMember } from "@/lib/admin.functions";
import { memberStatus } from "@/lib/domain";
import { Archive, ArrowLeft, Copy, Link2, Trash2 } from "lucide-react";
import { WhatsAppIcon, waLink } from "@/components/icons";

const waText = (name: string | null | undefined, link: string) => `Olá${name ? ` ${name.split(" ")[0]}` : ""}! Você foi convidado para o sistema Empilha Nobre. Toque no link para criar sua senha e entrar:\n${link}`;
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/acessos")({
  head: () => ({ meta: [{ title: "Administração de Acessos — Empilha Nobre" }, { name: "description", content: "Convites, papéis e revogação de acesso." }, { property: "og:title", content: "Administração de Acessos — Empilha Nobre" }, { property: "og:description", content: "Convites e papéis." }] }),
  component: Page,
});

const ROLES = ASSIGNABLE_ROLES;

function Page() {
  const me = useMe(); const qc = useQueryClient();
  const list = useServerFn(listMembers); const invite = useServerFn(inviteUser); const remove = useServerFn(deleteInvitation); const update = useServerFn(updateMember); const resend = useServerFn(resendInvite);
  const [email, setEmail] = useState(""); const [channel, setChannel] = useState<"email" | "whatsapp">("email"); const [phone, setPhone] = useState(""); const [fullName, setFullName] = useState(""); const [role, setRole] = useState<AppRole>("tecnico");
  const [showArchived, setShowArchived] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; archive: boolean } | null>(null);
  const q = useQuery({ queryKey: ["members"], enabled: PERM.admin(me.role), queryFn: () => list() });
  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ["members"] }); };
  const copyLink = (link: string, msg: string) => {
    navigator.clipboard?.writeText(link).then(() => toast.success(msg, { description: "Cole no e-mail, WhatsApp ou SMS da pessoa.", duration: 8000 })).catch(() => toast.info(link, { duration: 20000 }));
  };
  const inv = useMutation({
    mutationFn: () => invite({ data: { email, role, channel, phone, fullName } }),
    onSuccess: (r) => {
      if (channel === "whatsapp") {
        const url = waLink(phone, waText(fullName, r.link));
        if (url) window.open(url, "_blank", "noopener");
        done("Convite criado. Envie a mensagem no WhatsApp.");
      } else {
        done("Convite criado");
        copyLink(r.link, "Link do convite copiado");
      }
      setEmail(""); setPhone(""); setFullName("");
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const rs = useMutation({
    mutationFn: (v: { id: string; via: "copy" | "whatsapp" }) => resend({ data: { id: v.id } }).then((r) => ({ ...r, via: v.via })),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["members"] });
      if (r.via === "whatsapp") { const url = waLink(r.phone, waText(r.fullName, r.link)); if (url) window.open(url, "_blank", "noopener"); }
      else copyLink(r.link, "Novo link copiado. O link anterior deixou de funcionar.");
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const upd = useMutation({ mutationFn: (d: { memberId: string; role?: AppRole; active?: boolean; archive?: boolean }) => update({ data: d }), onSuccess: (_r, d) => done(d.archive === true ? "Usuário arquivado" : d.archive === false ? "Usuário restaurado. Reative o acesso quando quiser." : "Acesso atualizado"), onError: (e) => toast.error(friendlyError(e)) });
  const del = useMutation({ mutationFn: (id: string) => remove({ data: { id } }), onSuccess: () => done("Convite excluído"), onError: (e) => toast.error(friendlyError(e)) });
  const [delId, setDelId] = useState<string | null>(null);
  if (!PERM.admin(me.role)) return <NoPermission />;
  const now = new Date().toISOString();
  return (
    <>
      <PageHeader title="Administração de Acessos" description="Cada convite gera um link do site, válido por 7 dias e de uso único. A pessoa abre o link e cria a própria senha." />
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Convidar usuário</h2>
        <div className="mb-3 inline-flex rounded-lg border p-1" role="tablist">
          <Button type="button" size="sm" variant={channel === "email" ? "default" : "ghost"} onClick={() => setChannel("email")}><Link2 className="mr-1 h-4 w-4" />Copiar link</Button>
          <Button type="button" size="sm" variant={channel === "whatsapp" ? "default" : "ghost"} onClick={() => setChannel("whatsapp")}><WhatsAppIcon className="mr-1 h-4 w-4" />Por WhatsApp</Button>
        </div>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] lg:items-end" onSubmit={(e) => { e.preventDefault(); inv.mutate(); }}>
          <Field id="in" label="Nome"><Input id="in" className="h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          {channel === "whatsapp" && <Field id="ip" label="Telefone (com DDD)"><Input id="ip" type="tel" inputMode="tel" placeholder="(11) 98765-4321" className="h-11" value={phone} onChange={(e) => setPhone(e.target.value)} required /></Field>}
          <Field id="ie" label="E-mail (usado para entrar)"><Input id="ie" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field id="ir" label="Papel"><select id="ir" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as AppRole)}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
          <Button type="submit" className="min-h-11" disabled={inv.isPending || !email || (channel === "whatsapp" && !phone)}>{inv.isPending ? "Enviando…" : channel === "whatsapp" ? "Convidar pelo WhatsApp" : "Enviar link"}</Button>
        </form>
      </Card>
      {q.isPending ? <LoadingRows /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          {(() => {
            const archived = q.data.members.filter((m) => memberStatus(m) === "archived");
            const current = q.data.members.filter((m) => memberStatus(m) !== "archived");
            return (<>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{showArchived ? "Usuários arquivados" : "Usuários"}</h2>
                <Button variant="outline" className="min-h-10" onClick={() => setShowArchived((v) => !v)}>
                  {showArchived ? <><ArrowLeft className="mr-1 h-4 w-4" />Voltar aos usuários</> : <><Archive className="mr-1 h-4 w-4" />Usuários arquivados ({archived.length})</>}
                </Button>
              </div>
              {showArchived ? (
                <Table head={["Nome", "E-mail", "Papel", "Arquivado em", "Situação", "Ações"]}>
                  {archived.length === 0 && <tr><td className={td} colSpan={6}>Nenhum usuário arquivado.</td></tr>}
                  {archived.map((m) => (
                    <tr key={m.id}>
                      <td className={td}>{m.full_name ?? "—"}</td><td className={td}>{m.email}</td>
                      <td className={td}>{ROLE_LABEL[m.role as AppRole]}</td>
                      <td className={td}>{m.archived_at ? formatDateTime(m.archived_at) : "—"}</td>
                      <td className={td}><Pill tone="neutral">Arquivado</Pill></td>
                      <td className={td}><Button size="sm" variant="outline" onClick={() => setConfirm({ id: m.id, archive: false })}>Restaurar</Button></td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <Table head={["Nome", "E-mail", "Papel", "Situação", ""]}>
                  {current.map((m) => (
                    <tr key={m.id}>
                      <td className={td}><div>{m.full_name ?? "—"}</div>{m.phone && <div className="text-xs text-muted-foreground">{m.phone}</div>}</td><td className={td}>{m.email}</td>
                      <td className={td}>{m.user_id === me.userId ? ROLE_LABEL[m.role as AppRole] : <select className={`${selectClass} h-9`} value={m.role} onChange={(e) => upd.mutate({ memberId: m.id, role: e.target.value as AppRole })} aria-label="Papel">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>}</td>
                      <td className={td}>{m.active ? <Pill tone="success">Ativo</Pill> : <Pill tone="danger">Revogado</Pill>}</td>
                      <td className={td}>{m.user_id !== me.userId && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button size="sm" variant="outline" onClick={() => upd.mutate({ memberId: m.id, active: !m.active })}>{m.active ? "Revogar acesso" : "Reativar"}</Button>
                          <Button size="sm" variant="outline" onClick={() => setConfirm({ id: m.id, archive: true })}><Archive className="mr-1 h-4 w-4" />Arquivar</Button>
                        </div>
                      )}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </>);
          })()}
          <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirm?.archive ? "Arquivar usuário?" : "Restaurar usuário?"}</AlertDialogTitle>
                <AlertDialogDescription>{confirm?.archive
                  ? "Este usuário não trabalha mais na empresa? Ao arquivar, ele será removido da lista de usuários ativos, mas seu histórico será preservado."
                  : "Este usuário voltará para a lista de usuários e poderá ter seu acesso reativado."}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if (confirm) upd.mutate({ memberId: confirm.id, archive: confirm.archive }); setConfirm(null); }}>
                  {confirm?.archive ? "Arquivar usuário" : "Restaurar usuário"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <h2 className="mb-2 mt-6 text-lg font-semibold">Convites</h2>
          <Table head={["E-mail", "Telefone", "Papel", "Enviado", "Situação", ""]}>
            {q.data.invites.map((i) => {
              const st = i.used_at ? "Usado" : i.revoked_at ? "Revogado" : i.expires_at < now ? "Expirado" : "Pendente";
              return (
                <tr key={i.id}><td className={td}>{i.full_name ? <><div className="font-medium">{i.full_name}</div><div className="text-xs text-muted-foreground">{i.email}</div></> : i.email}</td><td className={td}>{i.phone ?? "—"}</td><td className={td}>{ROLE_LABEL[i.role as AppRole]}</td><td className={td}>{formatDateTime(i.created_at)}</td>
                  <td className={td}><Pill tone={st === "Pendente" ? "warning" : st === "Usado" ? "success" : "neutral"}>{st}</Pill></td>
                  <td className={td}>{st !== "Usado" && (
                    <div className="flex flex-wrap gap-1">
                      {(st === "Pendente" || st === "Expirado") && <>
                        <Button size="sm" variant="outline" disabled={rs.isPending} onClick={() => rs.mutate({ id: i.id, via: "copy" })}><Copy className="mr-1 h-4 w-4" />Gerar novo link</Button>
                        {i.phone && <Button size="sm" variant="outline" disabled={rs.isPending} onClick={() => rs.mutate({ id: i.id, via: "whatsapp" })} aria-label="Reenviar pelo WhatsApp"><WhatsAppIcon /></Button>}
                      </>}
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={del.isPending} onClick={() => setDelId(i.id)} aria-label="Excluir convite"><Trash2 className="mr-1 h-4 w-4" />Excluir</Button>
                    </div>)}</td></tr>
              );
            })}
          </Table>
          <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir este convite?</AlertDialogTitle>
                <AlertDialogDescription>O convite sai da lista e o link enviado para a pessoa deixa de funcionar na hora.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (delId) del.mutate(delId); setDelId(null); }}>Excluir convite</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
