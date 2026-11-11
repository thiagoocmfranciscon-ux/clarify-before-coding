import { describe, expect, it } from "vitest";
import { PERM, type AppRole } from "@/lib/domain";

describe("Auditoria exclusiva do Setor Técnico", () => {
  it("permite Setor Técnico", () => {
    expect(PERM.audit("admin")).toBe(true);
  });
  it.each<AppRole>(["ceo", "diretor_comercial", "gestor_manutencao", "gestor", "almoxarifado", "almoxarife", "tecnico", "rh", "leitura"])("bloqueia %s mesmo com acesso equivalente", (role) => {
    expect(PERM.audit(role)).toBe(false);
  });
});