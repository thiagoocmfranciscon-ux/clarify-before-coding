import { describe, expect, it } from "vitest";
import { hashInviteToken, inviteState, inviteUrl, newInviteToken } from "@/lib/invite-token";

const now = new Date("2026-10-29T12:00:00Z");
const base = { used_at: null, revoked_at: null, expires_at: "2026-11-05T12:00:00Z" };

describe("convite por link", () => {
  it("convite dentro dos 7 dias e não usado é válido", () => expect(inviteState(base, now)).toBe("valid"));
  it("convite já usado é recusado", () => expect(inviteState({ ...base, used_at: "2026-10-29T10:00:00Z" }, now)).toBe("used"));
  it("convite vencido é recusado", () => expect(inviteState({ ...base, expires_at: "2026-10-29T11:59:59Z" }, now)).toBe("expired"));
  it("convite excluído (não encontrado) é recusado", () => expect(inviteState(null, now)).toBe("missing"));
  it("link aponta para o site publicado, nunca para o editor", () => expect(inviteUrl("abc")).toBe("https://nobreempilhadeiras.lovable.app/convite/abc"));
  it("tokens são únicos e o hash não revela o token", async () => {
    const a = newInviteToken(); const b = newInviteToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    const h = await hashInviteToken(a);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(a);
  });
});
