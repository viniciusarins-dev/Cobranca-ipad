import type { MessageSettings } from "@/lib/types";

/**
 * Gestão do CICLO DE VIDA da instância Evolution (criar, obter QR Code,
 * desconectar, apagar) — diferente de `providers.ts` (que só ENVIA
 * mensagem numa instância já conectada) e de `evolution-health.ts` (que só
 * CONSULTA se está conectada). Usa a chave administrativa da Evolution
 * (`EVOLUTION_ADMIN_API_KEY`/`EVOLUTION_ADMIN_BASE_URL`), que protege os
 * endpoints de instância — nunca o token individual salvo em
 * `message_settings.api_key` (esse só serve pra ENVIAR mensagens na
 * própria instância, não para criar/apagar instâncias de outros usuários).
 * Essas duas variáveis só existem no servidor (Vercel), nunca chegam ao
 * navegador.
 *
 * ATENÇÃO: os nomes exatos de campo na resposta da Evolution API variam
 * entre versões (ex.: o token retornado por /instance/create pode vir como
 * `hash`, `instance.apikey` ou `instance.hash` dependendo da versão) — as
 * funções abaixo tentam os formatos mais comuns da v2, mas confira contra
 * a documentação da versão realmente instalada
 * (https://doc.evolution-api.com) antes de depender disso em produção; eu
 * não tenho como testar contra uma instância real a partir desta sessão.
 */

interface EvolutionAdminConfig {
  baseUrl: string;
  adminApiKey: string;
}

function getEvolutionAdminConfig(): EvolutionAdminConfig | null {
  const baseUrl = process.env.EVOLUTION_ADMIN_BASE_URL;
  const adminApiKey = process.env.EVOLUTION_ADMIN_API_KEY;
  if (!baseUrl || !adminApiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), adminApiKey };
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractInstanceToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.hash === "string") return record.hash;
  const instance = record.instance as Record<string, unknown> | undefined;
  if (instance && typeof instance.apikey === "string") return instance.apikey;
  if (instance && typeof instance.hash === "string") return instance.hash;
  return null;
}

export interface CreateInstanceResult {
  ok: boolean;
  /** Token da instância — vira `message_settings.api_key` do usuário dono. */
  instanceToken?: string;
  error?: string;
}

/**
 * Cria uma nova instância Evolution para um usuário (um "sub-WhatsApp"
 * dentro do mesmo container compartilhado — não é necessário um container
 * por usuário). `instanceName` precisa ser único no servidor Evolution;
 * usar o próprio `owner_id` (uuid) evita colisão entre usuários.
 */
export async function createEvolutionInstance(
  instanceName: string,
  webhookUrl: string,
  webhookSecret: string,
): Promise<CreateInstanceResult> {
  const config = getEvolutionAdminConfig();
  if (!config) {
    return { ok: false, error: "Evolution API administrativa não configurada (EVOLUTION_ADMIN_BASE_URL/EVOLUTION_ADMIN_API_KEY)." };
  }

  try {
    const response = await fetch(`${config.baseUrl}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: config.adminApiKey },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: false,
          headers: { Authorization: `Bearer ${webhookSecret}` },
          events: ["CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"],
        },
      }),
    });

    const body = await parseJsonSafely(response);
    if (!response.ok) {
      return { ok: false, error: `Falha ao criar instância na Evolution API (HTTP ${response.status}).` };
    }

    const instanceToken = extractInstanceToken(body);
    if (!instanceToken) {
      return {
        ok: false,
        error: "Instância criada, mas não foi possível identificar o token retornado — confira manualmente no painel da Evolution.",
      };
    }

    return { ok: true, instanceToken };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao criar instância na Evolution API." };
  }
}

export interface QrCodeResult {
  ok: boolean;
  /** Imagem do QR Code já em base64 (data URL), pronta para <img src>. */
  qrCodeBase64?: string;
  pairingCode?: string;
  /** A instância já pode estar conectada (não há QR Code pra mostrar nesse caso). */
  alreadyConnected?: boolean;
  error?: string;
}

/** GET {base_url}/instance/connect/{instance} — usa o token da PRÓPRIA instância (não o admin). */
export async function getEvolutionQrCode(
  settings: Pick<MessageSettings, "base_url" | "api_key" | "instance_id">,
): Promise<QrCodeResult> {
  const { base_url, api_key, instance_id } = settings;
  if (!base_url || !api_key || !instance_id) {
    return { ok: false, error: "Configuração da Evolution API incompleta (base_url, api_key, instance_id)." };
  }

  try {
    const response = await fetch(`${base_url.replace(/\/$/, "")}/instance/connect/${instance_id}`, {
      headers: { apikey: api_key },
    });
    const body = await parseJsonSafely(response);

    if (!response.ok) {
      return { ok: false, error: `Falha ao obter QR Code (HTTP ${response.status}).` };
    }

    const record = (body ?? {}) as Record<string, unknown>;
    const qrCodeBase64 = typeof record.base64 === "string" ? record.base64 : undefined;
    const pairingCode = typeof record.pairingCode === "string" ? record.pairingCode : undefined;

    if (!qrCodeBase64) {
      return { ok: true, alreadyConnected: true };
    }

    return { ok: true, qrCodeBase64, pairingCode };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao obter QR Code da Evolution API." };
  }
}

/** DELETE {base_url}/instance/logout/{instance} — encerra a sessão do WhatsApp sem apagar a instância. */
export async function logoutEvolutionInstance(
  settings: Pick<MessageSettings, "base_url" | "api_key" | "instance_id">,
): Promise<{ ok: boolean; error?: string }> {
  const { base_url, api_key, instance_id } = settings;
  if (!base_url || !api_key || !instance_id) {
    return { ok: false, error: "Configuração da Evolution API incompleta." };
  }

  try {
    const response = await fetch(`${base_url.replace(/\/$/, "")}/instance/logout/${instance_id}`, {
      method: "DELETE",
      headers: { apikey: api_key },
    });
    if (!response.ok) {
      return { ok: false, error: `Falha ao desconectar (HTTP ${response.status}).` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao desconectar da Evolution API." };
  }
}
