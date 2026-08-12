import type { SupabaseClient } from "@supabase/supabase-js";

import { dispatchWeeklyCharge } from "@/lib/scheduling/dispatch-weekly-charge";
import { getBrazilDateString, getBrazilIsoWeekday, isWithinDispatchWindow } from "@/lib/scheduling/time-window";
import { checkEvolutionConnection } from "@/lib/whatsapp/evolution-health";

const MIN_DELAY_MS = 60_000;
const MAX_DELAY_MS = 120_000;

// Margem de segurança para a fila parar antes do timeout da function,
// deixando tempo para a última atualização no banco terminar.
const SAFETY_BUFFER_MS = 20_000;
const DEFAULT_BUDGET_MS = 280_000;

function randomDelayMs() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface WeeklyDispatchSummary {
  ok: boolean;
  reason?: string;
  totalDue: number;
  sent: number;
  skipped: number;
  failed: number;
  remaining: number;
}

function emptySummary(reason: string): WeeklyDispatchSummary {
  return { ok: false, reason, totalDue: 0, sent: 0, skipped: 0, failed: 0, remaining: 0 };
}

/**
 * Serviço de agendamento: identifica os contratos semanais com disparo
 * previsto para hoje e processa a fila com segurança anti-banimento
 * (healthcheck da instância, trava de horário, delay randômico entre
 * envios e re-checagem de status em tempo real antes de cada mensagem).
 *
 * Processa em lote respeitando um orçamento de tempo (`maxDurationMs`),
 * pois o delay de 60-120s por cliente pode facilmente ultrapassar o
 * limite de execução de uma function serverless. O que não for
 * processado nesta chamada permanece pendente (proximo_disparo no
 * passado) e é retomado automaticamente na próxima execução do cron —
 * o processamento é idempotente e seguro para rodar em lotes.
 */
export async function runWeeklyDispatchQueue(
  supabase: SupabaseClient,
  options: { maxDurationMs?: number } = {},
): Promise<WeeklyDispatchSummary> {
  const startedAt = Date.now();
  const budgetMs = (options.maxDurationMs ?? DEFAULT_BUDGET_MS) - SAFETY_BUFFER_MS;

  if (!isWithinDispatchWindow()) {
    return emptySummary("Fora da janela de disparo (segunda a sexta, 09h-18h).");
  }

  const { data: settings, error: settingsError } = await supabase
    .from("message_settings")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (settingsError || !settings) {
    return emptySummary("Nenhuma configuração de WhatsApp ativa. Configure em Ajustes.");
  }

  if (settings.provider !== "evolution") {
    return emptySummary("O disparo automático semanal está disponível apenas para o provedor Evolution API.");
  }

  const health = await checkEvolutionConnection(settings);
  if (!health.ok) {
    return emptySummary(health.error ?? "Instância da Evolution API não está conectada.");
  }

  const todayDateString = getBrazilDateString();
  const todayIsoWeekday = getBrazilIsoWeekday();

  const { data: dueCharges, error: dueError } = await supabase
    .from("weekly_charges")
    .select("id")
    .eq("status", "PENDENTE")
    .eq("dia_semana_disparo", todayIsoWeekday)
    .lte("proximo_disparo", todayDateString)
    .order("proximo_disparo", { ascending: true });

  if (dueError) {
    return emptySummary(dueError.message);
  }

  const queue = dueCharges ?? [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const charge of queue) {
    if (!isWithinDispatchWindow()) break; // janela fechou durante o processamento
    if (Date.now() - startedAt > budgetMs) break; // orçamento de tempo da invocação esgotado

    processed += 1;
    const result = await dispatchWeeklyCharge(supabase, charge.id, settings);

    if (result.ok) sent += 1;
    else if (result.skippedReason) skipped += 1;
    else failed += 1;

    const isLast = processed === queue.length;
    if (!isLast) {
      await sleep(randomDelayMs());
    }
  }

  return {
    ok: true,
    totalDue: queue.length,
    sent,
    skipped,
    failed,
    remaining: queue.length - processed,
  };
}
