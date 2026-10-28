import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/admin/acessos")({
  head: () => ({ meta: [{ title: "Administração de Acessos — Nobre" }, { name: "description", content: "Administração de Acessos" }, { property: "og:title", content: "Administração de Acessos — Nobre" }, { property: "og:description", content: "Administração de Acessos" }] }),
  component: () => (
    <>
      <PageHeader title="Administração de Acessos" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
