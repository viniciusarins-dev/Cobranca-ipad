import type { SupabaseClient } from "@supabase/supabase-js";

import { createWhatsAppProvider } from "@/lib/whatsapp/providers";
import { buildReminderTemplateParams } from "@/lib/whatsapp/template";
import type { MessageSettings, WhatsAppCampaignMessageStatus } from "@/lib/types";

// Margem de segurança para a fila parar antes do timeout da function,
// deixando tempo para a última atualização no banco terminar — mesmo
// valor usado por weekly-dispatch-queue.ts.
const SAFETY_BUFFER_MS = 20_000;
const DEFAULT_BUDGET_MS = 55_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Tenta extrair o id da mensagem devolvido pelo provedor (formatos variam:
 * Evolution usa `key.id`, outros podem usar `id`/`messageId`) — só para
 * correlacionar com webhooks de entrega depois; nunca essencial ao envio
 * em si, por isso nunca lança erro se não encontrar.
 */
function extractProviderMessageId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const key = record.key as Record<string, unknown> | undefined;
  if (key && typeof key.id === "string") return key.id;
  if (typeof record.id === "string") return record.id;
  if (typeof record.messageId === "string") return record.messageId;
  return null;
}

export type CampaignMessageStatusCounts = Record<WhatsAppCampaignMessageStatus, number>;

const ALL_MESSAGE_STATUSES: WhatsAppCampaignMessageStatus[] = [
  "pendente",
  "processando",
  "aceita",
  "enviada",
  "entregue",
  "falha",
  "cancelada",
];

/**
 * Totais por status em TODAS as campanhas do usuário (painel principal da
 * Central de WhatsApp) — uma contagem por status via `count: "exact",
 * head: true` (nunca baixa as linhas em si), já que o Supabase JS não tem
 * um `group by` embutido.
 */
export async function getCampaignMessageStatusCounts(supabase: SupabaseClient): Promise<CampaignMessageStatusCounts> {
  const results = await Promise.all(
    ALL_MESSAGE_STATUSES.map((status) =>
      supabase.from("whatsapp_campaign_messages").select("id", { count: "exact", head: true }).eq("status", status),
    ),
  );

  return ALL_MESSAGE_STATUSES.reduce((acc, status, index) => {
    acc[status] = results[index].count ?? 0;
    return acc;
  }, {} as CampaignMessageStatusCounts);
}

export interface CampaignBatchSummary {
  ok: boolean;
  reason?: string;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  campaignFinished: boolean;
}

interface QueuedMessage {
  id: string;
  client_id: string;
  installment_id: string | null;
  to_phone: string;
  message_content: string;
  attempt_count: number;
}

/**
 * Processa um lote de uma campanha já criada (`whatsapp_campaign_messages`
 * com status "pendente"), respeitando um orçamento de tempo — mesmo
 * padrão de `weekly-dispatch-queue.ts`, mas SEM delay randômico nem
 * variação de texto: o intervalo é sempre o configurado pelo usuário na
 * campanha (`interval_seconds`), fixo, e a mensagem já foi renderizada e
 * congelada na criação (ver `campaign-recipients.ts`). Chamada
 * repetidamente por uma Server Action enquanto a campanha estiver
 * "em_andamento" (o app roda na Vercel, serverless — não há processo de
 * fundo contínuo; é o próprio navegador do usuário, com a tela da
 * campanha aberta, que vai pedindo o próximo lote).
 */
