import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Nobre" }, { name: "description", content: "Clientes" }, { property: "og:title", content: "Clientes — Nobre" }, { property: "og:description", content: "Clientes" }] }),
  component: () => (
    <>
      <PageHeader title="Clientes" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
