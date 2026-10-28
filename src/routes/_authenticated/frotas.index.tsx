import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/frotas/")({
  head: () => ({ meta: [{ title: "Frotas — Nobre" }, { name: "description", content: "Frotas" }, { property: "og:title", content: "Frotas — Nobre" }, { property: "og:description", content: "Frotas" }] }),
  component: () => (
    <>
      <PageHeader title="Frotas" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
