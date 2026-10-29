import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Boxes, ClipboardList, FileText, Forklift, LayoutDashboard, LogOut, Menu, Search, ShieldCheck,
  Truck, User, ListChecks, Users, Building2, History, Settings, KeyRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAvatarUrl } from "@/lib/attachments.functions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useMe } from "@/hooks/use-membership";
import { PERM, ROLE_LABEL, type AppRole } from "@/lib/domain";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; show: (r: AppRole) => boolean; group: string };
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: () => true, group: "Operação" },
  { to: "/os", label: "Ordens de Serviço", icon: ClipboardList, show: () => true, group: "Operação" },
  { to: "/estoque", label: "Estoque de Peças", icon: Boxes, show: () => true, group: "Operação" },
  { to: "/frotas", label: "Frotas", icon: Truck, show: (r) => PERM.fleet(r) || r === "tecnico", group: "Operação" },
  { to: "/checklists", label: "Checklists", icon: ListChecks, show: () => true, group: "Operação" },
  { to: "/tecnicos", label: "Técnicos", icon: Users, show: (r) => r !== "tecnico" && r !== "almoxarife", group: "Cadastros" },
  { to: "/clientes", label: "Clientes", icon: Building2, show: (r) => r !== "tecnico" && r !== "almoxarife", group: "Cadastros" },
  { to: "/equipamentos", label: "Equipamentos", icon: Forklift, show: (r) => r !== "tecnico" && r !== "almoxarife", group: "Cadastros" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, show: PERM.seeCosts, group: "Gestão" },
  { to: "/admin/acessos", label: "Acessos", icon: ShieldCheck, show: PERM.admin, group: "Gestão" },
  { to: "/auditoria", label: "Auditoria", icon: History, show: PERM.audit, group: "Gestão" },
];

function SidebarNav({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((n) => n.show(role));
  const groups = [...new Set(items.map((n) => n.group))];
  return (
    <nav aria-label="Principal" className="flex flex-col gap-5 px-3">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">{g}</div>
          <div className="flex flex-col gap-0.5">
            {items.filter((n) => n.group === g).map((n) => {
              const active = path === n.to || path.startsWith(n.to + "/");
              return (
                <Link key={n.to} to={n.to} onClick={onNavigate}
                  className={cn("group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200",
                    active ? "bg-sidebar-primary/15 text-sidebar-accent-foreground before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-sidebar-primary [&>svg]:text-sidebar-primary"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5")}
                  aria-current={active ? "page" : undefined}>
                  <n.icon className="h-4 w-4 shrink-0" aria-hidden />{n.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const me = useMe();
  const getUrl = useServerFn(getAvatarUrl);
  const avatar = useQuery({ queryKey: ["avatar", me.userId, me.avatarPath], enabled: !!me.avatarPath, queryFn: async () => (await getUrl({ data: { userId: me.userId } })).url });
  const name = me.fullName || me.email;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-auto flex shrink-0 items-center gap-3 rounded-full border bg-card p-1 shadow-soft transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-4" aria-label="Menu do usuário">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold ring-2 ring-primary ring-offset-2 ring-offset-card">
          {avatar.data ? <img src={avatar.data} alt="" className="h-full w-full object-cover" /> : initials}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[180px] truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="block text-xs text-muted-foreground">{ROLE_LABEL[me.realRole]}</span>
        </span>
        <Settings className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{me.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/perfil"><User className="mr-2 h-4 w-4" />Meu perfil</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/perfil"><KeyRound className="mr-2 h-4 w-4" />Trocar senha</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const curPath = useRouterState({ select: (st) => st.location.pathname });
  useEffect(() => {
    if (me.mustChangePassword && curPath !== "/perfil") navigate({ to: "/perfil", replace: true });
  }, [me.mustChangePassword, curPath, navigate]);

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
    <div className="flex h-full min-h-0 flex-col bg-sidebar bg-gradient-to-b from-sidebar to-sidebar-accent/40 py-6">
      <div className="flex shrink-0 justify-center px-5 pb-7"><BrandLockup inverted /></div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><SidebarNav role={me.role} onNavigate={() => setOpen(false)} /></div>
      <div className="shrink-0 px-5 pt-4 text-center text-[10px] tracking-wide text-sidebar-foreground/40">Empilha Nobre · Distribuidor HELI</div>
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
          <UserMenu onSignOut={signOut} />
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{me.mustChangePassword && <div role="alert" className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">Por segurança, defina uma nova senha antes de continuar.</div>}{children}</main>
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
