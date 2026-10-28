import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/equipamentos/$id")({
  head: () => ({ meta: [{ title: "Equipamento — Nobre" }, { name: "description", content: "Equipamento" }, { property: "og:title", content: "Equipamento — Nobre" }, { property: "og:description", content: "Equipamento" }] }),
  component: () => (
    <>
      <PageHeader title="Equipamento" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
