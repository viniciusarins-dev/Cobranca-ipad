import { describe, expect, it } from "vitest";

import { resolvePresetRange } from "@/lib/financial-report-presets";

// 15/03/2026, meio-dia UTC — bem longe da virada do dia no fuso do negócio
// (Brasil, UTC-3), pra não arriscar pegar o dia errado por causa do fuso.
const REF = new Date("2026-03-15T12:00:00Z");

describe("resolvePresetRange", () => {
  it("este_mes: do dia 1 do mês atual até hoje", () => {
    expect(resolvePresetRange("este_mes", REF)).toEqual({ startDate: "2026-03-01", endDate: "2026-03-15" });
  });

  it("mes_passado: mês inteiro anterior, do dia 1 ao último dia", () => {
    expect(resolvePresetRange("mes_passado", REF)).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
  });

  it("mes_passado: janeiro quando hoje é em março de um ano, dezembro quando hoje é em janeiro (vira o ano)", () => {
    const refJan = new Date("2026-01-10T12:00:00Z");
    expect(resolvePresetRange("mes_passado", refJan)).toEqual({ startDate: "2025-12-01", endDate: "2025-12-31" });
  });

  it("ultimos_30_dias: janela de 30 dias corridos incluindo hoje", () => {
    const result = resolvePresetRange("ultimos_30_dias", REF);
    expect(result.endDate).toBe("2026-03-15");
    expect(result.startDate).toBe("2026-02-14");
  });

  it("ultimos_90_dias: janela de 90 dias corridos incluindo hoje", () => {
    const result = resolvePresetRange("ultimos_90_dias", REF);
    expect(result.endDate).toBe("2026-03-15");
    expect(result.startDate).toBe("2025-12-16");
  });

  it("este_ano: do dia 1 de janeiro até hoje", () => {
    expect(resolvePresetRange("este_ano", REF)).toEqual({ startDate: "2026-01-01", endDate: "2026-03-15" });
  });

  it("mes_passado: respeita fevereiro com 29 dias em ano bissexto", () => {
    const refMarch2028 = new Date("2028-03-05T12:00:00Z");
    expect(resolvePresetRange("mes_passado", refMarch2028)).toEqual({ startDate: "2028-02-01", endDate: "2028-02-29" });
  });
});
