import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedBySecret } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Webhook da Evolution API (configurado em `createEvolutionInstance`,
 * `evolution-instance.ts`) — hoje só usado para confirmar ENTREGA real de
 * mensagens de campanha (evento de atualização de status), nunca para
 * executar qualquer operação financeira (seção 9 do pedido: "O webhook
 * não deverá executar operações financeiras"). Tudo que não reconhece é
 * só descartado (200 OK, sem erro) — nunca tenta adivinhar a estrutura.
 *
 * O formato exato do payload varia por versão da Evolution API; o que
 * importa aqui é genérico o bastante (nome da instância, id da mensagem,
 * status) para sobreviver a pequenas mudanças de schema entre versões —
 * ainda assim, confira contra uma entrega real antes de confiar 100% em
 * produção, já que esta sessão não tem como testar contra uma instância
 * de verdade.
 */

interface EvolutionWebhookBody {
  event?: string;
  instance?: string;
  data?: unknown;
}

function hashPayload(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function extractMessageId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const key = record.key as Record<string, unknown> | undefined;
  if (key && typeof key.id === "string") return key.id;
  if (typeof record.keyId === "string") return record.keyId;
  return null;
}

/** Normaliza os vários formatos de status de entrega da Evolution/Baileys para "entregue" ou não. */
function isDeliveredStatus(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const status = String(record.status ?? (record.update as Record<string, unknown> | undefined)?.status ?? "").toUpperCase();
  return status.includes("DELIVERY") || status === "READ" || status === "3" || status === "4";
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedBySecret(request, "EVOLUTION_WEBHOOK_SECRET")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: EvolutionWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const instanceName = body.instance;
  if (!instanceName) {
    return NextResponse.json({ ok: true, ignored: "sem instância" });
  }

  const supabase = createServiceRoleClient();

  // Resolve o dono via instance_id — o webhook não tem sessão de usuário,
  // então precisa dessa busca explícita antes de gravar qualquer coisa.
  const { data: settings } = await supabase
    .from("message_settings")
    .select("owner_id")
    .eq("instance_id", instanceName)
    .eq("provider", "evolution")
    .maybeSingle();

  if (!settings) {
    return NextResponse.json({ ok: true, ignored: "instância desconhecida" });
  }

  const providerEventId = hashPayload(body);

  // Idempotência: a mesma entrega de webhook pode chegar mais de uma vez.
  const { error: insertEventError } = await supabase.from("whatsapp_webhook_events").insert({
    owner_id: settings.owner_id,
    provider_event_id: providerEventId,
    event_type: body.event ?? "desconhecido",
    payload: body as unknown as Record<string, unknown>,
  });

  if (insertEventError) {
    // Violação de unique = evento repetido, já processado antes — ignora sem erro.
    if (insertEventError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ ok: true, ignored: "erro ao registrar evento" });
  }

  const messageId = extractMessageId(body.data);
  if (messageId && isDeliveredStatus(body.data)) {
    await supabase
      .from("whatsapp_campaign_messages")
      .update({ status: "entregue", delivered_at: new Date().toISOString() })
      .eq("owner_id", settings.owner_id)
      .eq("provider_message_id", messageId)
      .eq("status", "enviada");
  }

  await supabase
    .from("whatsapp_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("owner_id", settings.owner_id)
    .eq("provider_event_id", providerEventId);

  return NextResponse.json({ ok: true });
}
