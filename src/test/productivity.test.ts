import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { productivity } from "@/routes/_authenticated/tecnicos";
describe("produtividade do técnico", () => {
  it("conta concluídas e encerradas sobre o total, ignorando canceladas", () => {
    expect(productivity(["concluida_tecnicamente", "encerrada", "em_andamento", "aberta", "cancelada"])).toBe(50);
  });
  it("sem OS retorna null", () => { expect(productivity([])).toBeNull(); });
});
