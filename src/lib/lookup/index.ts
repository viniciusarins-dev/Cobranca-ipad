import type { SupabaseClient } from "@supabase/supabase-js";

import { createLookupProvider } from "@/lib/lookup/providers";
import type { PhoneLookupData } from "@/lib/types";

export interface PhoneLookupResult {
  ok: boolean;
  error?: string;
  data?: PhoneLookupData;
}

/**
 * Consulta dados cadastrais (CPF/CNPJ, CEP, endereço) a partir de um
 * telefone, usando o conector configurado em `lookup_settings`. Não
 * persiste nada — quem chama decide o que fazer com o resultado.
 */
export async function lookupClientData(supabase: SupabaseClient, phone: string): Promise<PhoneLookupResult> {
  const { data: settings, error: settingsError } = await supabase
    .from("lookup_settings")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (settingsError || !settings) {
    return {
      ok: false,
      error: "Nenhum provedor de consulta cadastral configurado. Acesse Configurações > Consulta de dados.",
    };
  }

  try {
    const provider = createLookupProvider(settings);
    const result = await provider.lookup(phone);

    if (!result.ok || !result.data) {
      return { ok: false, error: `Falha na consulta (HTTP ${result.statusCode}).` };
    }

    return { ok: true, data: result.data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido na consulta." };
  }
}
