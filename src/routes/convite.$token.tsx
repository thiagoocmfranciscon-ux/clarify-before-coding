import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandFull } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteWithPassword, getInvitePreview } from "@/lib/invite.functions";
import { MIN_PASSWORD } from "@/lib/invite-token";
import { ROLE_LABEL, type AppRole } from "@/lib/domain";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/convite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Criar acesso — Empilha Nobre" },
      { name: "description", content: "Crie sua senha para acessar o sistema da Empilha Nobre." },
      { property: "og:title", content: "Convite — Empilha Nobre" },
      { property: "og:description", content: "Você foi convidado para o sistema Empilha Nobre. Crie sua senha para entrar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const preview = useServerFn(getInvitePreview);
  const accept = useServerFn(acceptInviteWithPassword);
  const q = useQuery({ queryKey: ["invite", token], queryFn: () => preview({ data: { token } }), retry: 1 });
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: async () => {
      const r = await accept({ data: { token, password: pw } });
      await supabase.auth.signOut().catch(() => {});
      const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: pw });
      if (error) throw new Error("Conta criada! Entre com seu e-mail e a senha que você acabou de criar.");
    },
    onSuccess: () => navigate({ to: "/dashboard", replace: true }),
    onError: (e) => setError(friendlyError(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    if (pw.length < MIN_PASSWORD) { setError(`A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`); return; }
    if (pw !== pw2) { setError("As senhas não coincidem."); return; }
    m.mutate();
  }

  const d = q.data;
  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="relative w-full overflow-hidden rounded-b-[2.5rem] bg-brand-gradient px-6 pb-20 pt-10 text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(135deg,currentColor_0_2px,transparent_2px_22px)]" aria-hidden />
        <div className="relative mx-auto flex w-fit rounded-2xl bg-card px-5 py-3 shadow-soft"><BrandFull className="h-8" /></div>
      </div>
      <div className="relative z-10 -mt-12 w-[calc(100%-2.5rem)] max-w-md rounded-2xl border bg-card p-6 shadow-soft">
        {q.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Abrindo convite…</p>
        ) : q.isError || !d || d.state !== "valid" ? (
          <div>
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <h1 className="mt-3 text-xl font-bold">Este convite não é mais válido</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {d?.state === "used" ? "Ele já foi usado. Se a conta é sua, entre com seu e-mail e senha." : d?.state === "expired" ? "O prazo de 7 dias terminou." : "Peça um novo convite ao administrador."}
            </p>
            <Button asChild className="mt-6 h-12 w-full"><Link to="/auth">Ir para o login</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{d.fullName ? `Olá, ${d.fullName.split(" ")[0]}!` : "Bem-vindo!"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Você foi convidado para o sistema Empilha Nobre como <strong className="text-foreground">{ROLE_LABEL[d.role as AppRole] ?? d.role}</strong>. Crie sua senha para entrar.</p>
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">E-mail de acesso: <strong>{d.email}</strong></p>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="pw">Criar senha</Label>
                <div className="relative">
                  <Input id="pw" type={show ? "text" : "password"} autoComplete="new-password" className="h-12 pr-12" value={pw} onChange={(e) => setPw(e.target.value)} />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo de {MIN_PASSWORD} caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Confirmar senha</Label>
                <Input id="pw2" type={show ? "text" : "password"} autoComplete="new-password" className="h-12" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              <div aria-live="polite">{error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}</div>
              <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={m.isPending}>
                {m.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando…</> : "Criar minha conta"}
              </Button>
            </form>
          </>
        )}
      </div>
      <p className="py-6 text-center text-xs text-muted-foreground">Empilha Nobre · Representante HELI BRASIL</p>
    </main>
  );
}
