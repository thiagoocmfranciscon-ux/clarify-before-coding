import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { hashInviteToken, inviteUrl, newInviteToken } from "./invite-token";
import { memberPhoneSchema } from "./member-phone";

const roleEnum = z.enum(["admin", "ceo", "diretor_comercial", "gestor_manutencao", "almoxarifado", "tecnico", "rh"]);
const FULL = ["admin", "ceo", "diretor_comercial", "gestor_manutencao"] as const;
const isFull = (r: string) => (FULL as readonly string[]).includes(r);

async function requireAdmin(sb: { rpc: (fn: "my_org" | "my_role") => PromiseLike<{ data: unknown }> }) {
  const { data: org } = await sb.rpc("my_org");
  const { data: role } = await sb.rpc("my_role");
  if (!org || role !== "admin") throw new Error("Apenas administradores podem gerenciar acessos.");
  return org as string;
}

/** Convite individual: vinculado a e-mail e organização, expira em 7 dias, uso único.
 *  O link aponta para /convite/<token> no site publicado; só o hash do token é salvo. */
export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    email: z.string().trim().toLowerCase().email().max(254), role: roleEnum,
    channel: z.enum(["email", "whatsapp"]).default("email"),
    phone: z.string().trim().max(20).optional(), fullName: z.string().trim().max(120).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase as never);
    if (data.channel === "whatsapp" && (data.phone ?? "").replace(/\D/g, "").length < 10) throw new Error("Informe o telefone com DDD.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabaseAdmin.from("invitations").select("id", { count: "exact", head: true }).eq("created_by", context.userId).gte("created_at", since);
    if ((count ?? 0) >= 20) throw new Error("Limite de convites por hora atingido.");
    await supabaseAdmin.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("organization_id", org).eq("email", data.email).is("used_at", null).is("revoked_at", null);
    const token = newInviteToken();
    const { error } = await supabaseAdmin.from("invitations").insert({ organization_id: org, email: data.email, role: data.role, phone: data.phone || null, full_name: data.fullName || null, token_hash: await hashInviteToken(token), expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(), created_by: context.userId });
    if (error) throw new Error("Falha ao registrar convite");
    return { ok: true, link: inviteUrl(token) };
  });

/** Gera um link novo para um convite não usado (o link anterior deixa de funcionar). */
export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin.from("invitations").select("email, phone, full_name, used_at, revoked_at").eq("id", data.id).eq("organization_id", org).maybeSingle();
    if (!inv || inv.used_at || inv.revoked_at) throw new Error("Convite não está pendente.");
    const token = newInviteToken();
    const { error } = await supabaseAdmin.from("invitations").update({ token_hash: await hashInviteToken(token), expires_at: new Date(Date.now() + 7 * 86400_000).toISOString() }).eq("id", data.id);
    if (error) throw new Error("Falha ao gerar o link");
    return { link: inviteUrl(token), phone: inv.phone, fullName: inv.full_name };
  });

