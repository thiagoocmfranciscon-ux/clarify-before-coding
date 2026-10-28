import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, Field, PageHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/use-membership";
import { ROLE_LABEL } from "@/lib/domain";
import { friendlyError } from "@/lib/errors";
import { createAvatarUpload, finalizeAvatar, getAvatarUrl } from "@/lib/attachments.functions";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — Empilha Nobre" }, { name: "description", content: "Seus dados, foto e senha." }, { property: "og:title", content: "Meu Perfil — Empilha Nobre" }, { property: "og:description", content: "Seus dados, foto e senha." }] }),
  component: Page,
});

function Page() {
  const me = useMe(); const qc = useQueryClient(); const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(me.fullName ?? ""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false);
  const createUp = useServerFn(createAvatarUpload); const fin = useServerFn(finalizeAvatar); const getUrl = useServerFn(getAvatarUrl);
  const avatar = useQuery({ queryKey: ["avatar", me.userId, me.avatarPath], enabled: !!me.avatarPath, queryFn: async () => (await getUrl({ data: { userId: me.userId } })).url });

  async function saveName() {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", me.userId);
    setBusy(false); if (error) toast.error(friendlyError(error)); else { toast.success("Nome atualizado"); qc.invalidateQueries({ queryKey: ["membership"] }); }
  }
  async function changePw() {
    if (pw.length < 8) { toast.error("A senha deve ter ao menos 8 caracteres"); return; }
    if (pw !== pw2) { toast.error("As senhas não coincidem"); return; }
    setBusy(true); const { error } = await supabase.auth.updateUser({ password: pw }); setBusy(false);
    if (error) toast.error(friendlyError(error)); else { toast.success("Senha alterada"); setPw(""); setPw2(""); }
  }
  async function upload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error("Use JPG, PNG ou WebP de até 5 MB"); return; }
    try {
      setBusy(true);
      const { path, token } = await createUp({ data: { mime: file.type as "image/png", size: file.size } });
      const { error } = await supabase.storage.from("attachments").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      await fin({ data: { path } }); toast.success("Foto atualizada"); qc.invalidateQueries({ queryKey: ["membership"] });
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <PageHeader title="Meu Perfil" description={`${me.email} · ${ROLE_LABEL[me.role]} · ${me.organizationName}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Dados</h2>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-semibold">{avatar.data ? <img src={avatar.data} alt="Sua foto" className="h-full w-full object-cover" /> : (me.fullName ?? me.email).slice(0, 1).toUpperCase()}</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => fileRef.current?.click()}>Trocar foto</Button>
          </div>
          <Field id="pn" label="Nome completo"><Input id="pn" className="h-11" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></Field>
          <Button className="mt-3 min-h-11" disabled={busy} onClick={saveName}>Salvar</Button>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Alterar senha</h2>
          <div className="grid gap-3">
            <Field id="p1" label="Nova senha" hint="Mínimo de 8 caracteres"><Input id="p1" type="password" autoComplete="new-password" className="h-11" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
            <Field id="p2" label="Confirmar nova senha"><Input id="p2" type="password" autoComplete="new-password" className="h-11" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
            <Button className="min-h-11 w-fit" disabled={busy} onClick={changePw}>Alterar senha</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
