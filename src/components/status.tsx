import { AlertCircle, CheckCircle2, CircleDot, Clock, PackageX, Wrench, XCircle } from "lucide-react";
import { Pill } from "@/components/kit";
import { STOCK_ALERT_LABEL, WO_STATUS_LABEL, type StockAlert, type WoStatus } from "@/lib/domain";

export function WoStatusBadge({ status }: { status: WoStatus }) {
  const map: Record<WoStatus, { tone: "neutral" | "info" | "warning" | "primary" | "success" | "danger"; icon: React.ReactNode }> = {
    aberta: { tone: "info", icon: <CircleDot className="h-3 w-3" aria-hidden /> },
    em_diagnostico: { tone: "warning", icon: <AlertCircle className="h-3 w-3" aria-hidden /> },
    aguardando_peca: { tone: "warning", icon: <Clock className="h-3 w-3" aria-hidden /> },
    em_andamento: { tone: "primary", icon: <Wrench className="h-3 w-3" aria-hidden /> },
    concluida_tecnicamente: { tone: "success", icon: <CheckCircle2 className="h-3 w-3" aria-hidden /> },
    encerrada: { tone: "neutral", icon: <CheckCircle2 className="h-3 w-3" aria-hidden /> },
    cancelada: { tone: "danger", icon: <XCircle className="h-3 w-3" aria-hidden /> },
  };
  const m = map[status];
  return <Pill tone={m.tone} icon={m.icon}>{WO_STATUS_LABEL[status]}</Pill>;
}

export function StockBadge({ alert }: { alert: StockAlert }) {
  const tone = alert === "sem_estoque" ? "danger" : alert === "baixo" ? "warning" : "success";
  const icon = alert === "sem_estoque" ? <PackageX className="h-3 w-3" aria-hidden /> : alert === "baixo" ? <AlertCircle className="h-3 w-3" aria-hidden /> : <CheckCircle2 className="h-3 w-3" aria-hidden />;
  return <Pill tone={tone} icon={icon}>{STOCK_ALERT_LABEL[alert]}</Pill>;
}

const GENERIC: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" | "primary" }> = {
  ativo: { label: "Ativo", tone: "success" }, inativo: { label: "Inativo", tone: "neutral" },
  operacional: { label: "Operacional", tone: "success" }, em_manutencao: { label: "Em manutenção", tone: "warning" },
  parado: { label: "Parado", tone: "danger" }, disponivel: { label: "Disponível", tone: "success" },
  em_uso: { label: "Em uso", tone: "info" }, em_servico: { label: "Em serviço", tone: "primary" }, afastado: { label: "Afastado", tone: "warning" },
  pendente: { label: "Pendente", tone: "warning" }, atendida: { label: "Atendida", tone: "success" }, recusada: { label: "Recusada", tone: "danger" },
};
export function GenericStatus({ value, archived }: { value: string; archived?: boolean }) {
  if (archived) return <Pill tone="neutral">Arquivado</Pill>;
  const g = GENERIC[value] ?? { label: value, tone: "neutral" as const };
  return <Pill tone={g.tone}>{g.label}</Pill>;
}