/** Exclui um convite não usado; o link dele para de funcionar na hora. */
export const deleteInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: gone, error } = await supabaseAdmin.from("invitations").delete().eq("id", data.id).eq("organization_id", org).select("email, role");
    if (error) throw new Error("Falha ao excluir convite");
    if (!gone?.length) throw new Error("Convite não encontrado.");
    await supabaseAdmin.from("audit_events").insert({ organization_id: org, actor_id: context.userId, action: "invite_deleted", entity: "invitations", entity_id: data.id, changes: { email: gone[0]!.email, role: gone[0]!.role } });
    return { ok: true };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", data.id).eq("organization_id", org).is("used_at", null);
    return { ok: true };
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ memberId: z.string().uuid(), role: roleEnum.optional(), active: z.boolean().optional(), archive: z.boolean().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin.from("organization_members").select("id, user_id, role, active, archived_at, approved_at").eq("id", data.memberId).eq("organization_id", org).maybeSingle();
    if (!m) throw new Error("Associação não encontrada");
    if (m.user_id === context.userId) throw new Error("Você não pode alterar o próprio acesso.");
    const isArchived = !!m.archived_at;
    if (isArchived && data.archive !== false) throw new Error("Restaure o usuário antes de alterar o acesso.");
    const nextRole = data.role ?? m.role;
    // Arquivar sempre encerra o acesso; restaurar volta como revogado.
    const nextActive = data.archive !== undefined ? false : (data.active ?? m.active);
    if (isFull(m.role) && m.active && (!isFull(nextRole) || !nextActive)) {
      const { count } = await supabaseAdmin.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", org).in("role", [...FULL]).eq("active", true);
      if ((count ?? 0) <= 1) throw new Error("A organização precisa de ao menos um administrador ativo.");
    }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { role: nextRole, active: nextActive, updated_at: now };
    if (nextActive && !m.approved_at) { patch["approved_at"] = now; patch["approved_by"] = context.userId; }
    if (data.archive === true) { patch["archived_at"] = now; patch["archived_by"] = context.userId; }
    if (data.archive === false) { patch["archived_at"] = null; patch["archived_by"] = null; }
    const { error } = await supabaseAdmin.from("organization_members").update(patch as never).eq("id", m.id);
    if (error) throw new Error("Falha ao atualizar acesso");
    const action = data.archive === true ? "user_archived" : data.archive === false ? "user_restored" : nextActive ? "role_change" : "access_revoked";
    await supabaseAdmin.from("audit_events").insert({ organization_id: org, actor_id: context.userId, action, entity: "organization_members", entity_id: m.id, changes: { role: { de: m.role, para: nextRole }, active: { de: m.active, para: nextActive }, ...(data.archive !== undefined ? { arquivado: { de: isArchived, para: data.archive } } : {}) } });
    return { ok: true };
  });

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const org = await requireAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: members } = await supabaseAdmin.from("organization_members").select("id, user_id, role, active, created_at, archived_at, approved_at").eq("organization_id", org).order("created_at");
    const { data: invites } = await supabaseAdmin.from("invitations").select("id, email, phone, full_name, role, expires_at, used_at, revoked_at, created_at").eq("organization_id", org).order("created_at", { ascending: false }).limit(100);
    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const emails: Record<string, string> = {};
    for (const id of ids) { const { data: u } = await supabaseAdmin.auth.admin.getUserById(id); if (u.user?.email) emails[id] = u.user.email; }
    return {
      members: (members ?? []).map((m) => ({ ...m, email: emails[m.user_id] ?? "", full_name: profiles?.find((p) => p.id === m.user_id)?.full_name ?? null, phone: profiles?.find((p) => p.id === m.user_id)?.phone ?? null })),
      invites: invites ?? [],
    };
  });

export const updateMemberPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memberId: z.string().uuid(), phone: memberPhoneSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member, error: memberError } = await supabaseAdmin.from("organization_members").select("user_id").eq("id", data.memberId).eq("organization_id", org).maybeSingle();
    if (memberError || !member) throw new Error("Usuário não encontrado nesta organização.");
    const { data: profile, error } = await supabaseAdmin.from("profiles").update({ phone: data.phone || null }).eq("id", member.user_id).select("id").maybeSingle();
    if (error || !profile) throw new Error("Falha ao salvar telefone.");
    await supabaseAdmin.from("audit_events").insert({ organization_id: org, actor_id: context.userId, action: "user_phone_updated", entity: "profiles", entity_id: member.user_id, changes: { phone: data.phone || null } });
    return { ok: true };
  });

/** Exclui definitivamente um usuário já arquivado (conta e acesso). O histórico continua. */
export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ memberId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m } = await supabaseAdmin.from("organization_members").select("id, user_id, role, archived_at").eq("id", data.memberId).eq("organization_id", org).maybeSingle();
    if (!m) throw new Error("Usuário não encontrado");
    if (m.user_id === context.userId) throw new Error("Você não pode excluir a própria conta.");
    if (!m.archived_at) throw new Error("Arquive o usuário antes de excluir.");
    const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", m.user_id).maybeSingle();
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
    await supabaseAdmin.from("technicians").update({ user_id: null }).eq("user_id", m.user_id);
    const { error: e1 } = await supabaseAdmin.from("organization_members").delete().eq("id", m.id);
    if (e1) throw new Error("Falha ao excluir o acesso");
    const { error: e2 } = await supabaseAdmin.auth.admin.deleteUser(m.user_id);
    if (e2) throw new Error("Falha ao excluir a conta");
    await supabaseAdmin.from("audit_events").insert({ organization_id: org, actor_id: context.userId, action: "user_deleted", entity: "organization_members", entity_id: m.id, changes: { nome: prof?.full_name ?? null, email: u.user?.email ?? null, role: m.role } });
    return { ok: true };
  });