export async function processCampaignBatch(
  supabase: SupabaseClient,
  campaignId: string,
  options: { maxDurationMs?: number } = {},
): Promise<CampaignBatchSummary> {
  const startedAt = Date.now();
  const budgetMs = (options.maxDurationMs ?? DEFAULT_BUDGET_MS) - SAFETY_BUFFER_MS;

  const { data: campaign, error: campaignError } = await supabase
    .from("whatsapp_campaigns")
    .select("id, owner_id, status, interval_seconds")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    return { ok: false, reason: "Campanha não encontrada.", processed: 0, sent: 0, failed: 0, skipped: 0, campaignFinished: false };
  }

  if (campaign.status !== "em_andamento") {
    return {
      ok: false,
      reason: `Campanha não está em andamento (status atual: ${campaign.status}).`,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      campaignFinished: campaign.status === "concluida" || campaign.status === "cancelada",
    };
  }

  const { data: settings } = await supabase
    .from("message_settings")
    .select("*")
    .eq("owner_id", campaign.owner_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!settings) {
    return {
      ok: false,
      reason: "Nenhuma configuração de WhatsApp ativa. Configure em Ajustes.",
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      campaignFinished: false,
    };
  }

  const { data: pendingMessages } = await supabase
    .from("whatsapp_campaign_messages")
    .select("id, client_id, installment_id, to_phone, message_content, attempt_count")
    .eq("campaign_id", campaignId)
    .eq("status", "pendente")
    .order("created_at", { ascending: true });

  const queue = (pendingMessages ?? []) as QueuedMessage[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let processed = 0;

  for (const message of queue) {
    // Re-checagem em tempo real: o usuário pode ter pausado/cancelado a
    // campanha enquanto este lote rodava.
    const { data: liveStatus } = await supabase
      .from("whatsapp_campaigns")
      .select("status")
      .eq("id", campaignId)
      .single();
    if (!liveStatus || liveStatus.status !== "em_andamento") break;
    if (Date.now() - startedAt > budgetMs) break;

    // Compare-and-swap: só processa se ainda estiver "pendente" — protege
    // contra duas abas/chamadas simultâneas pegando a mesma mensagem.
    const { data: claimed } = await supabase
      .from("whatsapp_campaign_messages")
      .update({ status: "processando", attempted_at: new Date().toISOString() })
      .eq("id", message.id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();
    if (!claimed) continue; // outra chamada já pegou esta mensagem

    processed += 1;

    const result = await processOneMessage(supabase, message, settings as MessageSettings);
    if (result === "enviada") sent += 1;
    else if (result === "cancelada") skipped += 1;
    else failed += 1;

    const isLast = processed === queue.length;
    if (!isLast && campaign.interval_seconds > 0) {
      await sleep(campaign.interval_seconds * 1000);
    }
  }

  const { count: remainingCount } = await supabase
    .from("whatsapp_campaign_messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pendente");

  let campaignFinished = false;
  if ((remainingCount ?? 0) === 0) {
    await supabase.from("whatsapp_campaigns").update({ status: "concluida" }).eq("id", campaignId).eq("status", "em_andamento");
    campaignFinished = true;
  }

  if (sent > 0 || failed > 0) {
    const { data: counters } = await supabase
      .from("whatsapp_campaigns")
      .select("sent_count, failed_count")
      .eq("id", campaignId)
      .single();
    if (counters) {
      await supabase
        .from("whatsapp_campaigns")
        .update({ sent_count: counters.sent_count + sent, failed_count: counters.failed_count + failed })
        .eq("id", campaignId);
    }
  }

  return { ok: true, processed, sent, failed, skipped, campaignFinished };
}

/**
 * Antes de enviar, confirma que a parcela referenciada ainda está em
 * aberto — se o cliente já pagou enquanto a mensagem esperava na fila,
 * cancela em vez de cobrar por algo já quitado (mesmo cuidado de
 * `dispatchWeeklyCharge`, que faz a mesma re-checagem).
 */
async function isInstallmentStillOpen(supabase: SupabaseClient, installmentId: string): Promise<boolean> {
  const { data } = await supabase.from("installments").select("status").eq("id", installmentId).maybeSingle();
  return !!data && data.status !== "pago";
}

/**
 * Só a Meta Cloud API precisa disto: ela nunca aceita texto livre fora da
 * janela de 24h, só um template pré-aprovado com variáveis posicionais
 * ({{1}} {{2}} {{3}} {{4}}) — por isso, quando o provedor ativo é "meta",
 * busca de novo os dados da parcela/contrato/cliente para montar esses
 * parâmetros (mesmos 4 de sempre: nome, parcela, valor, vencimento),
 * nunca o `message_content` já renderizado como texto livre (que a Meta
 * ignoraria de qualquer forma fora da janela de atendimento).
 */
async function buildTemplateParamsIfMeta(
  supabase: SupabaseClient,
  settings: MessageSettings,
  installmentId: string | null,
): Promise<string[] | undefined> {
  if (settings.provider !== "meta" || !installmentId) return undefined;

  const { data } = await supabase
    .from("installments")
    .select("number, amount, due_date, contract:contracts(installments_count, client:clients(name))")
    .eq("id", installmentId)
    .maybeSingle();

  const contract = data?.contract as unknown as { installments_count: number; client: { name: string } } | null;
  if (!data || !contract) return undefined;

  return buildReminderTemplateParams(contract.client, data, contract.installments_count);
}

async function processOneMessage(
  supabase: SupabaseClient,
  message: QueuedMessage,
  settings: MessageSettings,
): Promise<WhatsAppCampaignMessageStatus> {
  if (message.installment_id && !(await isInstallmentStillOpen(supabase, message.installment_id))) {
    await supabase
      .from("whatsapp_campaign_messages")
      .update({ status: "cancelada", error_message: "Parcela já paga antes do envio." })
      .eq("id", message.id);
    return "cancelada";
  }

  try {
    const templateParams = await buildTemplateParamsIfMeta(supabase, settings, message.installment_id);
    const provider = createWhatsAppProvider(settings);
    const result = await provider.send(message.to_phone, { text: message.message_content, templateParams });

    if (result.ok) {
      await supabase
        .from("whatsapp_campaign_messages")
        .update({
          status: "enviada",
          provider_message_id: extractProviderMessageId(result.body),
          confirmed_at: new Date().toISOString(),
          attempt_count: message.attempt_count + 1,
        })
        .eq("id", message.id);
      return "enviada";
    }

    await supabase
      .from("whatsapp_campaign_messages")
      .update({
        status: "falha",
        error_message: `Falha ao enviar (HTTP ${result.statusCode}).`,
        attempt_count: message.attempt_count + 1,
      })
      .eq("id", message.id);
    return "falha";
  } catch (error) {
    await supabase
      .from("whatsapp_campaign_messages")
      .update({
        status: "falha",
        error_message: error instanceof Error ? error.message : "Erro desconhecido ao enviar mensagem.",
        attempt_count: message.attempt_count + 1,
      })
      .eq("id", message.id);
    return "falha";
  }
}
