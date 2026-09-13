"use server";

import { revalidatePath } from "next/cache";
import { getISODay, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { generateInstallments } from "@/lib/installments";
import { sendCollectionReminder } from "@/lib/whatsapp";
import {
  calculateFinancedAmount,
  calculateLateInterest,
  daysLate,
  roundCents,
  splitPayment,
} from "@/lib/financial-rules";
import {
  messageSettingsSchema,
  transactionSchema,
  paymentSchema,
  expenseSchema,
  type TransactionInput,
  type MessageSettingsInput,
  type PaymentInput,
  type ExpenseInput,
} from "@/lib/validations";
import type { ContractStatus, InstallmentStatus, WeeklyChargeStatus } from "@/lib/types";
import { onlyDigits } from "@/lib/utils";

/** ISO 8601 (1=segunda ... 7=domingo), com fins de semana ajustados para o dia útil mais próximo. */
function toBusinessWeekday(date: string): number {
  const isoWeekday = getISODay(parseISO(date));
  if (isoWeekday === 6) return 5; // sábado -> sexta
  if (isoWeekday === 7) return 1; // domingo -> segunda
  return isoWeekday;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  contractId?: string;
}

export async function createTransaction(input: TransactionInput): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  let clientId = data.clientId;

  if (!clientId) {
    const phoneDigits = onlyDigits(data.clientPhone);
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", phoneDigits)
      .maybeSingle();

    if (existing) {
      clientId = existing.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: data.clientName,
          phone: phoneDigits,
          email: data.clientEmail || null,
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        return { ok: false, error: clientError?.message ?? "Erro ao criar cliente." };
      }
      clientId = newClient.id;
    }
  }

  const hasDownPayment = data.type === "venda_iphone" && data.hasDownPayment;
  const { totalFinanced } = calculateFinancedAmount({
    principalAmount: data.totalAmount,
    hasDownPayment,
    downPaymentAmount: data.downPaymentAmount,
  });

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      client_id: clientId,
      type: data.type,
      description: data.description || null,
      principal_amount: data.totalAmount,
      has_down_payment: hasDownPayment,
      down_payment_amount: hasDownPayment ? data.downPaymentAmount : 0,
      // total_amount é o valor JÁ com os 30% de markup aplicados sobre o
      // saldo financiado (produto menos entrada) — é isto que é dividido
      // em parcelas. O markup nunca é recalculado por parcela.
      total_amount: totalFinanced,
      installments_count: data.installmentsCount,
      periodicity: data.periodicity,
      first_due_date: data.firstDueDate,
      status: "ativo",
    })
    .select("id")
    .single();

  if (contractError || !contract) {
    return { ok: false, error: contractError?.message ?? "Erro ao criar contrato." };
  }

  const installments = generateInstallments({
    totalAmount: totalFinanced,
    installmentsCount: data.installmentsCount,
    periodicity: data.periodicity,
    firstDueDate: data.firstDueDate,
  }).map((installment) => ({
    contract_id: contract.id,
    number: installment.number,
    amount: installment.amount,
    due_date: installment.due_date,
  }));

  const { error: installmentsError } = await supabase.from("installments").insert(installments);
  if (installmentsError) {
    return { ok: false, error: installmentsError.message };
  }

  if (hasDownPayment && data.downPaymentAmount > 0) {
    const { error: downPaymentError } = await supabase.from("payments").insert({
      installment_id: null,
      contract_id: contract.id,
      client_id: clientId,
      principal_amount: roundCents(data.downPaymentAmount),
      interest_amount: 0,
      method: data.downPaymentMethod,
      notes: "Entrada",
    });
    if (downPaymentError) {
      return { ok: false, error: downPaymentError.message };
    }
  }

  if (data.periodicity === "semanal") {
    const { error: weeklyChargeError } = await supabase.from("weekly_charges").insert({
      contract_id: contract.id,
      client_id: clientId,
      dia_semana_disparo: toBusinessWeekday(data.firstDueDate),
      proximo_disparo: data.firstDueDate,
      status: "PENDENTE",
    });
    if (weeklyChargeError) {
      return { ok: false, error: weeklyChargeError.message };
    }
  }

  revalidatePath("/");
  return { ok: true, contractId: contract.id };
}

/**
 * Mantém `weekly_charges.status` sincronizado com o status do contrato.
 * O pagamento continua sendo controlado manualmente pelos toggles de
 * parcela — isto apenas reflete esse controle no campo que a fila de
 * disparo semanal checa em tempo real antes de cada envio.
 */
async function syncWeeklyChargeStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string,
  contractStatus: ContractStatus,
) {
  let weeklyStatus: WeeklyChargeStatus = "PENDENTE";
  if (contractStatus === "quitado") weeklyStatus = "PAGO";
  else if (contractStatus === "cancelado") weeklyStatus = "CANCELADO";

  await supabase.from("weekly_charges").update({ status: weeklyStatus }).eq("contract_id", contractId);
}

async function recalculateContractStatus(supabase: Awaited<ReturnType<typeof createClient>>, contractId: string) {
  const { data: installments } = await supabase
    .from("installments")
    .select("status")
    .eq("contract_id", contractId);

  if (!installments || installments.length === 0) return;

  let status: ContractStatus = "ativo";
  if (installments.every((installment) => installment.status === "pago")) {
    status = "quitado";
  } else if (installments.some((installment) => installment.status === "atrasado")) {
    status = "inadimplente";
  }

  await supabase.from("contracts").update({ status }).eq("id", contractId);
  await syncWeeklyChargeStatus(supabase, contractId, status);
}

