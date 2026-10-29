import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED: Record<string, number> = {
  "image/jpeg": 5 * 1024 * 1024, "image/png": 5 * 1024 * 1024, "image/webp": 5 * 1024 * 1024, "application/pdf": 10 * 1024 * 1024,
};

/** Cria metadados pendentes e devolve URL assinada de upload. A autorização é verificada pela visibilidade da entidade. */
export const createAttachmentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    entityType: z.enum(["work_order", "equipment", "vehicle", "checklist"]), entityId: z.string().uuid(),
    fileName: z.string().min(1).max(200), mime: z.string(), size: z.number().int().positive(),
    docType: z.enum(["foto", "laudo", "art", "nota", "outro"]), externalNumber: z.string().max(60).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const max = ALLOWED[data.mime];
    if (!max) throw new Error("Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.");
    if (data.size > max) throw new Error(`Arquivo acima do limite (${max / 1024 / 1024} MB).`);
    const sb = context.supabase;
    const { data: org } = await sb.rpc("my_org");
    if (!org) throw new Error("Sem associação ativa");
    const { data: role } = await sb.rpc("my_role");
    let ok = false;
    if (data.entityType === "work_order") {
      const { data: v } = await sb.rpc("can_view_wo", { _wo: data.entityId });
      const { data: w } = await sb.from("work_orders").select("status").eq("id", data.entityId).maybeSingle();
      ok = !!v && !!w && !["encerrada", "cancelada"].includes(w.status) && role !== "leitura" && role !== "almoxarife";
    } else if (data.entityType === "checklist") {
      const { data: row } = await sb.from("checklists").select("id").eq("id", data.entityId).maybeSingle();
      ok = !!row;
    } else {
      const table = data.entityType === "equipment" ? "equipment" : "vehicles";
      const { data: row } = await sb.from(table).select("id").eq("id", data.entityId).maybeSingle();
      ok = !!row && (role === "admin" || role === "gestor");
    }
    if (!ok) throw new Error("Você não tem permissão para anexar neste registro.");
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[data.mime];
    const path = `${org}/${data.entityType}/${data.entityId}/${crypto.randomUUID()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: att, error } = await supabaseAdmin.from("attachments").insert({
      organization_id: org as string, entity_type: data.entityType, entity_id: data.entityId, storage_path: path,
      doc_type: data.docType, external_number: data.externalNumber || null, file_name: data.fileName.replace(/[^\p{L}\p{N}._ -]/gu, "_"),
      mime: data.mime, size_bytes: data.size, created_by: context.userId, status: "pendente",
    }).select("id").single();
    if (error) throw new Error("Falha ao registrar anexo");
    const { data: up, error: ue } = await supabaseAdmin.storage.from("attachments").createSignedUploadUrl(path);
    if (ue || !up) { await supabaseAdmin.from("attachments").delete().eq("id", att.id); throw new Error("Falha ao preparar upload"); }
    return { id: att.id, path, token: up.token };
  });

/** Confirma upload: verifica que o objeto existe, tamanho e assinatura do conteúdo; senão remove (limpeza de órfãos). */
export const finalizeAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: att } = await supabaseAdmin.from("attachments").select("*").eq("id", data.id).eq("created_by", context.userId).eq("status", "pendente").maybeSingle();
    if (!att) throw new Error("Anexo não encontrado");
    const { data: blob, error } = await supabaseAdmin.storage.from("attachments").download(att.storage_path);
    const fail = async (msg: string) => {
      await supabaseAdmin.storage.from("attachments").remove([att.storage_path]);
      await supabaseAdmin.from("attachments").delete().eq("id", att.id);
      throw new Error(msg);
    };
    if (error || !blob) return fail("Upload não encontrado");
    const buf = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
    const magicOk = (att.mime === "image/jpeg" && hex.startsWith("ffd8ff")) || (att.mime === "image/png" && hex.startsWith("89504e47"))
      || (att.mime === "image/webp" && hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") || (att.mime === "application/pdf" && hex.startsWith("25504446"));
    if (!magicOk) return fail("O conteúdo do arquivo não corresponde ao tipo informado.");
    if (blob.size !== att.size_bytes) return fail("Tamanho divergente do informado.");
    await supabaseAdmin.from("attachments").update({ status: "ativo", sha256: data.sha256 }).eq("id", att.id);
    return { ok: true };
  });

/** URL assinada curta (60 s) somente se o usuário enxerga o anexo pela RLS. */
export const getAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: att } = await context.supabase.from("attachments").select("storage_path, file_name").eq("id", data.id).maybeSingle();
    if (!att) throw new Error("Anexo não encontrado ou sem permissão");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s, error } = await supabaseAdmin.storage.from("attachments").createSignedUrl(att.storage_path, 60, { download: att.file_name });
    if (error || !s) throw new Error("Falha ao gerar link");
    return { url: s.signedUrl };
  });

/** Foto de perfil: até 5 MB, JPEG/PNG/WebP. */
export const createAvatarUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ mime: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive().max(5 * 1024 * 1024) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: org } = await context.supabase.rpc("my_org");
    if (!org) throw new Error("Sem associação ativa");
    const path = `${org}/profile/${context.userId}/${crypto.randomUUID()}.${(data.mime.split("/")[1] ?? "jpg").replace("jpeg", "jpg")}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: up, error } = await supabaseAdmin.storage.from("attachments").createSignedUploadUrl(path);
    if (error || !up) throw new Error("Falha ao preparar upload");
    return { path, token: up.token };
  });

export const finalizeAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ path: z.string().max(300) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: org } = await context.supabase.rpc("my_org");
    if (!data.path.startsWith(`${org}/profile/${context.userId}/`)) throw new Error("Caminho inválido");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blob } = await supabaseAdmin.storage.from("attachments").download(data.path);
    if (!blob) throw new Error("Upload não encontrado");
    const hex = Array.from(new Uint8Array(await blob.slice(0, 12).arrayBuffer())).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (!(hex.startsWith("ffd8ff") || hex.startsWith("89504e47") || (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250"))) {
      await supabaseAdmin.storage.from("attachments").remove([data.path]); throw new Error("Imagem inválida");
    }
    const { data: prev } = await supabaseAdmin.from("profiles").select("avatar_path").eq("id", context.userId).maybeSingle();
    await supabaseAdmin.from("profiles").update({ avatar_path: data.path, updated_at: new Date().toISOString() }).eq("id", context.userId);
    if (prev?.avatar_path) await supabaseAdmin.storage.from("attachments").remove([prev.avatar_path]);
    return { ok: true };
  });

export const getAvatarUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("profiles").select("avatar_path").eq("id", data.userId).maybeSingle();
    if (!p?.avatar_path) return { url: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.storage.from("attachments").createSignedUrl(p.avatar_path, 300);
    return { url: s?.signedUrl ?? null };
  });
