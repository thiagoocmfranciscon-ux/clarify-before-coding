import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Nobre" }, { name: "description", content: "Cliente" }, { property: "og:title", content: "Cliente — Nobre" }, { property: "og:description", content: "Cliente" }] }),
  component: () => (
    <>
      <PageHeader title="Cliente" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
