import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashInviteToken, inviteState, maskEmail, MIN_PASSWORD } from "./invite-token";

const tokenSchema = z.string().trim().min(20).max(100).regex(/^[A-Za-z0-9_-]+$/);

/** Público: mostra só nome, e-mail mascarado e papel. Não consome o convite. */
export const getInvitePreview = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: tokenSchema }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await hashInviteToken(data.token);
    const { data: inv } = await supabaseAdmin.from("invitations").select("email, full_name, role, used_at, revoked_at, expires_at").eq("token_hash", hash).maybeSingle();
    const state = inviteState(inv);
    if (state !== "valid" || !inv) return { state, email: null, fullName: null, role: null };
    return { state, email: maskEmail(inv.email), fullName: inv.full_name, role: inv.role };
  });

/** Público: cria (ou completa) a conta com a senha escolhida e libera o acesso. */
export const acceptInviteWithPassword = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: tokenSchema, password: z.string().min(MIN_PASSWORD, `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`).max(72) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await hashInviteToken(data.token);
    const { data: inv } = await supabaseAdmin.from("invitations").select("id, organization_id, email, full_name, role, used_at, revoked_at, expires_at, created_by").eq("token_hash", hash).maybeSingle();
    if (inviteState(inv) !== "valid" || !inv) throw new Error("Este convite não é mais válido. Peça um novo ao administrador.");

    // Marca como usado primeiro (só um aceite vence em caso de duplo clique).
    const { data: claimed } = await supabaseAdmin.from("invitations").update({ used_at: new Date().toISOString() }).eq("id", inv.id).is("used_at", null).is("revoked_at", null).select("id");
    if (!claimed?.length) throw new Error("Este convite não é mais válido. Peça um novo ao administrador.");

    try {
      let userId: string | null = null;
      const created = await supabaseAdmin.auth.admin.createUser({ email: inv.email, password: data.password, email_confirm: true, user_metadata: { full_name: inv.full_name ?? undefined } });
      const cerr = created.error as { code?: string; message?: string } | null;
      if (cerr && (cerr.code === "weak_password" || /weak|pwned|leaked|compromised/i.test(cerr.message ?? ""))) throw new Error("weak_password");
      if (created.data.user) userId = created.data.user.id;
      else {
        // Conta já existe (convite antigo ficou pela metade): define a senha.
        for (let page = 1; page <= 10 && !userId; page++) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          const u = list?.users.find((x) => x.email?.toLowerCase() === inv.email);
          if (u) userId = u.id;
          if (!list || list.users.length < 200) break;
        }
        if (!userId) throw new Error("create_failed");
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password, email_confirm: true });
        if (error) throw new Error((error as { code?: string }).code === "weak_password" || /weak|pwned|leaked/i.test(error.message) ? "weak_password" : "update_failed");
      }
      const now = new Date().toISOString();
      const { error: me } = await supabaseAdmin.from("organization_members").upsert(
        { organization_id: inv.organization_id, user_id: userId, role: inv.role, active: true, archived_at: null, archived_by: null, created_by: inv.created_by, updated_at: now } as never,
        { onConflict: "organization_id,user_id" },
      );
      if (me) throw new Error("member_failed");
      await supabaseAdmin.from("profiles").upsert({ id: userId, ...(inv.full_name ? { full_name: inv.full_name } : {}), must_change_password: false } as never, { onConflict: "id" });
      await supabaseAdmin.from("invitations").update({ used_by: userId }).eq("id", inv.id);
      await supabaseAdmin.from("audit_events").insert({ organization_id: inv.organization_id, actor_id: userId, action: "invite_accepted", entity: "invitations", entity_id: inv.id, changes: { role: inv.role } });
      return { ok: true, email: inv.email };
    } catch (e) {
      // Devolve o convite para poder tentar de novo.
      await supabaseAdmin.from("invitations").update({ used_at: null }).eq("id", inv.id);
      console.error("acceptInvite failed", e);
      if (e instanceof Error && e.message === "weak_password") throw new Error("Esta senha é muito comum ou já apareceu em vazamentos na internet. Escolha outra, misturando letras, números e símbolos.");
      throw new Error("Não foi possível criar sua conta. Tente novamente em instantes.");
    }
  });
