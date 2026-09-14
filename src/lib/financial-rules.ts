import { daysBetweenDateStrings, getBusinessToday } from "@/lib/date-utils";
import type { ContractType, InstallmentStatus } from "@/lib/types";

/**
 * Todas as regras de rentabilidade do negócio ficam centralizadas aqui para
 * evitar que cálculos divergentes apareçam em telas diferentes (dashboard,
 * criação de contrato, tela de pagamento).
 *
 * Empréstimo: juros CONTRATUAL de 7,5% por semana/parcela, ACUMULATIVO —
 * o percentual total cresce com a quantidade de parcelas
 * (percentual = quantidadeParcelas × 7,5%; ex.: 4 parcelas = 30%,
 * 8 parcelas = 60%, 12 parcelas = 90%). Esse percentual é aplicado UMA
 * ÚNICA VEZ sobre o valor emprestado, e o total resultante é dividido
 * igualmente entre as parcelas — nunca recalculado por parcela.
 *
 * Venda de iPhone: SEM juros automático — o valor digitado pelo usuário é
 * exatamente o que é dividido em parcelas (o lucro da venda do aparelho é
 * rastreado à parte, no módulo de estoque/Celulares).
 *
 * Este juros do empréstimo é totalmente independente do juros de atraso
 * (1%/dia, `LATE_INTEREST_RATE_PER_DAY`) — nunca são somados na mesma
 * fórmula; o de atraso só incide se uma parcela não for paga no vencimento.
 */
export const LOAN_WEEKLY_INTEREST_RATE_PERCENT = 7.5;
export const LATE_INTEREST_RATE_PER_DAY = 0.01;

/** Arredonda para centavos passando por inteiro, evitando erro de ponto flutuante. */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface FinancedAmountInput {
  contractType: ContractType;
  /** Valor original do produto/empréstimo, antes de qualquer juros. */
  principalAmount: number;
  /** Quantidade de parcelas/semanas — define o percentual acumulado do empréstimo. */
  installmentsCount: number;
  /** Só relevante para venda de iPhone. */
  hasDownPayment: boolean;
  /** Valor recebido à vista, fora das parcelas (ignorado se hasDownPayment = false). */
  downPaymentAmount: number;
}

export interface FinancedAmountResult {
  /** Base sobre a qual os juros incidem (principal menos a entrada, se houver). */
  financedBase: number;
  /** Valor dos juros do empréstimo (0 para venda de iPhone). */
  markupAmount: number;
  /** financedBase + markupAmount — é isto que é dividido em parcelas. */
  totalFinanced: number;
  /** Taxa efetivamente aplicada, como fração (ex.: 0,6 para 60%). 0 para venda de iPhone. */
  rate: number;
  /** A mesma taxa, em percentual, já arredondada para exibição (ex.: 60, 22.5). */
  ratePercent: number;
}

/**
 * Calcula o valor final a ser financiado (dividido em parcelas). Para
 * empréstimo, o percentual de juros é quantidadeParcelas × 7,5% — calculado
 * e aplicado UMA ÚNICA VEZ sobre o valor emprestado, nunca por parcela —
 * e o total resultante é então dividido em partes iguais (a divisão em si é
 * feita depois, por `splitAmount`, que ajusta a última parcela para a soma
 * bater exatamente com o total).
 */
export function calculateFinancedAmount(input: FinancedAmountInput): FinancedAmountResult {
  const downPayment = input.hasDownPayment ? Math.max(input.downPaymentAmount, 0) : 0;
  const financedBase = roundCents(Math.max(input.principalAmount - downPayment, 0));
  const ratePercent =
    input.contractType === "emprestimo"
      ? Math.round(input.installmentsCount * LOAN_WEEKLY_INTEREST_RATE_PERCENT * 100) / 100
      : 0;
  const rate = ratePercent / 100;
  const markupAmount = roundCents(financedBase * rate);
  const totalFinanced = roundCents(financedBase + markupAmount);

  return { financedBase, markupAmount, totalFinanced, rate, ratePercent };
}

/**
 * Quantidade de dias corridos entre o vencimento e a data de referência
 * (0 se ainda não venceu). Compara sempre pelo calendário do fuso horário
 * do negócio (Brasil) — nunca pelo fuso do processo do servidor — para uma
 * parcela de amanhã nunca ser contada como já vencida (ou vice-versa) só
 * por causa de onde o código está rodando.
 */
export function daysLate(dueDate: string, referenceDate: Date = new Date()): number {
  const todayStr = getBusinessToday(referenceDate);
  return Math.max(daysBetweenDateStrings(dueDate, todayStr), 0);
}

export interface LateInterestInstallmentInput {
  /**
   * Valor originalmente emprestado no CONTRATO (`contracts.principal_amount`)
   * — base do juros de atraso. NUNCA o valor da parcela, nem o saldo em
   * aberto dela: o juros de atraso é 1% ao dia sobre o valor total que foi
   * emprestado ao cliente, independente de quanto já foi pago daquela
   * parcela especificamente.
   */
  originalPrincipalAmount: number;
  dueDate: string;
  status: InstallmentStatus;
}

/**
 * Juros de 1% ao dia sobre o valor ORIGINALMENTE EMPRESTADO no contrato
 * (nunca sobre o valor da parcela nem sobre o saldo em aberto dela),
 * calculados a partir da diferença entre due_date e a data de referência.
 *
 * É uma função PURA e idempotente — parte sempre de due_date/hoje e do
 * valor original do contrato, nunca de um juros calculado anteriormente —
 * por isso é segura para chamar a cada renderização de tela sem risco de
 * "juros sobre juros": abrir a tela de novo no mesmo dia sempre devolve o
 * mesmo valor, nunca soma em cima do que já tinha sido mostrado antes.
 * Cada parcela usa sua própria due_date, então parcelas diferentes do
 * mesmo contrato (mesmo que atrasadas ao mesmo tempo) contam seus próprios
 * dias de atraso separadamente — mas todas usam a MESMA base (o valor
 * original do contrato), conforme a regra de negócio.
 */
export function calculateLateInterest(
  installment: LateInterestInstallmentInput,
  referenceDate: Date = new Date(),
): number {
  if (installment.status === "pago") {
    return 0;
  }

  const days = daysLate(installment.dueDate, referenceDate);
  if (days <= 0) return 0;

  return roundCents(installment.originalPrincipalAmount * LATE_INTEREST_RATE_PER_DAY * days);
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
