import { describe, expect, it } from "vitest";
import { memberPhoneSchema } from "@/lib/member-phone";

describe("telefone do usuário", () => {
  it("salva número com DDD sem a máscara", () => expect(memberPhoneSchema.parse("(11) 98765-4321")).toBe("11987654321"));
  it("permite remover o telefone", () => expect(memberPhoneSchema.parse("")).toBe(""));
  it("rejeita telefone sem DDD", () => expect(memberPhoneSchema.safeParse("987654321").success).toBe(false));
});