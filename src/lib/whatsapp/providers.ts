import type { MessageSettings } from "@/lib/types";
import { onlyDigits } from "@/lib/utils";

export interface WhatsAppSendResult {
  ok: boolean;
  statusCode: number;
  body: unknown;
}

export interface WhatsAppProvider {
  send(toPhone: string, message: string): Promise<WhatsAppSendResult>;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Evolution API — https://doc.evolution-api.com
 * POST {base_url}/message/sendText/{instance_id}
 * header: apikey
 */
class EvolutionApiProvider implements WhatsAppProvider {
  constructor(private settings: MessageSettings) {}

  async send(toPhone: string, message: string): Promise<WhatsAppSendResult> {
    const { base_url, api_key, instance_id } = this.settings;
    if (!base_url || !api_key || !instance_id) {
      throw new Error("Configuração incompleta para Evolution API (base_url, api_key, instance_id).");
    }

    const response = await fetch(`${base_url.replace(/\/$/, "")}/message/sendText/${instance_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: api_key,
      },
      body: JSON.stringify({
        number: onlyDigits(toPhone),
        text: message,
      }),
    });

    return { ok: response.ok, statusCode: response.status, body: await parseResponse(response) };
  }
}

/**
 * Z-API — https://developer.z-api.io
 * POST {base_url}/instances/{instance_id}/token/{api_key}/send-text
 */
class ZApiProvider implements WhatsAppProvider {
  constructor(private settings: MessageSettings) {}

  async send(toPhone: string, message: string): Promise<WhatsAppSendResult> {
    const { base_url, api_key, instance_id } = this.settings;
    if (!base_url || !api_key || !instance_id) {
      throw new Error("Configuração incompleta para Z-API (base_url, api_key, instance_id).");
    }

    const url = `${base_url.replace(/\/$/, "")}/instances/${instance_id}/token/${api_key}/send-text`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: onlyDigits(toPhone),
        message,
      }),
    });

    return { ok: response.ok, statusCode: response.status, body: await parseResponse(response) };
  }
}

/**
 * Twilio WhatsApp API — https://www.twilio.com/docs/whatsapp
 * POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
 * instance_id é usado como Account SID, auth_token como Auth Token.
 */
class TwilioProvider implements WhatsAppProvider {
  constructor(private settings: MessageSettings) {}

  async send(toPhone: string, message: string): Promise<WhatsAppSendResult> {
    const { instance_id: accountSid, auth_token: authToken, sender_number } = this.settings;
    if (!accountSid || !authToken || !sender_number) {
      throw new Error("Configuração incompleta para Twilio (Account SID, Auth Token, número remetente).");
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: `whatsapp:${sender_number}`,
      To: `whatsapp:+${onlyDigits(toPhone)}`,
      Body: message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body,
    });

    return { ok: response.ok, statusCode: response.status, body: await parseResponse(response) };
  }
}

/**
 * WPPConnect — https://wppconnect.io
 * POST {base_url}/api/{instance_id}/send-message
 * header: Authorization Bearer {api_key}
 */
class WppConnectProvider implements WhatsAppProvider {
  constructor(private settings: MessageSettings) {}

  async send(toPhone: string, message: string): Promise<WhatsAppSendResult> {
    const { base_url, api_key, instance_id } = this.settings;
    if (!base_url || !api_key || !instance_id) {
      throw new Error("Configuração incompleta para WPPConnect (base_url, api_key, instance_id/sessão).");
    }

    const url = `${base_url.replace(/\/$/, "")}/api/${instance_id}/send-message`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        phone: onlyDigits(toPhone),
        message,
      }),
    });

    return { ok: response.ok, statusCode: response.status, body: await parseResponse(response) };
  }
}

export function createWhatsAppProvider(settings: MessageSettings): WhatsAppProvider {
  switch (settings.provider) {
    case "evolution":
      return new EvolutionApiProvider(settings);
    case "zapi":
      return new ZApiProvider(settings);
    case "twilio":
      return new TwilioProvider(settings);
    case "wppconnect":
      return new WppConnectProvider(settings);
    default:
      throw new Error(`Provedor de WhatsApp não suportado: ${settings.provider}`);
  }
}
