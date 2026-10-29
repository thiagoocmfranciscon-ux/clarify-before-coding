import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const roleEnum = z.enum(["admin", "gestor", "tecnico", "almoxarife", "leitura"]);

async function requireAdmin(sb: { rpc: (fn: "my_org" | "my_role") => PromiseLike<{ data: unknown }> }) {
  const { data: org } = await sb.rpc("my_org");
  const { data: role } = await sb.rpc("my_role");
  if (!org || role !== "admin") throw new Error("Apenas administradores podem gerenciar acessos.");
  return org as string;
}

/** Convite individual: vinculado a e-mail e organização, expira em 7 dias, uso único. */
export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(254), role: roleEnum, redirectTo: z.string().url() }).parse(i))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabaseAdmin.from("invitations").select("id", { count: "exact", head: true }).eq("created_by", context.userId).gte("created_at", since);
    if ((count ?? 0) >= 20) throw new Error("Limite de convites por hora atingido.");
    await supabaseAdmin.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("organization_id", org).eq("email", data.email).is("used_at", null).is("revoked_at", null);
    const { error } = await supabaseAdmin.from("invitations").insert({ organization_id: org, email: data.email, role: data.role, expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(), created_by: context.userId });
    if (error) throw new Error("Falha ao registrar convite");
    const redirect = new URL(data.redirectTo);
    const { error: ie } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${redirect.origin}/reset-password` });
    const existingUser = !!ie && /already|registered/i.test(ie.message);
    const { data: link } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email: data.email, options: { redirectTo: `${redirect.origin}/reset-password` } });
    return { ok: true, existingUser, emailSent: !ie, link: link?.properties?.action_link ?? null };
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
    const { data: m } = await supabaseAdmin.from("organization_members").select("id, user_id, role, active, archived_at").eq("id", data.memberId).eq("organization_id", org).maybeSingle();
    if (!m) throw new Error("Associação não encontrada");
    if (m.user_id === context.userId) throw new Error("Você não pode alterar o próprio acesso.");
    const isArchived = !!m.archived_at;
    if (isArchived && data.archive !== false) throw new Error("Restaure o usuário antes de alterar o acesso.");
    const nextRole = data.role ?? m.role;
    // Arquivar sempre encerra o acesso; restaurar volta como revogado.
    const nextActive = data.archive !== undefined ? false : (data.active ?? m.active);
    if (m.role === "admin" && m.active && (nextRole !== "admin" || !nextActive)) {
      const { count } = await supabaseAdmin.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("role", "admin").eq("active", true);
      if ((count ?? 0) <= 1) throw new Error("A organização precisa de ao menos um administrador ativo.");
    }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { role: nextRole, active: nextActive, updated_at: now };
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
    const { data: members } = await supabaseAdmin.from("organization_members").select("id, user_id, role, active, created_at, archived_at").eq("organization_id", org).order("created_at");
    const { data: invites } = await supabaseAdmin.from("invitations").select("id, email, role, expires_at, used_at, revoked_at, created_at").eq("organization_id", org).order("created_at", { ascending: false }).limit(100);
    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const emails: Record<string, string> = {};
    for (const id of ids) { const { data: u } = await supabaseAdmin.auth.admin.getUserById(id); if (u.user?.email) emails[id] = u.user.email; }
    return {
      members: (members ?? []).map((m) => ({ ...m, email: emails[m.user_id] ?? "", full_name: profiles?.find((p) => p.id === m.user_id)?.full_name ?? null })),
      invites: invites ?? [],
    };
  });
