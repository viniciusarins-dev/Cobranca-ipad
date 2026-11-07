import { daysBetweenDateStrings, getBusinessToday } from "@/lib/date-utils";
import type { ContractType, InstallmentStatus } from "@/lib/types";

/**
 * Todas as regras de rentabilidade do negócio ficam centralizadas aqui para
 * evitar que cálculos divergentes apareçam em telas diferentes (dashboard,
 * criação de contrato, tela de pagamento).
 *
 * Empréstimo: juros CONTRATUAL escolhido manualmente pelo usuário a cada
 * cadastro (`contracts.interest_rate_percent`, sugestão inicial de 7,5% no
 * formulário), por parcela, ACUMULATIVO — o percentual total cresce com a
 * quantidade de parcelas (percentual = quantidadeParcelas × taxa digitada;
 * ex.: taxa de 7,5% com 4 parcelas = 30%, com 8 parcelas = 60%). Esse
 * percentual é aplicado UMA ÚNICA VEZ sobre o valor emprestado, e o total
 * resultante é dividido igualmente entre as parcelas — nunca recalculado
 * por parcela, nem depois de salvo (mudar a taxa não afeta contratos já
 * cadastrados, só os próximos).
 *
 * Venda de iPhone: SEM juros automático — o valor digitado pelo usuário é
 * exatamente o que é dividido em parcelas (o lucro da venda do aparelho é
 * rastreado à parte, no módulo de estoque/Celulares).
 *
 * Este juros do empréstimo é totalmente independente do juros de atraso
 * (1%/dia, `LATE_INTEREST_RATE_PER_DAY`) — nunca são somados na mesma
 * fórmula; o de atraso só incide se uma parcela não for paga no vencimento.
 */
export const DEFAULT_LOAN_INTEREST_RATE_PERCENT = 7.5;
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
  /**
   * Taxa de juros por parcela (%), escolhida manualmente pelo usuário no
   * cadastro do empréstimo (`contracts.interest_rate_percent`). Ignorada
   * para venda de iPhone — venda nunca tem juros automático, seja qual for
   * o valor recebido aqui.
   */
  interestRatePercentPerInstallment: number;
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
 * empréstimo, o percentual de juros é quantidadeParcelas × taxa manual do
 * cadastro (`interestRatePercentPerInstallment`) — calculado e aplicado UMA
 * ÚNICA VEZ sobre o valor emprestado, nunca por parcela — e o total
 * resultante é então dividido em partes iguais (a divisão em si é feita
 * depois, por `splitAmount`, que ajusta a última parcela para a soma bater
 * exatamente com o total).
 */
