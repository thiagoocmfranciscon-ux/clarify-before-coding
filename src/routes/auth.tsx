import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck, Wrench, Boxes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark, BrandFull } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Empilha Nobre" },
      { name: "description", content: "Acesso restrito à equipe da Empilha Nobre." },
      { property: "og:title", content: "Entrar — Empilha Nobre" },
      { property: "og:description", content: "Acesso restrito à equipe da Empilha Nobre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Informe um e-mail válido").max(254);

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null); setInfo(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "E-mail inválido"); return; }
    setBusy(true);
    try {
      if (mode === "login") {
        if (!password) { setError("Informe a senha"); return; }
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data, password });
        if (error) { setError(/invalid/i.test(error.message) ? "E-mail ou senha incorretos." : friendlyError(error)); return; }
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) { setError(friendlyError(error)); return; }
        setInfo("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-gradient p-12 text-primary-foreground lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(135deg,currentColor_0_2px,transparent_2px_22px)]" aria-hidden />
        <div className="relative inline-flex w-fit rounded-2xl bg-card px-6 py-4 shadow-soft"><BrandFull className="h-10" /></div>
        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl font-bold leading-tight">Sua operação de empilhadeiras, sob controle.</h2>
          <p className="mt-4 text-primary-foreground/85">Ordens de serviço, estoque de peças, técnicos e frotas em um só lugar.</p>
          <ul className="mt-8 space-y-3 text-sm">
            {[{ i: Wrench, t: "OS do diagnóstico ao laudo" }, { i: Boxes, t: "Estoque com alertas de reposição" }, { i: ShieldCheck, t: "Acesso por papel e auditoria completa" }].map(({ i: I, t }) => (
              <li key={t} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-foreground/15"><I className="h-4 w-4" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 text-xs text-primary-foreground/70">© {new Date().getFullYear()} Empilha Nobre · Distribuidor HELI</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="lg:hidden"><BrandMark className="h-10" /></div>
          <h1 className="mt-8 text-3xl font-bold lg:mt-0">{mode === "login" ? "Bem-vindo de volta" : "Recuperar senha"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" ? "Acesso restrito a usuários convidados pela administração." : "Enviaremos um link para o seu e-mail."}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" required />
            </div>
            {mode === "login" && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pr-12" required />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <div aria-live="polite">
              {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              {info && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{info}</p>}
            </div>
            <Button type="submit" className="h-12 w-full text-base font-semibold shadow-soft transition active:scale-[0.99]" disabled={busy}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Aguarde…</> : mode === "login" ? "Entrar" : "Enviar link"}
            </Button>
          </form>
          <button type="button" className="mt-5 min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setError(null); setInfo(null); }}>
            {mode === "login" ? "Esqueci minha senha" : "Voltar para o login"}
          </button>
        </div>
      </section>
    </main>
  );
}
