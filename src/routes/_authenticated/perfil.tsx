import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — Nobre" }, { name: "description", content: "Meu Perfil" }, { property: "og:title", content: "Meu Perfil — Nobre" }, { property: "og:description", content: "Meu Perfil" }] }),
  component: () => (
    <>
      <PageHeader title="Meu Perfil" />
      <EmptyState title="Módulo ainda não concluído" description="Esta tela será construída na próxima etapa. Os dados e regras já existem no banco." />
    </>
  ),
});
