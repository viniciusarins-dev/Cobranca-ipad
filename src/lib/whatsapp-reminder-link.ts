import { calculateFinancedAmount, calculateLateInterest, daysLate, roundCents } from "@/lib/financial-rules";
import { formatCurrency, formatDate, toWhatsAppDigits } from "@/lib/utils";
import type { Client, Contract, Installment } from "@/lib/types";

export type ReminderLinkResult = { ok: true; url: string } | { ok: false; error: string };

type ReminderContract = Pick<
  Contract,
  "type" | "principal_amount" | "has_down_payment" | "down_payment_amount" | "installments_count"
>;

type ReminderInstallment = Pick<
  Installment,
  "number" | "amount" | "due_date" | "status" | "paid_principal_amount" | "paid_interest_amount"
>;

/**
 * Monta o link `wa.me` com a mensagem de cobrança já preenchida para uma
 * parcela específica — nunca envia nada sozinho, só abre a conversa com o
 * texto pronto para o usuário conferir e enviar (ver `sendCollectionReminder`
 * em `@/lib/whatsapp` para o envio automático via API, usado por outro
 * fluxo, que continua existindo separadamente).
 *
 * Todos os valores vêm das mesmas funções usadas no resto do app
 * (`calculateFinancedAmount`, `calculateLateInterest`) — nunca uma fórmula
 * nova — e nunca cobra de novo o que já foi pago: o "valor desta parcela"
 * de referência vem de `installment.amount` (valor contratado), mas o
 * "valor total a pagar" final é sempre o saldo realmente em aberto agora
 * (principal pendente + juros de atraso pendente, se houver).
 */
export function buildWhatsAppReminderLink(
  client: Pick<Client, "name" | "phone">,
  contract: ReminderContract,
  installment: ReminderInstallment,
): ReminderLinkResult {
  const waDigits = toWhatsAppDigits(client.phone);
  if (!waDigits) {
    return {
      ok: false,
      error: "Telefone do cliente inválido ou incompleto. Corrija o cadastro antes de enviar o lembrete.",
    };
  }

  const { financedBase, markupAmount } = calculateFinancedAmount({
    contractType: contract.type,
    principalAmount: contract.principal_amount,
    installmentsCount: contract.installments_count,
    hasDownPayment: contract.has_down_payment,
    downPaymentAmount: contract.down_payment_amount,
  });

  // Juros do contrato (7,5% × parcelas, aplicado uma única vez) dividido
  // igualmente entre as parcelas — mesma regra de `generateInstallments`,
  // nunca recalculada por parcela.
  const installmentBase = roundCents(financedBase / contract.installments_count);
  const installmentInterest = roundCents(markupAmount / contract.installments_count);

  const outstandingPrincipal = roundCents(Math.max(installment.amount - installment.paid_principal_amount, 0));
  const lateInterestOwed = calculateLateInterest({
    contractType: contract.type,
    originalPrincipalAmount: contract.principal_amount,
    dueDate: installment.due_date,
    status: installment.status,
    paidInterestAmount: installment.paid_interest_amount,
  });
  const isOverdue = lateInterestOwed > 0;
  const totalDueNow = roundCents(outstandingPrincipal + lateInterestOwed);

  const lines: string[] = [`Olá, ${client.name}! Tudo bem?`, ""];

  lines.push(
    contract.installments_count > 1
      ? `Estou passando para lembrar do vencimento da parcela ${installment.number}/${contract.installments_count} do seu pagamento.`
      : "Estou passando para lembrar que hoje é o vencimento do seu pagamento.",
  );
  lines.push("");

  lines.push(`Valor emprestado: ${formatCurrency(contract.principal_amount)}`);
  // Venda de iPhone nunca tem juros automático (financial-rules.ts) — mostrar
  // "sem juros"/"juros" separados só faz sentido quando há juros de fato.
  if (installmentInterest > 0) {
    lines.push(`Valor de referência sem juros: ${formatCurrency(installmentBase)}`);
    lines.push(`Juros aplicáveis: ${formatCurrency(installmentInterest)}`);
  }
  lines.push(`Valor desta parcela: ${formatCurrency(installment.amount)}`);

  if (outstandingPrincipal < installment.amount) {
    lines.push(`Já pago desta parcela: ${formatCurrency(roundCents(installment.amount - outstandingPrincipal))}`);
  }

  if (isOverdue) {
    lines.push(`Dias em atraso: ${daysLate(installment.due_date)}`);
    lines.push(`Juros por atraso: ${formatCurrency(lateInterestOwed)}`);
  }

  lines.push(`Data de vencimento: ${formatDate(installment.due_date)}`);
  lines.push(`Valor total a pagar: ${formatCurrency(totalDueNow)}`);
  lines.push("", "Por favor, entre em contato para confirmar o pagamento.", "Obrigado!");

  const url = `https://wa.me/${waDigits}?text=${encodeURIComponent(lines.join("\n"))}`;
  return { ok: true, url };
}
