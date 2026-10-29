import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/domain";

export type Membership = {
  userId: string;
  email: string;
  role: AppRole;
  organizationId: string;
  organizationName: string;
  fullName: string | null;
  avatarPath: string | null;
  technicianId: string | null;
  mustChangePassword: boolean;
};

export async function fetchMembership(): Promise<Membership | null> {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u.user) return null;
  const load = () =>
    supabase.from("organization_members").select("role, organization_id, organizations(name)")
      .eq("user_id", u.user.id).eq("active", true).order("created_at").limit(1).maybeSingle();
  let { data: m } = await load();
  if (!m) {
    await supabase.rpc("accept_invitation");
    ({ data: m } = await load());
  }
  if (!m) return null;
  const [{ data: p }, { data: t }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_path, must_change_password").eq("id", u.user.id).maybeSingle(),
    supabase.from("technicians").select("id").eq("user_id", u.user.id).is("archived_at", null).maybeSingle(),
  ]);
  return {
    userId: u.user.id,
    email: u.user.email ?? "",
    role: m.role as AppRole,
    organizationId: m.organization_id,
    organizationName: (m.organizations as { name: string } | null)?.name ?? "",
    fullName: p?.full_name ?? null,
    avatarPath: p?.avatar_path ?? null,
    technicianId: t?.id ?? null,
    mustChangePassword: !!p?.must_change_password,
  };
}

export const membershipQuery = { queryKey: ["membership"], queryFn: fetchMembership, staleTime: 60_000 } as const;

export function useMembership() {
  const q = useQuery(membershipQuery);
  return q;
}

let lastMembership: Membership | null = null;

/** Hook para componentes dentro da área autenticada (associação garantida pelo layout).
 * Durante a saída (cache limpo antes de navegar para /auth) usa o último valor conhecido
 * para não derrubar a tela. */
export function useMe(): Membership {
  const { data } = useQuery(membershipQuery);
  if (data) lastMembership = data;
  const me = data ?? lastMembership;
  if (!me) throw new Error("Associação não carregada");
  return me;
}
