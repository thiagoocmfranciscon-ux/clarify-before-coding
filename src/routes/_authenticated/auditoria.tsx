import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Nobre" }, { name: "description", content: "Auditoria" }, { property: "og:title", content: "Auditoria — Nobre" }, { property: "og:description", content: "Auditoria" }] }),
  component: () => (
    <>
      <PageHeader title="Auditoria" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
