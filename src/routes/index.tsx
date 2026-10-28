import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nobre Empilhadeiras — Gestão de Manutenção e Operações" },
      { name: "description", content: "Sistema interno de manutenção, ordens de serviço, estoque e frotas." },
      { property: "og:title", content: "Nobre Empilhadeiras — Gestão de Manutenção" },
      { property: "og:description", content: "Sistema interno de manutenção, ordens de serviço, estoque e frotas." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth", replace: true });
  },
});
