import { parseISO } from "date-fns";

import type { InstallmentStatus } from "@/lib/types";

/**
 * Todas as regras de rentabilidade do negócio ficam centralizadas aqui para
 * evitar que cálculos divergentes apareçam em telas diferentes (dashboard,
 * criação de contrato, tela de pagamento).
 */
export const LOAN_MARKUP_RATE = 0.3;
export const LATE_INTEREST_RATE_PER_DAY = 0.01;

/** Arredonda para centavos passando por inteiro, evitando erro de ponto flutuante. */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface FinancedAmountInput {
  /** Valor original do produto/empréstimo, antes de qualquer markup. */
  principalAmount: number;
  /** Só relevante para venda de iPhone. */
  hasDownPayment: boolean;
  /** Valor recebido à vista, fora das parcelas (ignorado se hasDownPayment = false). */
  downPaymentAmount: number;
}

export interface FinancedAmountResult {
  /** Base sobre a qual os 30% incidem (principal menos a entrada, se houver). */
  financedBase: number;
  /** Valor dos 30% (o ganho previsto do contrato). */
  markupAmount: number;
  /** financedBase + markupAmount — é isto que é dividido em parcelas. */
  totalFinanced: number;
}

/**
 * Calcula o valor final a ser financiado (dividido em parcelas), aplicando
 * os 30% de markup uma única vez sobre o saldo financiado — nunca por
 * parcela — para não haver risco de duplicar o markup quando o contrato é
 * dividido em N parcelas (a divisão em si é feita depois, por splitAmount).
 */
export function calculateFinancedAmount(input: FinancedAmountInput): FinancedAmountResult {
  const downPayment = input.hasDownPayment ? Math.max(input.downPaymentAmount, 0) : 0;
  const financedBase = roundCents(Math.max(input.principalAmount - downPayment, 0));
  const markupAmount = roundCents(financedBase * LOAN_MARKUP_RATE);
  const totalFinanced = roundCents(financedBase + markupAmount);

  return { financedBase, markupAmount, totalFinanced };
}

/** Quantidade de dias corridos entre o vencimento e a data de referência (0 se ainda não venceu). */
export function daysLate(dueDate: string, referenceDate: Date = new Date()): number {
  const due = parseISO(dueDate);
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const refStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffMs = refStart.getTime() - dueStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
}

export interface LateInterestInstallmentInput {
  amount: number;
  paidPrincipalAmount: number;
  dueDate: string;
  status: InstallmentStatus;
}

/**
 * Juros de 1% ao dia sobre o saldo em aberto da parcela (amount menos o que
 * já foi pago dela), calculados a partir da diferença entre due_date e a
 * data de referência.
 *
 * É uma função PURA e idempotente — parte sempre de due_date/hoje, nunca de
 * si mesma — por isso é segura para chamar a cada renderização de tela sem
 * risco de "somar juros de novo" a cada vez que a página é aberta. Cada
 * parcela usa sua própria due_date e seu próprio saldo, então parcelas
 * diferentes (mesmo que atrasadas no mesmo período) nunca se misturam.
 */
export function calculateLateInterest(
  installment: LateInterestInstallmentInput,
  referenceDate: Date = new Date(),
): number {
  if (installment.status === "pago") {
    return 0;
  }

  const outstandingPrincipal = roundCents(
    Math.max(installment.amount - installment.paidPrincipalAmount, 0),
  );
  if (outstandingPrincipal <= 0) return 0;

  const days = daysLate(installment.dueDate, referenceDate);
  if (days <= 0) return 0;

  return roundCents(outstandingPrincipal * LATE_INTEREST_RATE_PER_DAY * days);
}

export interface SplitPaymentResult {
  /** Parte do pagamento aplicada aos juros em aberto. */
  interestPortion: number;
  /** Parte do pagamento aplicada ao principal da parcela. */
  principalPortion: number;
}

/**
 * Distribui o valor pago primeiro sobre o juros de atraso em aberto e o
 * restante sobre o principal — nunca mais do que existe de saldo em cada um,
 * para não gerar valores negativos nem "sobra" perdida.
 */
export function splitPayment(
  amountPaid: number,
  interestOwed: number,
  principalOwed: number,
): SplitPaymentResult {
  const interestPortion = roundCents(Math.min(Math.max(amountPaid, 0), Math.max(interestOwed, 0)));
  const remaining = roundCents(Math.max(amountPaid - interestPortion, 0));
  const principalPortion = roundCents(Math.min(remaining, Math.max(principalOwed, 0)));

  return { interestPortion, principalPortion };
}
