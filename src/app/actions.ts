"use server";

import { revalidatePath } from "next/cache";
import { getISODay, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { generateInstallments } from "@/lib/installments";
import { sendCollectionReminder } from "@/lib/whatsapp";
import { messageSettingsSchema, transactionSchema, type TransactionInput, type MessageSettingsInput } from "@/lib/validations";
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

export interface CepLookupResult {
  ok: boolean;
  error?: string;
  address?: string;
}

/**
 * Preenche o endereço a partir do CEP usando o ViaCEP (viacep.com.br) —
 * API pública e gratuita dos Correios, sem necessidade de cadastro ou
 * chave de API. Só funciona nesse sentido (CEP -> endereço); não existe
 * fonte pública/gratuita para localizar CPF/CNPJ a partir de telefone.
 */
export async function lookupCepAction(cep: string): Promise<CepLookupResult> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) {
    return { ok: false, error: "Informe um CEP válido (8 dígitos)." };
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) {
      return { ok: false, error: `Falha ao consultar CEP (HTTP ${response.status}).` };
    }
    const data = await response.json();
    if (data.erro) {
      return { ok: false, error: "CEP não encontrado." };
    }
    const address = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean).join(", ");
    return { ok: true, address };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao consultar CEP." };
  }
}
