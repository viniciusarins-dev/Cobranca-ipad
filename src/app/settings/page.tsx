import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { SettingsForm } from "@/components/settings-form";
import { LookupSettingsForm } from "@/components/lookup-settings-form";
import { createClient } from "@/lib/supabase/server";
import type { LookupSettings, MessageSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: messageSettings }, { data: lookupSettings }] = await Promise.all([
    supabase.from("message_settings").select("*").eq("is_active", true).maybeSingle(),
    supabase.from("lookup_settings").select("*").eq("is_active", true).maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Voltar para clientes
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Configuração de cobrança via WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Configure o provedor de mensagens usado para enviar lembretes automáticos e manuais.
          </p>
        </div>

        <SettingsForm initialSettings={messageSettings as MessageSettings | null} />
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Consulta de dados cadastrais</h2>
          <p className="text-sm text-muted-foreground">
            Configure o conector com o provedor de dados (CPF/CNPJ, CEP, endereço a partir de telefone) que sua
            empresa contratar.
          </p>
        </div>

        <LookupSettingsForm initialSettings={lookupSettings as LookupSettings | null} />
      </div>
    </main>
  );
}
