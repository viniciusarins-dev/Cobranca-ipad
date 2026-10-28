import { describe, expect, it } from "vitest";

import { reflowSchedule, type ScheduleInstallmentInput } from "@/lib/installments";

function installment(overrides: Partial<ScheduleInstallmentInput> = {}): ScheduleInstallmentInput {
  return { number: 1, due_date: "2026-01-01", locked: false, ...overrides };
}

describe("reflowSchedule", () => {
  it("sem nenhuma parcela travada, a 1ª usa sempre o firstDueDate do contrato", () => {
    const installments = [
      installment({ number: 1, due_date: "2026-01-01" }),
      installment({ number: 2, due_date: "2026-02-01" }),
    ];
    const result = reflowSchedule(installments, "semanal", "2026-01-01");

    expect(result[0].due_date).toBe("2026-01-01");
    expect(result[1].due_date).toBe("2026-01-08"); // +7 dias a partir da parcela 1
  });

  it("nunca muda a data de uma parcela já paga (travada), mesmo trocando a periodicidade", () => {
    const installments = [
      installment({ number: 1, due_date: "2026-01-01", locked: true }),
      installment({ number: 2, due_date: "2026-02-01", locked: false }),
      installment({ number: 3, due_date: "2026-03-01", locked: false }),
    ];
    const result = reflowSchedule(installments, "semanal", "2026-01-01");

    expect(result[0].due_date).toBe("2026-01-01");
    expect(result[0].changed).toBe(false);
  });

  it("continua a sequência a partir da ÚLTIMA parcela travada, nunca do 1º vencimento original", () => {
    const installments = [
      installment({ number: 1, due_date: "2026-01-01", locked: true }),
      installment({ number: 2, due_date: "2026-02-01", locked: true }),
      installment({ number: 3, due_date: "2026-03-01", locked: false }),
      installment({ number: 4, due_date: "2026-04-01", locked: false }),
    ];
    const result = reflowSchedule(installments, "semanal", "2026-01-01");

    // Parcela 2 (travada) foi paga em 01/02 — parcela 3 passa a ser 7 dias
    // depois dela, não mais 1 mês depois (periodicidade antiga).
    expect(result[1].due_date).toBe("2026-02-01");
    expect(result[2].due_date).toBe("2026-02-08");
    expect(result[2].changed).toBe(true);
    expect(result[3].due_date).toBe("2026-02-15");
  });

  it("periodicidade quinzenal soma 15 dias por período, não 14", () => {
    const installments = [installment({ number: 1, due_date: "2026-01-01", locked: true }), installment({ number: 2, due_date: "2026-02-01" })];
    const result = reflowSchedule(installments, "quinzenal", "2026-01-01");
    expect(result[1].due_date).toBe("2026-01-16");
  });

  it("periodicidade mensal soma meses de calendário, não 30 dias fixos", () => {
    const installments = [installment({ number: 1, due_date: "2026-01-31", locked: true }), installment({ number: 2, due_date: "2026-03-01" })];
    const result = reflowSchedule(installments, "mensal", "2026-01-31");
    expect(result[1].due_date).toBe("2026-02-28"); // date-fns addMonths ajusta fim de mês
  });

  it("quando nenhuma parcela muda de data (mesma periodicidade), changed é sempre false", () => {
    const installments = [
      installment({ number: 1, due_date: "2026-01-01" }),
      installment({ number: 2, due_date: "2026-02-01" }),
      installment({ number: 3, due_date: "2026-03-01" }),
    ];
    const result = reflowSchedule(installments, "mensal", "2026-01-01");
    expect(result.every((r) => !r.changed)).toBe(true);
  });
});
