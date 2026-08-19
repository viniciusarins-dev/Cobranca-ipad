import type { DocumentType, LookupSettings, PhoneLookupData } from "@/lib/types";
import { onlyDigits } from "@/lib/utils";

export interface LookupExecutionResult {
  ok: boolean;
  statusCode: number;
  data: PhoneLookupData | null;
  raw: unknown;
}

export interface LookupProvider {
  lookup(phone: string): Promise<LookupExecutionResult>;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Acessa um valor aninhado por caminho "a.b.0.c" (aceita índices numéricos de array). */
function getByPath(source: unknown, path: string): unknown {
  if (!path) return undefined;
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((value, key) => {
      if (value === null || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[key];
    }, source);
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function inferDocumentType(document: string | null): DocumentType | null {
  if (!document) return null;
  const digits = onlyDigits(document);
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return null;
}

/**
 * Conector REST genérico e configurável: o usuário define URL, método,
 * autenticação e o mapeamento (caminho no JSON de resposta) de cada campo
 * na tela de Configurações. Não está acoplado a nenhum provedor de dados
 * específico — cabe à operação contratar um fornecedor de consulta
 * cadastral e configurar os parâmetros aqui.
 */
class GenericRestLookupProvider implements LookupProvider {
  constructor(private settings: LookupSettings) {}

  async lookup(phone: string): Promise<LookupExecutionResult> {
    const { base_url, method, api_key, auth_header, auth_scheme, body_template } = this.settings;
    if (!base_url) {
      throw new Error("Configuração incompleta: informe a URL base da API de consulta.");
    }

    const digits = onlyDigits(phone);
    const url = base_url.replace(/\{phone\}/g, digits);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth_header && api_key) {
      headers[auth_header] = auth_scheme ? `${auth_scheme} ${api_key}` : api_key;
    }

    let body: string | undefined;
    if (method === "POST") {
      body = (body_template || '{"phone":"{phone}"}').replace(/\{phone\}/g, digits);
    }

    const response = await fetch(url, { method, headers, body });
    const raw = await parseResponse(response);

    if (!response.ok) {
      return { ok: false, statusCode: response.status, data: null, raw };
    }

    const document = toStringOrNull(getByPath(raw, this.settings.document_field ?? ""));
    const documentTypeRaw = toStringOrNull(getByPath(raw, this.settings.document_type_field ?? ""));
    const documentType =
      (documentTypeRaw?.toLowerCase() as DocumentType | undefined) &&
      ["cpf", "cnpj"].includes(documentTypeRaw!.toLowerCase())
        ? (documentTypeRaw!.toLowerCase() as DocumentType)
        : inferDocumentType(document);

    const data: PhoneLookupData = {
      document,
      documentType,
      name: toStringOrNull(getByPath(raw, this.settings.name_field ?? "")),
      cep: toStringOrNull(getByPath(raw, this.settings.cep_field ?? "")),
      address: toStringOrNull(getByPath(raw, this.settings.address_field ?? "")),
    };

    return { ok: true, statusCode: response.status, data, raw };
  }
}

export function createLookupProvider(settings: LookupSettings): LookupProvider {
  switch (settings.provider) {
    case "generic_rest":
      return new GenericRestLookupProvider(settings);
    default:
      throw new Error(`Provedor de consulta não suportado: ${settings.provider}`);
  }
}
