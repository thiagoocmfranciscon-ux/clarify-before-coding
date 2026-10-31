import { describe, it, expect } from "vitest";
import { memberStatus } from "@/lib/domain";
describe("aprovação do Setor Técnico", () => {
  it("cadastro novo sem aprovação fica pendente e não entra", () => expect(memberStatus({ active: false, approved_at: null })).toBe("pending"));
  it("aprovado e ativo entra", () => expect(memberStatus({ active: true, approved_at: "2026-10-31" })).toBe("active"));
  it("aprovado e revogado continua revogado", () => expect(memberStatus({ active: false, approved_at: "2026-10-31" })).toBe("revoked"));
});
