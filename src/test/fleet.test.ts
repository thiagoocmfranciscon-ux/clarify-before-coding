import { describe, expect, it } from "vitest";
import { fleetSerialParse } from "@/components/fields";

describe("identificação da frota por série", () => {
  it("aceita série livre em vez de exigir uma placa", () => {
    expect(fleetSerialParse(" HELI-2026/001 ")).toBe("HELI-2026/001");
  });
  it("não permite série vazia", () => {
    expect(fleetSerialParse("   ")).toEqual({ error: "Informe a série" });
  });
});