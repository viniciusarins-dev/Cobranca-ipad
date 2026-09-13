import { startOfDay, startOfMonth, startOfWeek } from "date-fns";

import { calculateFinancedAmount, roundCents } from "@/lib/financial-rules";
import type { createClient } from "@/lib/supabase/server";
import type { Contract, Expense, Payment, PaymentMethod } from "@/lib/types";

export interface PeriodAmounts {
  today: number;
  week: number;
  month: number;
  total: number;
}

function emptyPeriod(): PeriodAmounts {
  return { today: 0, week: 0, month: 0, total: 0 };
}

function addToPeriod(period: PeriodAmounts, value: number, date: Date, now: Date) {
  period.total = roundCents(period.total + value);
  if (date >= startOfDay(now)) period.today = roundCents(period.today + value);
  if (date >= startOfWeek(now, { weekStartsOn: 1 })) period.week = roundCents(period.week + value);
  if (date >= startOfMonth(now)) period.month = roundCents(period.month + value);
}

export interface DashboardMetrics {
  /** Visão geral de empréstimos/vendas (item 1 e 2 do pedido). */
  loans: {
    /** Soma de principal_amount — valor original emprestado/vendido, antes do markup. */
    totalPrincipal: number;
    /** Soma de total_amount — valor total previsto para receber (já com os 30%). */
    totalExpected: number;
    /** Principal das parcelas já recebido (não inclui juros nem entradas). */
    totalReceivedPrincipal: number;
    /** totalExpected − totalReceivedPrincipal: quanto ainda falta receber das parcelas. */
    totalOutstanding: number;
    /** Saldo de principal em aberto das parcelas hoje atrasadas. */
    totalOverdue: number;
    /** Entradas recebidas à vista (down payments), fora das parcelas. */
    totalDownPayments: number;
  };
  /** Juros de atraso efetivamente recebidos (item 3 e 5). */
  lateInterestReceived: PeriodAmounts;
  /**
   * "Ganhos" reais do negócio: 100% do juros de atraso recebido, mais a fração
   * de markup (30%) proporcional a cada real de principal de parcela recebido
   * — a entrada (down payment) não gera ganho, é apenas devolução de capital.
   */
  earnings: PeriodAmounts;
  /** Todo dinheiro que entrou (parcelas + juros + entradas), por período. */
  income: PeriodAmounts;
  /** Saídas manuais (despesas), por período. */
  expenses: PeriodAmounts;
  /** income.total − expenses.total. */
  netBalance: number;
  /** Controle de caixa apenas em espécie (item 10 e 11). */
  cash: {
    income: PeriodAmounts;
    expensesTotal: number;
    balance: number;
  };
  /** Total recebido (parcelas + juros + entradas) agrupado por forma de pagamento (item 9 e 12). */
  receivedByMethod: Record<PaymentMethod, number>;
}

const EMPTY_METHOD_TOTALS: Record<PaymentMethod, number> = {
  dinheiro: 0,
  pix: 0,
  cartao: 0,
  outro: 0,
};

export async function getDashboardMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<DashboardMetrics> {
  const now = new Date();

  const [{ data: contractsData }, { data: paymentsData }, { data: installmentsData }, { data: expensesData }] =
    await Promise.all([
      supabase.from("contracts").select("id, principal_amount, has_down_payment, down_payment_amount, total_amount"),
      supabase.from("payments").select("*"),
      supabase.from("installments").select("amount, paid_principal_amount, status"),
      supabase.from("expenses").select("*"),
    ]);

  const contracts = (contractsData ?? []) as Pick<
    Contract,
    "id" | "principal_amount" | "has_down_payment" | "down_payment_amount" | "total_amount"
  >[];
  const payments = (paymentsData ?? []) as Payment[];
  const installments = (installmentsData ?? []) as { amount: number; paid_principal_amount: number; status: string }[];
  const expenses = (expensesData ?? []) as Expense[];

  // Fração de cada contrato que é markup (lucro), calculada uma única vez por
  // contrato e reaproveitada para todos os pagamentos dele — evita qualquer
  // cálculo divergente entre parcelas do mesmo contrato.
  const markupRatioByContract = new Map<string, number>();
  let totalPrincipal = 0;
  let totalExpected = 0;
  let totalDownPayments = 0;

  for (const contract of contracts) {
    totalPrincipal = roundCents(totalPrincipal + contract.principal_amount);
    totalExpected = roundCents(totalExpected + contract.total_amount);
    if (contract.has_down_payment) {
      totalDownPayments = roundCents(totalDownPayments + contract.down_payment_amount);
    }

    const { markupAmount } = calculateFinancedAmount({
      principalAmount: contract.principal_amount,
      hasDownPayment: contract.has_down_payment,
      downPaymentAmount: contract.down_payment_amount,
    });
    markupRatioByContract.set(contract.id, contract.total_amount > 0 ? markupAmount / contract.total_amount : 0);
  }

  const totalReceivedPrincipal = roundCents(
    installments.reduce((sum, i) => sum + i.paid_principal_amount, 0),
  );
  const totalOutstanding = roundCents(Math.max(totalExpected - totalReceivedPrincipal, 0));
  const totalOverdue = roundCents(
    installments
      .filter((i) => i.status === "atrasado")
      .reduce((sum, i) => sum + Math.max(i.amount - i.paid_principal_amount, 0), 0),
  );

  const lateInterestReceived = emptyPeriod();
  const earnings = emptyPeriod();
  const income = emptyPeriod();
  const cashIncome = emptyPeriod();
  const receivedByMethod: Record<PaymentMethod, number> = { ...EMPTY_METHOD_TOTALS };

  for (const payment of payments) {
    const paidAt = new Date(payment.paid_at);
    const total = roundCents(payment.principal_amount + payment.interest_amount);

    addToPeriod(income, total, paidAt, now);
    receivedByMethod[payment.method] = roundCents(receivedByMethod[payment.method] + total);
    if (payment.method === "dinheiro") {
      addToPeriod(cashIncome, total, paidAt, now);
    }

    addToPeriod(lateInterestReceived, payment.interest_amount, paidAt, now);

    const markupRatio = payment.installment_id ? (markupRatioByContract.get(payment.contract_id) ?? 0) : 0;
    const earnedFromPrincipal = roundCents(payment.principal_amount * markupRatio);
    addToPeriod(earnings, roundCents(earnedFromPrincipal + payment.interest_amount), paidAt, now);
  }

  const expensesPeriod = emptyPeriod();
  let cashExpensesTotal = 0;
  for (const expense of expenses) {
    const expenseDate = new Date(`${expense.expense_date}T00:00:00`);
    addToPeriod(expensesPeriod, expense.amount, expenseDate, now);
    if (expense.method === "dinheiro") {
      cashExpensesTotal = roundCents(cashExpensesTotal + expense.amount);
    }
  }

  return {
    loans: {
      totalPrincipal,
      totalExpected,
      totalReceivedPrincipal,
      totalOutstanding,
      totalOverdue,
      totalDownPayments,
    },
    lateInterestReceived,
    earnings,
    income,
    expenses: expensesPeriod,
    netBalance: roundCents(income.total - expensesPeriod.total),
    cash: {
      income: cashIncome,
      expensesTotal: cashExpensesTotal,
      balance: roundCents(cashIncome.total - cashExpensesTotal),
    },
    receivedByMethod,
  };
}
