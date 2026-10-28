import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/os/$id")({
  head: () => ({ meta: [{ title: "Detalhe da OS — Nobre" }, { name: "description", content: "Detalhe da OS" }, { property: "og:title", content: "Detalhe da OS — Nobre" }, { property: "og:description", content: "Detalhe da OS" }] }),
  component: () => (
    <>
      <PageHeader title="Detalhe da OS" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
