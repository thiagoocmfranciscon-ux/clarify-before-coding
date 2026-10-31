import { describe, expect, it } from "vitest";
import { woTotals } from "@/lib/wo-items";

describe("totais da OS", () => {
  it("soma peças e serviços separadamente", () => {
    const t = woTotals([
      { kind: "peca", description: "Filtro", code: "F1", qty: 2, unit: 35.5 },
      { kind: "servico", description: "Troca", code: "", qty: 1, unit: 120 },
    ], 50);
    expect(t).toEqual({ parts: 71, services: 170, total: 241 });
  });
});
