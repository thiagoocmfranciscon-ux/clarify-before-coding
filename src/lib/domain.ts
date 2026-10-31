// Regras de domínio puras (espelham as regras do banco para feedback imediato; o banco é a autoridade).
export type AppRole = "admin" | "gestor" | "tecnico" | "almoxarife" | "leitura" | "ceo" | "diretor_comercial" | "gestor_manutencao" | "almoxarifado" | "rh";
export type WoStatus =
  | "aberta" | "em_diagnostico" | "aguardando_peca" | "em_andamento"
  | "concluida_tecnicamente" | "encerrada" | "cancelada";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Setor Técnico", ceo: "CEO", diretor_comercial: "Diretor Comercial", gestor_manutencao: "Gestor de Manutenção",
  almoxarifado: "Almoxarifado", tecnico: "Técnicos", rh: "RH",
  gestor: "Gestor (antigo)", almoxarife: "Almoxarife (antigo)", leitura: "Leitura (antigo)",
};
/** Papéis oferecidos na tela de Acessos. */
export const ASSIGNABLE_ROLES: AppRole[] = ["admin", "ceo", "diretor_comercial", "gestor_manutencao", "almoxarifado", "tecnico", "rh"];
/** Papéis com acesso total (inclusive Acessos). */
export const FULL_ACCESS_ROLES: AppRole[] = ["admin", "ceo", "diretor_comercial", "gestor_manutencao"];
/** Converte o papel cadastrado no nível de permissão equivalente (espelha public.effective_role). */
export function effectiveRole(r: AppRole): AppRole {
  if (r === "ceo" || r === "diretor_comercial" || r === "gestor_manutencao") return "admin";
  if (r === "almoxarifado") return "almoxarife";
  if (r === "rh") return "leitura";
  return r;
}

export const WO_STATUS_LABEL: Record<WoStatus, string> = {
  aberta: "Aberta", em_diagnostico: "Em diagnóstico", aguardando_peca: "Aguardando peça", em_andamento: "Em andamento",
  concluida_tecnicamente: "Concluída tecnicamente", encerrada: "Encerrada", cancelada: "Cancelada",
};
export const WO_TYPE_LABEL = { preventiva: "Preventiva", corretiva: "Corretiva", reforma_geral: "Reforma geral" } as const;
export const WO_PRIORITY_LABEL = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" } as const;

export const WO_TRANSITIONS: Record<WoStatus, WoStatus[]> = {
  aberta: ["em_diagnostico", "cancelada"],
  em_diagnostico: ["aguardando_peca", "em_andamento", "cancelada"],
  aguardando_peca: ["em_andamento", "em_diagnostico", "cancelada"],
  em_andamento: ["aguardando_peca", "concluida_tecnicamente", "cancelada"],
  concluida_tecnicamente: ["encerrada", "em_andamento"],
  encerrada: [],
  cancelada: [],
};

export const OPEN_STATUSES: WoStatus[] = ["aberta", "em_diagnostico", "aguardando_peca", "em_andamento", "concluida_tecnicamente"];

export function allowedTransitions(from: WoStatus, role: AppRole, assigned: boolean): WoStatus[] {
  const mgr = role === "admin" || role === "gestor";
  if (!mgr && !(role === "tecnico" && assigned)) return [];
  return WO_TRANSITIONS[from].filter((to) => {
    if (to === "encerrada" || to === "cancelada") return mgr;
    if (from === "concluida_tecnicamente" && to === "em_andamento") return mgr;
    return true;
  });
}

export function transitionNeedsReason(from: WoStatus, to: WoStatus): boolean {
  return to === "cancelada" || (from === "concluida_tecnicamente" && to === "em_andamento");
}

export function isOverdue(status: WoStatus, dueDate: string | null, todaySp: string): boolean {
  return !!dueDate && OPEN_STATUSES.includes(status) && dueDate < todaySp;
}

export type StockAlert = "sem_estoque" | "baixo" | "normal";
export function stockAlert(qty: number, min: number): StockAlert {
  if (qty <= 0) return "sem_estoque";
  if (qty <= min) return "baixo";
  return "normal";
}
export const STOCK_ALERT_LABEL: Record<StockAlert, string> = { sem_estoque: "Sem estoque", baixo: "Baixo", normal: "Normal" };

/** Média ponderada móvel após entrada. */
export function weightedAverage(curQty: number, curAvg: number, inQty: number, inCost: number): number {
  const q = curQty + inQty;
  if (q <= 0) return curAvg;
  return Math.round(((curQty * curAvg + inQty * inCost) / q) * 10000) / 10000;
}

export function validQuantity(qty: number, allowsFraction: boolean): string | null {
  if (!Number.isFinite(qty)) return "Quantidade inválida";
  if (qty <= 0) return "A quantidade deve ser maior que zero";
  if (!allowsFraction && !Number.isInteger(qty)) return "Esta unidade não aceita fração";
  return null;
}

export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
export function isValidPlate(p: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p);
}

export function isValidCpfCnpj(doc: string): boolean {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) {
    if (/^(\d)\1+$/.test(d)) return false;
    const calc = (n: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
      const r = (s * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  }
  if (d.length === 14) {
    if (/^(\d)\1+$/.test(d)) return false;
    const calc = (n: number) => {
      const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const s = w.reduce((acc, wi, i) => acc + Number(d[i]) * wi, 0);
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
  }
  return false;
}

/** Impede que texto vire fórmula em planilhas (CSV/XLSX injection). */
export function safeCellText(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

export function maintenanceDue(plan: { interval_days: number | null; interval_hours: number | null; last_done_date: string | null; last_done_hours: number | null }, currentHours: number | null, todaySp: string) {
  const nextDate = plan.interval_days && plan.last_done_date
    ? new Date(Date.UTC(+plan.last_done_date.slice(0, 4), +plan.last_done_date.slice(5, 7) - 1, +plan.last_done_date.slice(8, 10) + plan.interval_days)).toISOString().slice(0, 10)
    : null;
  const nextHours = plan.interval_hours && plan.last_done_hours !== null ? plan.last_done_hours + plan.interval_hours : null;
  const overdue = (nextDate !== null && nextDate < todaySp) || (nextHours !== null && currentHours !== null && currentHours >= nextHours);
  return { nextDate, nextHours, overdue, neverDone: !plan.last_done_date && plan.last_done_hours === null };
}

export const PERM = {
  manage: (r?: AppRole | null) => r === "admin" || r === "gestor",
  admin: (r?: AppRole | null) => r === "admin",
  stock: (r?: AppRole | null) => r === "admin" || r === "gestor" || r === "almoxarife",
  seeCosts: (r?: AppRole | null) => r === "admin" || r === "gestor" || r === "leitura",
  seeStock: (r?: AppRole | null) => r === "admin" || r === "gestor" || r === "almoxarife" || r === "leitura" || r === "tecnico",
  export: (r?: AppRole | null) => r === "admin" || r === "gestor",
  fleet: (r?: AppRole | null) => r === "admin" || r === "gestor" || r === "leitura" || r === "almoxarife",
  audit: (r?: AppRole | null) => r === "admin" || r === "gestor",
};

/** Situação do usuário: arquivado tem prioridade sobre ativo/revogado. */
export function memberStatus(m: { active: boolean; archived_at?: string | null; approved_at?: string | null }): "active" | "revoked" | "archived" | "pending" {
  if (m.archived_at) return "archived";
  if (!m.active && m.approved_at === null) return "pending";
  return m.active ? "active" : "revoked";
}
