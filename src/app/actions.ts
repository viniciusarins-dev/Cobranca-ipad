"use server";

import { revalidatePath } from "next/cache";
import { getISODay, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { generateInstallments } from "@/lib/installments";
import { sendCollectionReminder } from "@/lib/whatsapp";
import { lookupClientData } from "@/lib/lookup";
import {
  messageSettingsSchema,
  transactionSchema,
  lookupSettingsSchema,
  phoneLookupSchema,
  type TransactionInput,
  type MessageSettingsInput,
  type LookupSettingsInput,
} from "@/lib/validations";
import type { ContractStatus, InstallmentStatus, PhoneLookupData, WeeklyChargeStatus } from "@/lib/types";
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
      if (data.clientDocument || data.clientCep || data.clientAddress) {
        await supabase
          .from("clients")
          .update({
            ...(data.clientDocument ? { document: data.clientDocument } : {}),
            ...(data.clientCep ? { cep: data.clientCep } : {}),
            ...(data.clientAddress ? { address: data.clientAddress } : {}),
          })
          .eq("id", clientId);
      }
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: data.clientName,
          phone: phoneDigits,
          email: data.clientEmail || null,
          document: data.clientDocument || null,
          cep: data.clientCep || null,
          address: data.clientAddress || null,
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        return { ok: false, error: clientError?.message ?? "Erro ao criar cliente." };
      }
      clientId = newClient.id;
    }
  }

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      client_id: clientId,
      type: data.type,
      description: data.description || null,
      total_amount: data.totalAmount,
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
    totalAmount: data.totalAmount,
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

  try {
    const provider = createWhatsAppProvider(settings);
    const result = await provider.send(
      phone,
      "Mensagem de teste do sistema de cobrança. Se você recebeu isso, a integração está funcionando corretamente.",
    );
    return result.ok ? { ok: true } : { ok: false, error: `Falha ao enviar (HTTP ${result.statusCode}).` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao enviar mensagem de teste." };
  }
}

export interface LookupActionResult {
  ok: boolean;
  error?: string;
  data?: PhoneLookupData;
}

/**
 * Consulta CPF/CNPJ, CEP e endereço a partir de um telefone, usando o
 * conector configurado em Configurações > Consulta de dados. Não persiste
 * nada por si só — o formulário decide se salva o resultado no cliente.
 */
export async function lookupPhoneAction(phone: string): Promise<LookupActionResult> {
  const parsed = phoneLookupSchema.safeParse({ phone });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Telefone inválido." };
  }

  const supabase = await createClient();
  const result = await lookupClientData(supabase, parsed.data.phone);
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

export async function saveLookupSettings(input: LookupSettingsInput): Promise<ActionResult> {
  const parsed = lookupSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;
  const supabase = await createClient();

  await supabase.from("lookup_settings").update({ is_active: false }).eq("is_active", true);

  const { error } = await supabase.from("lookup_settings").insert({
    provider: data.provider,
    base_url: data.baseUrl,
    method: data.method,
    api_key: data.apiKey || null,
    auth_header: data.authHeader || null,
    auth_scheme: data.authScheme || null,
    body_template: data.bodyTemplate || null,
    document_field: data.documentField || null,
    document_type_field: data.documentTypeField || null,
    name_field: data.nameField || null,
    cep_field: data.cepField || null,
    address_field: data.addressField || null,
    is_active: true,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true };
}
