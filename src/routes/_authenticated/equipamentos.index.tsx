import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/equipamentos/")({
  head: () => ({ meta: [{ title: "Equipamentos — Nobre" }, { name: "description", content: "Equipamentos" }, { property: "og:title", content: "Equipamentos — Nobre" }, { property: "og:description", content: "Equipamentos" }] }),
  component: () => (
    <>
      <PageHeader title="Equipamentos" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
