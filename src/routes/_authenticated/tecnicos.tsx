import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/tecnicos")({
  head: () => ({ meta: [{ title: "Técnicos — Nobre" }, { name: "description", content: "Técnicos" }, { property: "og:title", content: "Técnicos — Nobre" }, { property: "og:description", content: "Técnicos" }] }),
  component: () => (
    <>
      <PageHeader title="Técnicos" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
