import { describe, expect, it } from "vitest";
import { ASSIGNABLE_ROLES, effectiveRole, PERM, allowedTransitions } from "@/lib/domain";

describe("RH somente consulta", () => {
  it("oferece RH como cargo e aplica o nível leitura", () => {
    expect(ASSIGNABLE_ROLES).toContain("rh");
    expect(effectiveRole("rh")).toBe("leitura");
  });
  it("não permite alterar cadastros, estoque, acessos ou OS", () => {
    const role = effectiveRole("rh");
    expect(PERM.manage(role)).toBe(false);
    expect(PERM.stock(role)).toBe(false);
    expect(PERM.admin(role)).toBe(false);
    expect(allowedTransitions("aberta", role, false)).toEqual([]);
  });
});