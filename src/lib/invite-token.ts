/** Endereço fixo do site publicado: links de convite nunca levam ao editor. */
export const PUBLIC_APP_URL = "https://nobreempilhadeiras.lovable.app";

export const MIN_PASSWORD = 10;

export function newInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashInviteToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const inviteUrl = (token: string) => `${PUBLIC_APP_URL}/convite/${token}`;

export type InviteState = "valid" | "used" | "revoked" | "expired" | "missing";

export function inviteState(inv: { used_at: string | null; revoked_at: string | null; expires_at: string } | null | undefined, now = new Date()): InviteState {
  if (!inv) return "missing";
  if (inv.used_at) return "used";
  if (inv.revoked_at) return "revoked";
  if (new Date(inv.expires_at).getTime() <= now.getTime()) return "expired";
  return "valid";
}

export function maskEmail(email: string): string {
  const [u = "", d = ""] = email.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, u.length - 2))}@${d}`;
}
