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
  phoneSchema,
  sellPhoneDirectSchema,
  clientAddressSchema,
  type TransactionInput,
  type MessageSettingsInput,
  type PaymentInput,
  type ExpenseInput,
  type PhoneInput,
  type SellPhoneDirectInput,
  type ClientAddressInput,
} from "@/lib/validations";
import type { ContractStatus, InstallmentStatus, WeeklyChargeStatus } from "@/lib/types";
import { onlyDigits } from "@/lib/utils";

async function getCurrentUserEmail(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

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

  if (data.phoneId) {
    const { data: phone, error: phoneError } = await supabase
      .from("phones")
      .select("id, status")
      .eq("id", data.phoneId)
      .single();

    if (phoneError || !phone) {
      return { ok: false, error: "Celular do estoque não encontrado." };
    }
    if (phone.status === "vendido") {
      return { ok: false, error: "Este celular já foi vendido." };
    }
  }

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
    contractType: data.type,
    principalAmount: data.totalAmount,
    installmentsCount: data.installmentsCount,
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
      // total_amount já sai com os juros aplicados quando for empréstimo
      // (7,5%) ou exatamente o valor digitado quando for venda de iPhone
      // (sem juros automático) — é isto que é dividido em parcelas. O juros
      // nunca é recalculado por parcela.
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
      created_by_email: await getCurrentUserEmail(supabase),
    });
    if (downPaymentError) {
      return { ok: false, error: downPaymentError.message };
    }
  }

  if (data.phoneId) {
    const { error: phoneUpdateError } = await supabase
      .from("phones")
      .update({
        status: "vendido",
        contract_id: contract.id,
        sale_amount: roundCents(data.totalAmount),
        sold_at: new Date().toISOString(),
      })
      .eq("id", data.phoneId);
    if (phoneUpdateError) {
      return { ok: false, error: phoneUpdateError.message };
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

/**
 * Exclui um empréstimo/venda cadastrado errado. Duas situações:
 *
 * 1) Nenhum pagamento registrado ainda: exclusão real. O contrato é
 *    apagado (a foreign key `on delete cascade` já existente cuida de
 *    parcelas, weekly_charges e message_logs automaticamente — não sobra
 *    nada órfão); se havia um celular do estoque vinculado, ele volta a
 *    ficar disponível (a "venda" nunca existiu de fato).
 * 2) Já existe pagamento registrado: NUNCA apaga silenciosamente o
 *    histórico financeiro. Em vez disso, o contrato é marcado como
 *    "cancelado" (status que já existe no sistema) — payments, installments
 *    e o histórico continuam intactos para auditoria, mas o contrato para
 *    de contar em qualquer indicador/pendência/Devedores do Dia.
 */
export async function deleteContract(contractId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .maybeSingle();

  if (contractError) {
    return { ok: false, error: contractError.message };
  }
  if (!contract) {
    return { ok: false, error: "Empréstimo não encontrado (talvez já tenha sido excluído)." };
  }

  const { count: paymentsCount, error: countError } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId);

  if (countError) {
    return { ok: false, error: countError.message };
  }

  if ((paymentsCount ?? 0) > 0) {
    const { error: cancelError } = await supabase
      .from("contracts")
      .update({ status: "cancelado" })
      .eq("id", contractId);
    if (cancelError) {
      return { ok: false, error: cancelError.message };
    }
    await syncWeeklyChargeStatus(supabase, contractId, "cancelado");

    revalidatePath("/");
    revalidatePath("/debtors");
    revalidatePath(`/contracts/${contractId}`);
    return { ok: true };
  }

  const { error: phoneUnlinkError } = await supabase
    .from("phones")
    .update({
      status: "estoque",
      contract_id: null,
      sale_amount: null,
      sale_method: null,
      sold_at: null,
      buyer_name: null,
    })
    .eq("contract_id", contractId);

  if (phoneUnlinkError) {
    return { ok: false, error: phoneUnlinkError.message };
  }

  const { error: deleteError } = await supabase.from("contracts").delete().eq("id", contractId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidatePath("/");
  revalidatePath("/debtors");
  revalidatePath("/phones");
  return { ok: true };
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

  // Protege contra clique duplo / reenvio / duas requisições simultâneas:
  // se esta mesma tentativa de pagamento (mesma idempotencyKey) já foi
  // processada, não cria um segundo lançamento — apenas confirma sucesso.
  if (data.idempotencyKey) {
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("contract_id")
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existingPayment) {
      return { ok: true, contractId: existingPayment.contract_id };
    }
  }

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

  // Juros de atraso e saldo em aberto SEMPRE recalculados agora, no servidor
  // — nunca a partir de um valor mostrado na tela momentos atrás. Isso
  // fecha a causa raiz do saldo residual tipo "R$ 0,11": se o pagamento é
  // integral, o valor cobrado é exatamente o que está em aberto no instante
  // da confirmação, nunca um total pré-calculado que ficou desatualizado.
  const interestOwed = calculateLateInterest({
    amount: installment.amount,
    paidPrincipalAmount: installment.paid_principal_amount,
    dueDate: installment.due_date,
    status: installment.status,
  });
  const principalOwed = roundCents(Math.max(installment.amount - installment.paid_principal_amount, 0));

  const amountToApply = data.payInFull ? roundCents(interestOwed + principalOwed) : roundCents(data.amount!);

  const { interestPortion, principalPortion } = splitPayment(amountToApply, interestOwed, principalOwed);

  if (interestPortion + principalPortion <= 0) {
    return { ok: false, error: "Não há saldo em aberto nesta parcela." };
  }

  const createdByEmail = await getCurrentUserEmail(supabase);

  const { error: paymentError } = await supabase.from("payments").insert({
    installment_id: installment.id,
    contract_id: installment.contract_id,
    client_id: contract.client_id,
    principal_amount: principalPortion,
    interest_amount: interestPortion,
    method: data.method,
    notes: data.notes || null,
    created_by_email: createdByEmail,
    idempotency_key: data.idempotencyKey ?? null,
  });

  if (paymentError) {
    // unique_violation: outra requisição com a mesma idempotencyKey venceu a
    // corrida (ex.: duplo clique no mesmíssimo instante) — trata como
    // sucesso, nunca como erro, e nunca duplica o pagamento.
    if (paymentError.code === "23505" && data.idempotencyKey) {
      return { ok: true, contractId: installment.contract_id };
    }
    return { ok: false, error: paymentError.message };
  }

  // Nunca deixa passar de `installment.amount` (mesmo por causa de ruído de
  // ponto flutuante): parcela quitada sempre fecha com saldo exatamente
  // zero e status "pago", nunca um resíduo de centavos.
  const newPaidPrincipal = Math.min(
    roundCents(installment.paid_principal_amount + principalPortion),
    roundCents(installment.amount),
  );
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
  revalidatePath("/debtors");
  return { ok: true, contractId: installment.contract_id };
}

export async function registerExpense(input: ExpenseInput): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();
  const createdByEmail = await getCurrentUserEmail(supabase);

  const { error } = await supabase.from("expenses").insert({
    description: data.description,
    category: data.category || null,
    amount: roundCents(data.amount),
    method: data.method,
    expense_date: data.expenseDate,
    notes: data.notes || null,
    created_by_email: createdByEmail,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function createPhone(input: PhoneInput): Promise<ActionResult> {
  const parsed = phoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("phones").insert({
    model: data.model,
    description: data.description || null,
    cost_amount: roundCents(data.costAmount),
    acquired_at: data.acquiredAt,
    notes: data.notes || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/phones");
  return { ok: true };
}

export async function updatePhone(phoneId: string, input: PhoneInput): Promise<ActionResult> {
  const parsed = phoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("phones")
    .update({
      model: data.model,
      description: data.description || null,
      cost_amount: roundCents(data.costAmount),
      acquired_at: data.acquiredAt,
      notes: data.notes || null,
    })
    .eq("id", phoneId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/phones");
  return { ok: true };
}

export async function deletePhone(phoneId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: phone, error: phoneError } = await supabase
    .from("phones")
    .select("status")
    .eq("id", phoneId)
    .single();

  if (phoneError || !phone) {
    return { ok: false, error: phoneError?.message ?? "Celular não encontrado." };
  }
  if (phone.status === "vendido") {
    return { ok: false, error: "Não é possível excluir um celular já vendido (histórico de lucro)." };
  }

  const { error } = await supabase.from("phones").delete().eq("id", phoneId);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/phones");
  return { ok: true };
}

/**
 * Venda direta de um celular do estoque, fora do sistema de parcelas (à
 * vista, sem contrato/cliente cadastrado). O lucro é calculado sob demanda
 * (sale_amount - cost_amount), nunca persistido, para nunca divergir.
 */
export async function sellPhoneDirect(input: SellPhoneDirectInput): Promise<ActionResult> {
  const parsed = sellPhoneDirectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { data: phone, error: phoneError } = await supabase
    .from("phones")
    .select("status")
    .eq("id", data.phoneId)
    .single();

  if (phoneError || !phone) {
    return { ok: false, error: phoneError?.message ?? "Celular não encontrado." };
  }
  if (phone.status === "vendido") {
    return { ok: false, error: "Este celular já foi vendido." };
  }

  const { error } = await supabase
    .from("phones")
    .update({
      status: "vendido",
      sale_amount: roundCents(data.saleAmount),
      sale_method: data.saleMethod,
      buyer_name: data.buyerName || null,
      sold_at: new Date().toISOString(),
    })
    .eq("id", data.phoneId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/phones");
  return { ok: true };
}

export async function updateClientAddress(clientId: string, input: ClientAddressInput): Promise<ActionResult> {
  const parsed = clientAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({
      street: data.street || null,
      street_number: data.streetNumber || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zipCode || null,
    })
    .eq("id", clientId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}

const DOCUMENT_MAX_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Foto/PDF do documento do cliente, enviado para um bucket de Storage
 * PRIVADO (`client-documents`, criado na migration 0006) — nunca fica
 * público; só é acessível via signed URL gerada no servidor (ver
 * `getClientDocumentSignedUrl`).
 */
export async function uploadClientDocument(clientId: string, formData: FormData): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo." };
  }
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    return { ok: false, error: "Envie uma imagem ou PDF." };
  }
  if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx. 8MB)." };
  }

  const supabase = await createClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("document_photo_path")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return { ok: false, error: clientError?.message ?? "Cliente não encontrado." };
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${clientId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("client-documents")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { error: updateError } = await supabase
    .from("clients")
    .update({ document_photo_path: path })
    .eq("id", clientId);

  if (updateError) {
    // Reverte o upload para não deixar um arquivo órfão sem referência.
    await supabase.storage.from("client-documents").remove([path]);
    return { ok: false, error: updateError.message };
  }

  if (client.document_photo_path) {
    await supabase.storage.from("client-documents").remove([client.document_photo_path]);
  }

  revalidatePath("/");
  return { ok: true };
}

export async function deleteClientDocument(clientId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("document_photo_path")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return { ok: false, error: clientError?.message ?? "Cliente não encontrado." };
  }
  if (!client.document_photo_path) {
    return { ok: true };
  }

  await supabase.storage.from("client-documents").remove([client.document_photo_path]);

  const { error: updateError } = await supabase
    .from("clients")
    .update({ document_photo_path: null })
    .eq("id", clientId);

  if (updateError) {
    return { ok: false, error: updateError.message };
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
