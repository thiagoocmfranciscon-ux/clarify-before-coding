import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Empilha Nobre — Gestão de Manutenção e Operações" },
      { name: "description", content: "Sistema interno de manutenção, ordens de serviço, estoque e frotas." },
      { property: "og:title", content: "Empilha Nobre — Gestão de Manutenção" },
      { property: "og:description", content: "Sistema interno de manutenção, ordens de serviço, estoque e frotas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth", replace: true });
  },
});
