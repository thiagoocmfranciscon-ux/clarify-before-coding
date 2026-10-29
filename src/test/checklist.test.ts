import { describe, expect, it } from "vitest";
import { countBad, unanswered } from "@/lib/checklist";
import { effectiveRole, PERM } from "@/lib/domain";

describe("checklist", () => {
  it("conta apenas itens marcados como ruim", () => {
    expect(countBad(["A", "B", "C"], { A: "ruim", B: "bom", C: "ruim", X: "ruim" })).toBe(2);
  });
  it("lista itens sem resposta", () => {
    expect(unanswered(["A", "B"], { A: "bom" })).toEqual(["B"]);
  });
});

describe("papéis", () => {
  it("CEO, Diretor Comercial e Gestor de Manutenção mexem nos Acessos", () => {
    for (const r of ["ceo", "diretor_comercial", "gestor_manutencao", "admin"] as const) expect(PERM.admin(effectiveRole(r))).toBe(true);
  });
  it("Almoxarifado mexe no estoque e vê frotas, mas não nos Acessos", () => {
    const r = effectiveRole("almoxarifado");
    expect(PERM.stock(r)).toBe(true); expect(PERM.fleet(r)).toBe(true); expect(PERM.admin(r)).toBe(false);
  });
  it("Técnicos veem estoque mas não movimentam nem acessam Acessos", () => {
    expect(PERM.seeStock("tecnico")).toBe(true); expect(PERM.stock("tecnico")).toBe(false); expect(PERM.admin("tecnico")).toBe(false);
  });
});
