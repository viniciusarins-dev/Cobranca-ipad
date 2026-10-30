import { describe, expect, it } from "vitest";

import { buildReminderTemplateParams, renderCampaignMessage, renderReminderMessage } from "@/lib/whatsapp/template";
import type { Debtor } from "@/lib/debtors";

const REF = new Date("2026-01-21T15:00:00Z");

const client = { name: "Ana" };
const contract = { type: "emprestimo" as const, principal_amount: 1000 };
const installmentsCount = 4;

const TEMPLATE =
  "{nome_cliente} {numero_parcela} {valor} {data_vencimento} {dias_atraso} {juros_dia} {valor_atualizado}";

describe("renderReminderMessage", () => {
  it("substitui todas as variáveis para uma parcela ainda não atrasada", () => {
    const installment = {
      number: 1,
      amount: 250,
      due_date: "2026-02-01",
      status: "pendente" as const,
      paid_principal_amount: 0,
      paid_interest_amount: 0,
    };

    const result = renderReminderMessage(TEMPLATE, client, contract, installment, installmentsCount, REF);

    expect(result).toContain("Ana");
    expect(result).toContain("1/4");
    expect(result).toContain("250,00");
    expect(result).toContain("01/02/2026");
    // Ainda não venceu — dias de atraso e juros do dia saem zerados, nunca negativos.
    // {valor}/{juros_dia}/{valor_atualizado} nunca trazem o prefixo "R$" (o
    // template já escreve isso no texto fixo, ex. "R$ {valor}").
    expect(result).toBe("Ana 1/4 250,00 01/02/2026 0 0,00 250,00");
  });

  it("calcula dias de atraso e juros reais para uma parcela vencida", () => {
    const installment = {
      number: 2,
      amount: 250,
      due_date: "2026-01-15", // 6 dias antes de REF
      status: "atrasado" as const,
      paid_principal_amount: 0,
      paid_interest_amount: 0,
    };

    const result = renderReminderMessage(TEMPLATE, client, contract, installment, installmentsCount, REF);

    // 6 dias de atraso, juros = 60 (mesma fórmula de calculateLateInterest),
    // valor atualizado = 250 (principal) + 60 (juros) = 310.
    expect(result).toBe("Ana 2/4 250,00 15/01/2026 6 60,00 310,00");
  });

  it("nunca gera juros de atraso para venda de iPhone (regra exclusiva de empréstimo)", () => {
    const installment = {
      number: 1,
      amount: 250,
      due_date: "2026-01-01",
      status: "atrasado" as const,
      paid_principal_amount: 0,
      paid_interest_amount: 0,
    };
    const saleContract = { type: "venda_iphone" as const, principal_amount: 1000 };

    const result = renderReminderMessage(TEMPLATE, client, saleContract, installment, installmentsCount, REF);

    // {juros_dia} e {valor_atualizado} ficam iguais ao principal (sem acréscimo).
    expect(result).toBe("Ana 1/4 250,00 01/01/2026 20 0,00 250,00");
  });
});

describe("buildReminderTemplateParams", () => {
  it("devolve os 4 parâmetros na ordem esperada pela Meta Cloud API", () => {
    const installment = { number: 3, amount: 100, due_date: "2026-03-10" };
    const params = buildReminderTemplateParams(client, installment, 5);

    expect(params).toEqual(["Ana", "3/5", "100,00", "10/03/2026"]);
  });
});

describe("renderCampaignMessage", () => {
  function debtor(overrides: Partial<Debtor> = {}): Debtor {
    return {
      client: { id: "c1", owner_id: "o1", name: "Ana", phone: "11999998888", email: null, street: null, street_number: null, neighborhood: null, city: null, state: null, zip_code: null, document_photo_path: null, notes: null, created_at: "", updated_at: "" },
      rows: [],
      totalDue: 0,
      hasOverdue: false,
      hasDueToday: false,
      maxDaysLate: 0,
      ...overrides,
    };
  }

  it("acrescenta quantidade de parcelas atrasadas e saldo total do cliente, sem recalcular nada", () => {
    const installment = {
      number: 1,
      amount: 250,
      due_date: "2026-01-15",
      status: "atrasado" as const,
      paid_principal_amount: 0,
      paid_interest_amount: 0,
    };
    const template = "{nome_cliente} deve {quantidade_parcelas_atraso} parcela(s), saldo {saldo_total_em_aberto}";
    const theDebtor = debtor({
      totalDue: 999.9,
      rows: [
        { installment: installment as never, contract: contract as never, outstandingPrincipal: 250, interestOwed: 10, totalDue: 260, daysLate: 6, isOverdue: true, isDueToday: false },
        { installment: installment as never, contract: contract as never, outstandingPrincipal: 250, interestOwed: 0, totalDue: 250, daysLate: 0, isOverdue: false, isDueToday: true },
      ],
    });

    const result = renderCampaignMessage(template, client, contract, installment, installmentsCount, theDebtor, REF);

    expect(result).toContain("Ana deve 1 parcela(s)");
    expect(result).toContain("saldo 999,90");
  });
});
