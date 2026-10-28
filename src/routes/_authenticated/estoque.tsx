import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/estoque")({
  validateSearch: (s: Record<string, unknown>) => ({ alert: typeof s.alert === "string" ? s.alert : undefined }),
  head: () => ({ meta: [{ title: "Estoque de Peças — Nobre" }, { name: "description", content: "Estoque de Peças" }, { property: "og:title", content: "Estoque de Peças — Nobre" }, { property: "og:description", content: "Estoque de Peças" }] }),
  component: () => (
    <>
      <PageHeader title="Estoque de Peças" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
