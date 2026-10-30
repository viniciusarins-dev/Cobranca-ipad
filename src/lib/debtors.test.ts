import { describe, expect, it } from "vitest";

import { groupDebtorsByClient, type DebtorSourceInstallment } from "@/lib/debtors";
import type { Client } from "@/lib/types";

const REF = new Date("2026-01-21T15:00:00Z");

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: "client-1",
    owner_id: "owner-1",
    name: "Ana",
    phone: "11999998888",
    email: null,
    street: null,
    street_number: null,
    neighborhood: null,
    city: null,
    state: null,
    zip_code: null,
    document_photo_path: null,
    notes: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function installmentRow(overrides: Partial<DebtorSourceInstallment> = {}): DebtorSourceInstallment {
  const contract: DebtorSourceInstallment["contract"] = {
    id: "contract-1",
    type: "emprestimo",
    status: "ativo",
    description: null,
    installments_count: 2,
    principal_amount: 1000,
    periodicity: "mensal",
    client: client(),
  };

  return {
    id: "installment-1",
    owner_id: "owner-1",
    contract_id: "contract-1",
    number: 1,
    amount: 250,
    due_date: "2026-01-15",
    status: "atrasado",
    paid_principal_amount: 0,
    paid_interest_amount: 0,
    paid_at: null,
    reminder_sent_at: null,
    reminder_count: 0,
    created_at: "",
    updated_at: "",
    contract,
    ...overrides,
  };
}

describe("groupDebtorsByClient", () => {
  it("agrupa várias parcelas do mesmo cliente somando o saldo total", () => {
    const sameClient = client();
    const rows = [
      installmentRow({ id: "i1", amount: 250, due_date: "2026-01-15", status: "atrasado", contract: { ...installmentRow().contract, client: sameClient } }),
      installmentRow({ id: "i2", amount: 250, due_date: "2026-02-01", status: "pendente", contract: { ...installmentRow().contract, client: sameClient } }),
    ];

    const debtors = groupDebtorsByClient(rows, REF);

    expect(debtors).toHaveLength(1);
    expect(debtors[0].rows).toHaveLength(2);
    expect(debtors[0].totalDue).toBe(debtors[0].rows[0].totalDue + debtors[0].rows[1].totalDue);
    expect(debtors[0].hasOverdue).toBe(true);
  });

  it("nunca inclui uma parcela já totalmente paga (principal quitado)", () => {
    const rows = [installmentRow({ amount: 250, paid_principal_amount: 250, status: "pago" })];

    const debtors = groupDebtorsByClient(rows, REF);

    expect(debtors).toHaveLength(0);
  });

  it("separa clientes distintos em devedores distintos", () => {
    const rows = [
      installmentRow({ id: "i1" }),
      installmentRow({ id: "i2", contract: { ...installmentRow().contract, client: client({ id: "client-2", name: "Bia" }) } }),
    ];

    const debtors = groupDebtorsByClient(rows, REF);

    expect(debtors).toHaveLength(2);
    expect(debtors.map((d) => d.client.name).sort()).toEqual(["Ana", "Bia"]);
  });

  it("ordena devedores: atrasado primeiro, depois vence hoje, depois maior saldo", () => {
    const overdue = installmentRow({
      id: "i-overdue",
      due_date: "2026-01-10",
      status: "atrasado",
      contract: { ...installmentRow().contract, client: client({ id: "c-overdue", name: "Atrasada" }) },
    });
    const dueToday = installmentRow({
      id: "i-today",
      due_date: "2026-01-21",
      status: "pendente",
      contract: { ...installmentRow().contract, client: client({ id: "c-today", name: "VenceHoje" }) },
    });
    const future = installmentRow({
      id: "i-future",
      due_date: "2026-03-01",
      status: "pendente",
      contract: { ...installmentRow().contract, client: client({ id: "c-future", name: "Futura" }) },
    });

    const debtors = groupDebtorsByClient([future, dueToday, overdue], REF);

    expect(debtors.map((d) => d.client.name)).toEqual(["Atrasada", "VenceHoje", "Futura"]);
  });

  it("dentro de um mesmo cliente, ordena a parcela mais atrasada primeiro; empatado, a de vencimento mais próximo", () => {
    const sameClient = client();
    const rows = [
      installmentRow({ id: "far", due_date: "2026-04-01", status: "pendente", contract: { ...installmentRow().contract, client: sameClient } }),
      installmentRow({ id: "near", due_date: "2026-02-01", status: "pendente", contract: { ...installmentRow().contract, client: sameClient } }),
      installmentRow({ id: "late", due_date: "2026-01-10", status: "atrasado", contract: { ...installmentRow().contract, client: sameClient } }),
    ];

    const debtors = groupDebtorsByClient(rows, REF);

    expect(debtors[0].rows.map((r) => r.installment.id)).toEqual(["late", "near", "far"]);
  });
});
