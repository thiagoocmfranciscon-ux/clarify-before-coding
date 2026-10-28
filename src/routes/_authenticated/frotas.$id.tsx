import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/frotas/$id")({
  head: () => ({ meta: [{ title: "Veículo — Nobre" }, { name: "description", content: "Veículo" }, { property: "og:title", content: "Veículo — Nobre" }, { property: "og:description", content: "Veículo" }] }),
  component: () => (
    <>
      <PageHeader title="Veículo" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
