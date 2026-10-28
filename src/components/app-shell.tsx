import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Boxes, ClipboardList, FileText, Forklift, LayoutDashboard, LogOut, Menu, Search, ShieldCheck,
  Truck, User, Users, Building2, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useMe } from "@/hooks/use-membership";
import { PERM, ROLE_LABEL, type AppRole } from "@/lib/domain";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; show: (r: AppRole) => boolean };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: () => true },
  { to: "/os", label: "Ordens de Serviço", icon: ClipboardList, show: () => true },
  { to: "/estoque", label: "Estoque de Peças", icon: Boxes, show: (r) => r !== "tecnico" },
  { to: "/frotas", label: "Frotas", icon: Truck, show: PERM.fleet },
  { to: "/tecnicos", label: "Técnicos", icon: Users, show: (r) => r !== "tecnico" },
  { to: "/clientes", label: "Clientes", icon: Building2, show: (r) => r !== "tecnico" },
  { to: "/equipamentos", label: "Equipamentos", icon: Forklift, show: (r) => r !== "tecnico" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, show: PERM.seeCosts },
  { to: "/admin/acessos", label: "Acessos", icon: ShieldCheck, show: PERM.admin },
  { to: "/auditoria", label: "Auditoria", icon: History, show: PERM.audit },
];

function SidebarNav({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3">
      {NAV.filter((n) => n.show(role)).map((n) => {
        const active = path === n.to || path.startsWith(n.to + "/");
        return (
          <Link key={n.to} to={n.to} onClick={onNavigate}
            className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
            aria-current={active ? "page" : undefined}>
            <n.icon className="h-4 w-4 shrink-0" aria-hidden />{n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const side = (
    <div className="flex h-full flex-col bg-sidebar py-5">
      <div className="px-5 pb-6"><BrandLockup inverted /></div>
      <SidebarNav role={me.role} onNavigate={() => setOpen(false)} />
      <div className="mt-4 border-t border-sidebar-border px-3 pt-4">
        <Link to="/perfil" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
          <User className="h-4 w-4" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-sidebar-accent-foreground">{me.fullName || me.email}</span>
            <span className="block text-xs">{ROLE_LABEL[me.role]}</span>
          </span>
        </Link>
        <button onClick={signOut} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" aria-hidden />Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{side}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-none p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {side}
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="h-11 w-11 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
          <button onClick={() => setSearchOpen(true)} className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:border-primary/40 sm:max-w-md">
            <Search className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">Buscar OS, cliente, série, placa, técnico…</span>
            <kbd className="ml-auto hidden rounded border px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto hidden text-right text-xs text-muted-foreground md:block">{me.organizationName}</div>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

type Hit = { id: string; label: string; sub: string | null };
type SearchResult = Partial<Record<"work_orders" | "customers" | "equipment" | "vehicles" | "technicians", Hit[]>>;

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (q.trim().length < 2) { setRes({}); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("global_search", { p_q: q.slice(0, 80) });
      setRes((data as SearchResult) ?? {});
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const go = (fn: () => void) => { onOpenChange(false); setQ(""); fn(); };
  const groups: { key: keyof SearchResult; label: string; open: (id: string) => void }[] = [
    { key: "work_orders", label: "Ordens de serviço", open: (id) => navigate({ to: "/os/$id", params: { id } }) },
    { key: "customers", label: "Clientes", open: (id) => navigate({ to: "/clientes/$id", params: { id } }) },
    { key: "equipment", label: "Equipamentos", open: (id) => navigate({ to: "/equipamentos/$id", params: { id } }) },
    { key: "vehicles", label: "Veículos", open: (id) => navigate({ to: "/frotas/$id", params: { id } }) },
    { key: "technicians", label: "Técnicos", open: () => navigate({ to: "/tecnicos" }) },
  ];
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Digite ao menos 2 caracteres…" value={q} onValueChange={setQ} aria-label="Busca global" />
      <CommandList>
        <CommandEmpty>{loading ? "Buscando…" : q.trim().length < 2 ? "Digite para buscar." : "Nada encontrado."}</CommandEmpty>
        {groups.map((g) => (res[g.key]?.length ? (
          <CommandGroup key={g.key} heading={g.label}>
            {res[g.key]!.map((h) => (
              <CommandItem key={h.id} value={`${g.key}-${h.id}`} onSelect={() => go(() => g.open(h.id))}>
                <FileText className="mr-2 h-4 w-4" aria-hidden />
                <span className="font-medium">{h.label}</span>
                {h.sub && <span className="ml-2 truncate text-muted-foreground">{h.sub}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null))}
      </CommandList>
    </CommandDialog>
  );
}