export function calculateFinancedAmount(input: FinancedAmountInput): FinancedAmountResult {
  const downPayment = input.hasDownPayment ? Math.max(input.downPaymentAmount, 0) : 0;
  const financedBase = roundCents(Math.max(input.principalAmount - downPayment, 0));
  const ratePercent =
    input.contractType === "emprestimo"
      ? Math.round(input.installmentsCount * input.interestRatePercentPerInstallment * 100) / 100
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
   * Juros de atraso é regra EXCLUSIVA de empréstimo — venda de iPhone nunca
   * gera juros de atraso (item 10 do pedido: "essas regras pertencem
   * exclusivamente aos empréstimos"). Uma parcela de venda de iPhone em
   * atraso continua aparecendo como pendente/atrasada, só que sem nenhum
   * acréscimo — o lucro dela vem exclusivamente de venda − custo.
   */
  contractType: ContractType;
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
  /**
   * Juros de atraso já efetivamente pago PARA ESTA PARCELA
   * (`installments.paid_interest_amount`) — descontado do juros bruto
   * calculado pela fórmula. Sem isso, um pagamento que já incluiu juros
   * "desaparecia": o juros pendente era recalculado do zero a cada consulta
   * (sempre a partir de due_date/hoje) e voltava a cobrar o que o cliente
   * já tinha pago. Sempre 0 para uma parcela que nunca recebeu pagamento
   * de juros.
   */
  paidInterestAmount: number;
}

/**
 * Juros de 1% ao dia sobre o valor ORIGINALMENTE EMPRESTADO no contrato
 * (nunca sobre o valor da parcela nem sobre o saldo em aberto dela),
 * calculados a partir da diferença entre due_date e a data de referência,
 * MENOS o que já foi efetivamente pago de juros nesta parcela — o
 * resultado é sempre o juros PENDENTE agora, nunca o juros bruto acumulado
 * desde o vencimento. Só se aplica a empréstimos — venda de iPhone nunca
 * gera juros de atraso.
 *
 * É uma função PURA e idempotente — parte sempre de due_date/hoje, do valor
 * original do contrato e do juros já pago (nunca de um juros pendente
 * calculado anteriormente) — por isso é segura para chamar a cada
 * renderização de tela sem risco de "juros sobre juros": abrir a tela de
 * novo no mesmo dia sempre devolve o mesmo valor, nunca soma em cima do que
 * já tinha sido mostrado antes. Cada parcela usa sua própria due_date e seu
 * próprio paidInterestAmount, então parcelas diferentes do mesmo contrato
 * (mesmo que atrasadas ao mesmo tempo) nunca se misturam.
 */
export function calculateLateInterest(
  installment: LateInterestInstallmentInput,
  referenceDate: Date = new Date(),
): number {
  if (installment.contractType !== "emprestimo") {
    return 0;
  }

  if (installment.status === "pago") {
    return 0;
  }

  const days = daysLate(installment.dueDate, referenceDate);
  if (days <= 0) return 0;

  const grossInterest = roundCents(installment.originalPrincipalAmount * LATE_INTEREST_RATE_PER_DAY * days);
  return roundCents(Math.max(grossInterest - installment.paidInterestAmount, 0));
}

export interface RenewalInterestInstallmentInput {
  contractType: ContractType;
  /** `contracts.principal_amount` — mesma base usada em `calculateFinancedAmount` e no juros de atraso. */
  principalAmount: number;
  installmentsCount: number;
  hasDownPayment: boolean;
  downPaymentAmount: number;
  /** `contracts.interest_rate_percent` — mesma taxa manual usada no cadastro do empréstimo. */
  interestRatePercentPerInstallment: number;
  dueDate: string;
  status: InstallmentStatus;
  /** `installments.amount` desta parcela — define a fatia do juros contratual total que ela carrega. */
  installmentAmount: number;
  paidInterestAmount: number;
}

/**
 * Juros a pagar para RENOVAR uma parcela: o cliente avisa que não vai pagar
 * o valor total, paga só o juros e "rola" a dívida por mais um período (ex.:
 * emprestou 1000 com 300 de juros, paga os 300, renova por mais um mês
 * devendo 1300 de novo — mesmo vencimento, um período pra frente: 11/11 →
 * 11/12). Diferente do juros de atraso (`calculateLateInterest`, que só
 * nasce depois que a data já passou), este é o juros CONTRATUAL do período
 * (a fatia desta parcela no total de juros do empréstimo,
 * `calculateFinancedAmount`) — disponível A QUALQUER MOMENTO, antes, no dia
 * ou depois do vencimento (pedido explícito: o cliente pode avisar
 * antecipadamente que não vai pagar o total).
 *
 * Se a parcela já estiver em atraso de verdade quando a renovação acontece,
 * o juros de atraso normal (1%/dia) se soma ao juros contratual do período,
 * e `paidInterestAmount` (sempre zerado a cada renovação, igual ao juros de
 * atraso) é descontado do total combinado — nunca dos dois juros calculados
 * separadamente, para não descontar duas vezes.
 */
export function calculateRenewalInterest(
  installment: RenewalInterestInstallmentInput,
  referenceDate: Date = new Date(),
): number {
  if (installment.contractType !== "emprestimo") return 0;
  if (installment.status === "pago") return 0;

  const { markupAmount } = calculateFinancedAmount({
    contractType: installment.contractType,
    principalAmount: installment.principalAmount,
    installmentsCount: installment.installmentsCount,
    hasDownPayment: installment.hasDownPayment,
    downPaymentAmount: installment.downPaymentAmount,
    interestRatePercentPerInstallment: installment.interestRatePercentPerInstallment,
  });
  const periodInterest = roundCents(markupAmount / Math.max(installment.installmentsCount, 1));

  const daysLateCount = daysLate(installment.dueDate, referenceDate);
  const lateInterestGross = roundCents(installment.principalAmount * LATE_INTEREST_RATE_PER_DAY * daysLateCount);

  return roundCents(Math.max(periodInterest + lateInterestGross - installment.paidInterestAmount, 0));
}

export interface SplitPaymentResult {
  /** Parte do pagamento aplicada aos juros em aberto. */
  interestPortion: number;
  /** Parte do pagamento aplicada ao principal da parcela. */
  principalPortion: number;
}

/**
 * Distribui o valor pago primeiro sobre o PRINCIPAL em aberto da parcela e
 * só o que sobrar (se sobrar) vai para o juros de atraso — nunca mais do
 * que existe de saldo em cada um, para não gerar valores negativos nem
 * "sobra" perdida.
 *
 * Um pagamento PARCIAL (que não cobre principal + juros) portanto reduz
 * exclusivamente o saldo principal da parcela; o juros de atraso continua
 * sendo cobrado (calculado ao vivo, sem nenhum desconto) até que um
 * pagamento cubra também o principal inteiro — só nesse momento o que
 * sobrar do pagamento é aplicado ao juros. Isso evita a inconsistência de
 * um pagamento parcial "absorver" parte do juros silenciosamente: antes,
 * juros era descontado primeiro, então o saldo principal parecia maior do
 * que o cliente esperava (ex.: pagou R$200 de uma parcela de R$325 com
 * R$70 de juros, e o saldo principal ficava em R$195 em vez de R$125 —
 * exatamente os R$70 de juros "sumiam" do principal sem aparecer como
 * juros pago em lugar nenhum, e continuavam sendo cobrados de novo).
 */
export function splitPayment(
  amountPaid: number,
  interestOwed: number,
  principalOwed: number,
): SplitPaymentResult {
  const principalPortion = roundCents(Math.min(Math.max(amountPaid, 0), Math.max(principalOwed, 0)));
  const remaining = roundCents(Math.max(amountPaid - principalPortion, 0));
  const interestPortion = roundCents(Math.min(remaining, Math.max(interestOwed, 0)));

  return { interestPortion, principalPortion };
}

export interface SettlementInstallmentInput {
  id: string;
  number: number;
  /** Saldo de principal ainda em aberto desta parcela (amount − paid_principal_amount, nunca negativo). */
  outstandingPrincipal: number;
  /** Juros de atraso pendente desta parcela, já calculado via `calculateLateInterest` (0 para venda de produto). */
  interestOwed: number;
}

export interface SettlementAllocation {
  id: string;
  principalApplied: number;
  interestApplied: number;
}

export interface SettlementAllocationResult {
  allocations: SettlementAllocation[];
  totalPrincipalApplied: number;
  totalInterestApplied: number;
  totalApplied: number;
  /** Soma do saldo (principal + juros) de TODAS as parcelas em aberto, antes da quitação. */
  previousBalance: number;
  /** previousBalance − totalApplied, nunca negativo — a parte do saldo perdoada no acordo (nunca lançada como dinheiro recebido). */
  waivedAmount: number;
}

/**
 * Quitação total: distribui o valor recebido entre as parcelas ainda em
 * aberto do contrato, da mais antiga para a mais nova, usando a MESMA regra
 * já usada em cada parcela individualmente (`splitPayment`: primeiro cobre
 * o principal, só depois o juros) — generalizada aqui para várias parcelas
 * em sequência em vez de uma só. Nunca aplica mais do que o saldo de cada
 * parcela; o que sobrar sem cobertura (quando o valor recebido é menor que
 * o saldo total) é `waivedAmount` — a diferença do acordo, que esta função
 * nunca inventa como dinheiro recebido, só calcula para exibição/auditoria.
 *
 * Função PURA — nunca escreve no banco. Quem decide se pode gravar (ex.:
 * rejeitar valor recebido maior que `previousBalance`) é sempre o chamador
 * (`settleContract`, em actions.ts).
 */
export function allocateSettlement(
  installments: SettlementInstallmentInput[],
  amountReceived: number,
): SettlementAllocationResult {
  const sorted = [...installments].sort((a, b) => a.number - b.number);
  const previousBalance = roundCents(
    sorted.reduce((sum, installment) => sum + installment.outstandingPrincipal + installment.interestOwed, 0),
  );

  let remaining = roundCents(Math.max(amountReceived, 0));
  const allocations: SettlementAllocation[] = [];
  let totalPrincipalApplied = 0;
  let totalInterestApplied = 0;

  for (const installment of sorted) {
    const { principalPortion, interestPortion } = splitPayment(
      remaining,
      installment.interestOwed,
      installment.outstandingPrincipal,
    );
    allocations.push({ id: installment.id, principalApplied: principalPortion, interestApplied: interestPortion });
    totalPrincipalApplied = roundCents(totalPrincipalApplied + principalPortion);
    totalInterestApplied = roundCents(totalInterestApplied + interestPortion);
    remaining = roundCents(Math.max(remaining - principalPortion - interestPortion, 0));
  }

  const totalApplied = roundCents(totalPrincipalApplied + totalInterestApplied);
  const waivedAmount = roundCents(Math.max(previousBalance - totalApplied, 0));

  return { allocations, totalPrincipalApplied, totalInterestApplied, totalApplied, previousBalance, waivedAmount };
}
