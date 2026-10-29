// Regras puras do módulo de checklists (entrega/retorno de máquinas).
export type MachineType = "combustao" | "eletrica_contrabalancada" | "retratil" | "transpaleteira";
export type ChecklistKind = "entrega" | "retorno";
export type Answer = "bom" | "ruim";

export const MACHINE_TYPES: { key: MachineType; label: string; title: string }[] = [
  { key: "combustao", label: "Combustão", title: "MÁQUINAS A COMBUSTÃO" },
  { key: "eletrica_contrabalancada", label: "Elétrica contrabalançada", title: "EMPILHADEIRAS ELÉTRICAS CONTRABALANÇADAS" },
  { key: "retratil", label: "Retrátil elétrica", title: "EMPILHADEIRAS RETRÁTEIS ELÉTRICAS" },
  { key: "transpaleteira", label: "Transpaleteira elétrica", title: "TRANSPALETEIRAS ELÉTRICAS" },
];

export const CHECKLIST_TYPES = ["Cliente", "Locação", "Foto geral", "Outros", "Movimentação"] as const;
export const KIND_LABEL: Record<ChecklistKind, string> = { entrega: "Entrega", retorno: "Retorno" };

export function isMachineType(v: unknown): v is MachineType {
  return MACHINE_TYPES.some((m) => m.key === v);
}

/** Conta itens marcados como "Ruim" (apenas itens do modelo). */
export function countBad(items: string[], answers: Record<string, Answer | undefined>): number {
  return items.filter((i) => answers[i] === "ruim").length;
}

/** Itens do modelo ainda sem resposta. */
export function unanswered(items: string[], answers: Record<string, Answer | undefined>): string[] {
  return items.filter((i) => answers[i] !== "bom" && answers[i] !== "ruim");
}
