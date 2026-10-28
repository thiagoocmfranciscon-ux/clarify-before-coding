import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Nobre Empilhadeiras" },
      { name: "description", content: "Acesso restrito à equipe da Nobre Empilhadeiras." },
      { property: "og:title", content: "Entrar — Nobre Empilhadeiras" },
      { property: "og:description", content: "Acesso restrito à equipe da Nobre Empilhadeiras." },
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null); setInfo(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
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
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-xl">
        <BrandLockup />
        <h1 className="mt-8 text-2xl font-semibold">{mode === "login" ? "Entrar" : "Recuperar senha"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Acesso restrito a usuários convidados pela administração." : "Enviaremos um link para o seu e-mail."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" required />
          </div>
          {mode === "login" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" required />
            </div>
          )}
          <div aria-live="polite">
            {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {info && <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{info}</p>}
          </div>
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Enviar link"}
          </Button>
        </form>
        <button type="button" className="mt-4 min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setError(null); setInfo(null); }}>
          {mode === "login" ? "Esqueci minha senha" : "Voltar para o login"}
        </button>
      </div>
    </main>
  );
}
