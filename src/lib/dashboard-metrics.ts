import { businessDayRangeUTC, businessMonthStartUTC, businessWeekStartUTC, getBusinessToday } from "@/lib/date-utils";
import { calculateFinancedAmount, roundCents } from "@/lib/financial-rules";
import type { createClient } from "@/lib/supabase/server";
import type { Contract, Expense, Payment, PaymentMethod, Phone } from "@/lib/types";

export interface PeriodAmounts {
  today: number;
  week: number;
  month: number;
  total: number;
}

function emptyPeriod(): PeriodAmounts {
  return { today: 0, week: 0, month: 0, total: 0 };
}

interface PeriodBoundaries {
  dayStart: Date;
  weekStart: Date;
  monthStart: Date;
}

/** Calcula os limites de hoje/semana/mês uma única vez, sempre no fuso do negócio (Brasil). */
function getPeriodBoundaries(now: Date): PeriodBoundaries {
  return {
    dayStart: businessDayRangeUTC(getBusinessToday(now)).start,
    weekStart: businessWeekStartUTC(now),
    monthStart: businessMonthStartUTC(now),
  };
}

function addToPeriod(period: PeriodAmounts, value: number, date: Date, boundaries: PeriodBoundaries) {
  period.total = roundCents(period.total + value);
  if (date >= boundaries.dayStart) period.today = roundCents(period.today + value);
  if (date >= boundaries.weekStart) period.week = roundCents(period.week + value);
  if (date >= boundaries.monthStart) period.month = roundCents(period.month + value);
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
  /**
   * Estoque de celulares (Fase 2) — rastreado separadamente dos empréstimos:
   * lucro aqui é margem de revenda (venda − custo de aquisição), não juros.
   */
  phones: {
    inStockCount: number;
    /** Total investido em custo de aquisição dos celulares ainda em estoque. */
    inStockCost: number;
    soldCount: number;
    /** Soma dos valores de venda dos celulares já vendidos. */
    totalRevenue: number;
    /** Soma do custo de aquisição dos celulares já vendidos. */
    totalCost: number;
    /** totalRevenue − totalCost, por período (baseado na data da venda). */
    profit: PeriodAmounts;
  };
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
  const boundaries = getPeriodBoundaries(now);

  const [
    { data: contractsData },
    { data: paymentsData },
    { data: installmentsData },
    { data: expensesData },
    { data: phonesData },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, type, status, principal_amount, installments_count, has_down_payment, down_payment_amount, total_amount",
      ),
    supabase.from("payments").select("*"),
    supabase.from("installments").select("contract_id, amount, paid_principal_amount, status"),
    supabase.from("expenses").select("*"),
    supabase.from("phones").select("id, cost_amount, status, sale_amount, sold_at"),
  ]);

  const allContracts = (contractsData ?? []) as Pick<
    Contract,
    | "id"
    | "type"
    | "status"
    | "principal_amount"
    | "installments_count"
    | "has_down_payment"
    | "down_payment_amount"
    | "total_amount"
  >[];
  const payments = (paymentsData ?? []) as Payment[];
  const allInstallments = (installmentsData ?? []) as {
    contract_id: string;
    amount: number;
    paid_principal_amount: number;
    status: string;
  }[];
  const expenses = (expensesData ?? []) as Expense[];
  const phones = (phonesData ?? []) as Pick<Phone, "id" | "cost_amount" | "status" | "sale_amount" | "sold_at">[];

  // Um empréstimo cancelado (ex.: cadastrado errado e excluído) nunca deve
  // continuar contando nos indicadores de empréstimos — o histórico de
  // pagamentos já recebidos permanece intocado (ver `income`/`earnings`
  // abaixo, que somam todos os `payments` sem filtrar por status do contrato).
  const contracts = allContracts.filter((c) => c.status !== "cancelado");
  const activeContractIds = new Set(contracts.map((c) => c.id));
  const installments = allInstallments.filter((i) => activeContractIds.has(i.contract_id));

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
      contractType: contract.type,
      principalAmount: contract.principal_amount,
      installmentsCount: contract.installments_count,
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

    addToPeriod(income, total, paidAt, boundaries);
    receivedByMethod[payment.method] = roundCents(receivedByMethod[payment.method] + total);
    if (payment.method === "dinheiro") {
      addToPeriod(cashIncome, total, paidAt, boundaries);
    }

    addToPeriod(lateInterestReceived, payment.interest_amount, paidAt, boundaries);

    const markupRatio = payment.installment_id ? (markupRatioByContract.get(payment.contract_id) ?? 0) : 0;
    const earnedFromPrincipal = roundCents(payment.principal_amount * markupRatio);
    addToPeriod(earnings, roundCents(earnedFromPrincipal + payment.interest_amount), paidAt, boundaries);
  }

  const expensesPeriod = emptyPeriod();
  let cashExpensesTotal = 0;
  for (const expense of expenses) {
    const expenseDate = businessDayRangeUTC(expense.expense_date).start;
    addToPeriod(expensesPeriod, expense.amount, expenseDate, boundaries);
    if (expense.method === "dinheiro") {
      cashExpensesTotal = roundCents(cashExpensesTotal + expense.amount);
    }
  }

  let inStockCount = 0;
  let inStockCost = 0;
  let soldCount = 0;
  let phonesTotalRevenue = 0;
  let phonesTotalCost = 0;
  const phonesProfit = emptyPeriod();

  for (const phone of phones) {
    if (phone.status === "estoque") {
      inStockCount += 1;
      inStockCost = roundCents(inStockCost + phone.cost_amount);
      continue;
    }

    soldCount += 1;
    const saleAmount = phone.sale_amount ?? 0;
    phonesTotalRevenue = roundCents(phonesTotalRevenue + saleAmount);
    phonesTotalCost = roundCents(phonesTotalCost + phone.cost_amount);

    if (phone.sold_at) {
      const profit = roundCents(saleAmount - phone.cost_amount);
      addToPeriod(phonesProfit, profit, new Date(phone.sold_at), boundaries);
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
    phones: {
      inStockCount,
      inStockCost,
      soldCount,
      totalRevenue: phonesTotalRevenue,
      totalCost: phonesTotalCost,
      profit: phonesProfit,
    },
  };
}