export async function updateInstallmentStatus(
  installmentId: string,
  status: InstallmentStatus,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: installment, error } = await supabase
    .from("installments")
    .update({ status, paid_at: status === "pago" ? new Date().toISOString() : null })
    .eq("id", installmentId)
    .select("contract_id")
    .single();

  if (error || !installment) {
    return { ok: false, error: error?.message ?? "Erro ao atualizar parcela." };
  }

  await recalculateContractStatus(supabase, installment.contract_id);

  revalidatePath(`/contracts/${installment.contract_id}`);
  revalidatePath("/");
  return { ok: true };
}

/**
 * Fluxo principal de recebimento de uma parcela: calcula o juros de atraso
 * em aberto no momento (ao vivo, via calculateLateInterest — nunca um valor
 * acumulado salvo), aplica o valor pago primeiro no juros e depois no
 * principal, e registra tudo em `payments` para o histórico (item 16),
 * suportando pagamento parcial e qualquer forma de pagamento.
 */
export async function registerPayment(input: PaymentInput): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: installment, error: installmentError } = await supabase
    .from("installments")
    .select("id, contract_id, amount, paid_principal_amount, due_date, status")
    .eq("id", data.installmentId)
    .single();

  if (installmentError || !installment) {
    return { ok: false, error: installmentError?.message ?? "Parcela não encontrada." };
  }

  if (installment.status === "pago") {
    return { ok: false, error: "Esta parcela já está totalmente paga." };
  }

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("client_id")
    .eq("id", installment.contract_id)
    .single();

  if (contractError || !contract) {
    return { ok: false, error: contractError?.message ?? "Contrato não encontrado." };
  }

  const interestOwed = calculateLateInterest({
    amount: installment.amount,
    paidPrincipalAmount: installment.paid_principal_amount,
    dueDate: installment.due_date,
    status: installment.status,
  });
  const principalOwed = roundCents(Math.max(installment.amount - installment.paid_principal_amount, 0));

  const { interestPortion, principalPortion } = splitPayment(data.amount, interestOwed, principalOwed);

  if (interestPortion + principalPortion <= 0) {
    return { ok: false, error: "Não há saldo em aberto nesta parcela." };
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    installment_id: installment.id,
    contract_id: installment.contract_id,
    client_id: contract.client_id,
    principal_amount: principalPortion,
    interest_amount: interestPortion,
    method: data.method,
    notes: data.notes || null,
  });

  if (paymentError) {
    return { ok: false, error: paymentError.message };
  }

  const newPaidPrincipal = roundCents(installment.paid_principal_amount + principalPortion);
  const isFullyPaid = newPaidPrincipal >= roundCents(installment.amount);
  const isStillLate = daysLate(installment.due_date) > 0;

  const newStatus: InstallmentStatus = isFullyPaid ? "pago" : isStillLate ? "atrasado" : "parcial";

  const { error: updateError } = await supabase
    .from("installments")
    .update({
      paid_principal_amount: newPaidPrincipal,
      status: newStatus,
      paid_at: isFullyPaid ? new Date().toISOString() : null,
    })
    .eq("id", installment.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await recalculateContractStatus(supabase, installment.contract_id);

  revalidatePath(`/contracts/${installment.contract_id}`);
  revalidatePath("/");
  return { ok: true, contractId: installment.contract_id };
}

export async function registerExpense(input: ExpenseInput): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("expenses").insert({
    description: data.description,
    category: data.category || null,
    amount: roundCents(data.amount),
    method: data.method,
    expense_date: data.expenseDate,
    notes: data.notes || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function sendReminderAction(installmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const result = await sendCollectionReminder(supabase, installmentId);

  const { data: installment } = await supabase
    .from("installments")
    .select("contract_id")
    .eq("id", installmentId)
    .single();

  if (installment) {
    revalidatePath(`/contracts/${installment.contract_id}`);
  }

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function saveMessageSettings(input: MessageSettingsInput): Promise<ActionResult> {
  const parsed = messageSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  await supabase.from("message_settings").update({ is_active: false }).eq("is_active", true);

  const { error } = await supabase.from("message_settings").insert({
    provider: data.provider,
    base_url: data.baseUrl || null,
    api_key: data.apiKey || null,
    instance_id: data.instanceId || null,
    sender_number: data.senderNumber || null,
    auth_token: data.authToken || null,
    message_template: data.messageTemplate,
    template_name: data.templateName || null,
    template_language: data.templateLanguage || "pt_BR",
    is_active: true,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function sendTestMessage(phone: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: settings, error: settingsError } = await supabase
    .from("message_settings")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (settingsError || !settings) {
    return { ok: false, error: "Nenhuma configuração ativa encontrada." };
  }

  const { createWhatsAppProvider } = await import("@/lib/whatsapp/providers");
  const { formatDate } = await import("@/lib/utils");

  try {
    const provider = createWhatsAppProvider(settings);
    const result = await provider.send(phone, {
      text: "Mensagem de teste do sistema de cobrança. Se você recebeu isso, a integração está funcionando corretamente.",
      // Parâmetros de amostra — usados apenas pelo provider Meta Cloud API,
      // que precisa preencher as variáveis do template aprovado mesmo num teste.
      templateParams: ["Cliente Teste", "1/1", "0,00", formatDate(new Date())],
    });
    return result.ok ? { ok: true } : { ok: false, error: `Falha ao enviar (HTTP ${result.statusCode}).` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao enviar mensagem de teste." };
  }
}
