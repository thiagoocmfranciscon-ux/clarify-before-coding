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
import { PERM, ROLE_LABEL, type AppRole } from "@/lib/domain";
import { formatDateTime } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { inviteUser, listMembers, revokeInvitation, updateMember } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/acessos")({
  head: () => ({ meta: [{ title: "Administração de Acessos — Empilha Nobre" }, { name: "description", content: "Convites, papéis e revogação de acesso." }, { property: "og:title", content: "Administração de Acessos — Empilha Nobre" }, { property: "og:description", content: "Convites e papéis." }] }),
  component: Page,
});

const ROLES = Object.keys(ROLE_LABEL) as AppRole[];

function Page() {
  const me = useMe(); const qc = useQueryClient();
  const list = useServerFn(listMembers); const invite = useServerFn(inviteUser); const revoke = useServerFn(revokeInvitation); const update = useServerFn(updateMember);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<AppRole>("tecnico");
  const q = useQuery({ queryKey: ["members"], enabled: PERM.admin(me.role), queryFn: () => list() });
  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ["members"] }); };
  const inv = useMutation({ mutationFn: () => invite({ data: { email, role, redirectTo: window.location.origin } }), onSuccess: (r) => { setEmail(""); done(r.existingUser ? "Convite registrado. O usuário já tem conta: ao entrar, o acesso é liberado." : r.emailSent ? "Convite enviado por e-mail" : "Convite registrado"); if (r.link) { navigator.clipboard?.writeText(r.link).catch(() => {}); toast.info("Link de acesso copiado. Envie pelo WhatsApp se o e-mail não chegar.", { duration: 8000 }); } }, onError: (e) => toast.error(friendlyError(e)) });
  const upd = useMutation({ mutationFn: (d: { memberId: string; role?: AppRole; active?: boolean }) => update({ data: d }), onSuccess: () => done("Acesso atualizado"), onError: (e) => toast.error(friendlyError(e)) });
  const rev = useMutation({ mutationFn: (id: string) => revoke({ data: { id } }), onSuccess: () => done("Convite revogado"), onError: (e) => toast.error(friendlyError(e)) });
  if (!PERM.admin(me.role)) return <NoPermission />;
  const now = new Date().toISOString();
  return (
    <>
      <PageHeader title="Administração de Acessos" description="Convites individuais valem 7 dias e podem ser usados uma única vez." />
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Convidar usuário</h2>
        <form className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); inv.mutate(); }}>
          <Field id="ie" label="E-mail"><Input id="ie" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field id="ir" label="Papel"><select id="ir" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as AppRole)}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
          <Button type="submit" className="min-h-11" disabled={inv.isPending || !email}>{inv.isPending ? "Enviando…" : "Convidar"}</Button>
        </form>
      </Card>
      {q.isPending ? <LoadingRows /> : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          <h2 className="mb-2 text-lg font-semibold">Usuários</h2>
          <Table head={["Nome", "E-mail", "Papel", "Situação", ""]}>
            {q.data.members.map((m) => (
              <tr key={m.id}>
                <td className={td}>{m.full_name ?? "—"}</td><td className={td}>{m.email}</td>
                <td className={td}>{m.user_id === me.userId ? ROLE_LABEL[m.role as AppRole] : <select className={`${selectClass} h-9`} value={m.role} onChange={(e) => upd.mutate({ memberId: m.id, role: e.target.value as AppRole })} aria-label="Papel">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>}</td>
                <td className={td}>{m.active ? <Pill tone="success">Ativo</Pill> : <Pill tone="danger">Revogado</Pill>}</td>
                <td className={td}>{m.user_id !== me.userId && <Button size="sm" variant="outline" onClick={() => upd.mutate({ memberId: m.id, active: !m.active })}>{m.active ? "Revogar acesso" : "Reativar"}</Button>}</td>
              </tr>
            ))}
          </Table>
          <h2 className="mb-2 mt-6 text-lg font-semibold">Convites</h2>
          <Table head={["E-mail", "Papel", "Enviado", "Situação", ""]}>
            {q.data.invites.map((i) => {
              const st = i.used_at ? "Usado" : i.revoked_at ? "Revogado" : i.expires_at < now ? "Expirado" : "Pendente";
              return (
                <tr key={i.id}><td className={td}>{i.email}</td><td className={td}>{ROLE_LABEL[i.role as AppRole]}</td><td className={td}>{formatDateTime(i.created_at)}</td>
                  <td className={td}><Pill tone={st === "Pendente" ? "warning" : st === "Usado" ? "success" : "neutral"}>{st}</Pill></td>
                  <td className={td}>{st === "Pendente" && <Button size="sm" variant="ghost" onClick={() => rev.mutate(i.id)}>Revogar</Button>}</td></tr>
              );
            })}
          </Table>
        </>
      )}
    </>
  );
}
