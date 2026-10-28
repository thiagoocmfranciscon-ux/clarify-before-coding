import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Nobre" }, { name: "description", content: "Relatórios" }, { property: "og:title", content: "Relatórios — Nobre" }, { property: "og:description", content: "Relatórios" }] }),
  component: () => (
    <>
      <PageHeader title="Relatórios" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
