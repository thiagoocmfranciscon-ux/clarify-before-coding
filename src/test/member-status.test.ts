import { describe, it, expect } from "vitest";
import { memberStatus } from "@/lib/domain";
describe("memberStatus", () => {
  it("ativo", () => expect(memberStatus({ active: true, archived_at: null })).toBe("active"));
  it("revogado", () => expect(memberStatus({ active: false, archived_at: null })).toBe("revoked"));
  it("arquivado prevalece", () => expect(memberStatus({ active: false, archived_at: "2026-10-29T00:00:00Z" })).toBe("archived"));
});
