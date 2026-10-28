import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Definir senha — Empilha Nobre" },
      { name: "description", content: "Defina uma nova senha de acesso." },
      { property: "og:title", content: "Definir senha — Empilha Nobre" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => { if (s.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 10) { setError("A senha deve ter pelo menos 10 caracteres."); return; }
    if (pw !== pw2) { setError("As senhas não coincidem."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setError(friendlyError(error)); return; }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-xl">
        <BrandLockup />
        <h1 className="mt-8 text-2xl font-semibold">Definir nova senha</h1>
        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">Validando o link… Se esta mensagem persistir, solicite um novo link.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="pw">Nova senha</Label><Input id="pw" type="password" autoComplete="new-password" className="h-11" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="pw2">Confirmar senha</Label><Input id="pw2" type="password" autoComplete="new-password" className="h-11" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
            <div aria-live="polite">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar senha"}</Button>
          </form>
        )}
      </div>
    </main>
  );
}
