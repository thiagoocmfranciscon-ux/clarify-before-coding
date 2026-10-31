import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { membershipQuery } from "@/hooks/use-membership";
import { AppShell } from "@/components/app-shell";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const q = useQuery(membershipQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (q.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" aria-busy="true">
        <div className="w-64 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-2/3" /></div>
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-sidebar px-4">
        <div className="max-w-md rounded-xl bg-card p-8">
          <BrandLockup />
          <h1 className="mt-6 text-xl font-semibold">Acesso não liberado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {q.isError ? "Não foi possível verificar seu acesso. Tente novamente." : "Seu cadastro ainda está aguardando a aprovação do Setor Técnico, ou o acesso foi revogado. Você poderá entrar assim que for aprovado."}
          </p>
          <div className="mt-6 flex gap-2">
            {q.isError && <Button onClick={() => q.refetch()}>Tentar novamente</Button>}
            <Button variant="outline" onClick={async () => { qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }}>Sair</Button>
          </div>
        </div>
      </main>
    );
  }
  return <AppShell><Outlet /></AppShell>;
}
