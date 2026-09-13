import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { SettingsForm } from "@/components/settings-form";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { createClient } from "@/lib/supabase/server";
import type { MessageSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_settings")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Voltar para clientes
        </Link>
        <GradientHeading className="mt-3 text-2xl sm:text-3xl">
          Configuração de cobrança via WhatsApp
        </GradientHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure o provedor de mensagens usado para enviar lembretes automáticos e manuais.
        </p>
      </div>

      <SettingsForm initialSettings={data as MessageSettings | null} />
    </main>
  );
}
