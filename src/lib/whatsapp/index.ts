import type { SupabaseClient } from "@supabase/supabase-js";

import { createWhatsAppProvider } from "@/lib/whatsapp/providers";
import { renderReminderMessage } from "@/lib/whatsapp/template";

export interface SendReminderResult {
  ok: boolean;
  error?: string;
}

/**
 * Envia (ou reenvia) a cobrança de uma parcela via WhatsApp, usando a
 * configuração ativa em `message_settings`. Registra o resultado em
 * `message_logs` e atualiza `reminder_sent_at` / `reminder_count`.
 */
export async function sendCollectionReminder(
  supabase: SupabaseClient,
  installmentId: string,
): Promise<SendReminderResult> {
  const { data: installment, error: installmentError } = await supabase
    .from("installments")
    .select("*, contract:contracts(*, client:clients(*))")
    .eq("id", installmentId)
    .single();

  if (installmentError || !installment) {
    return { ok: false, error: "Parcela não encontrada." };
  }

  const contract = installment.contract as { installments_count: number; client: { id: string; name: string; phone: string } };
  const client = contract.client;

  const { data: settings, error: settingsError } = await supabase
    .from("message_settings")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (settingsError || !settings) {
    return { ok: false, error: "Nenhuma configuração de WhatsApp ativa. Configure em Ajustes." };
  }

  const message = renderReminderMessage(
    settings.message_template,
    client,
    installment,
    contract.installments_count,
  );

  try {
    const provider = createWhatsAppProvider(settings);
    const result = await provider.send(client.phone, message);

    await supabase.from("message_logs").insert({
      installment_id: installment.id,
      client_id: client.id,
      status: result.ok ? "sent" : "failed",
      provider_response: result.body,
    });

    if (result.ok) {
      await supabase
        .from("installments")
        .update({
          reminder_sent_at: new Date().toISOString(),
          reminder_count: (installment.reminder_count ?? 0) + 1,
        })
        .eq("id", installment.id);

      return { ok: true };
    }

    return { ok: false, error: `Falha ao enviar (HTTP ${result.statusCode}).` };
  } catch (error) {
    await supabase.from("message_logs").insert({
      installment_id: installment.id,
      client_id: client.id,
      status: "failed",
      provider_response: { message: error instanceof Error ? error.message : String(error) },
    });

    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido ao enviar mensagem." };
  }
}
