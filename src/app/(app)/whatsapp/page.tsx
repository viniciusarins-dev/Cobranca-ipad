import { WhatsAppCenterView } from "@/components/whatsapp/whatsapp-center-view";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { ShinyText } from "@/components/ui/shiny-text";
import { getCampaignMessageStatusCounts } from "@/lib/whatsapp/campaign-queue";
import { createClient } from "@/lib/supabase/server";
import type { MessageSettings, WhatsAppCampaign } from "@/lib/types";

export const dynamic = "force-dynamic";

export interface WhatsAppHistoryRow {
  id: string;
  status: string;
  to_phone: string;
  message_content: string;
  error_message: string | null;
  created_at: string;
  attempted_at: string | null;
  confirmed_at: string | null;
  delivered_at: string | null;
  client: { name: string } | null;
  campaign: { name: string } | null;
}

export interface WhatsAppBlockedClientRow {
  id: string;
  client_id: string;
  blocked_at: string | null;
  notes: string | null;
  client: { name: string; phone: string } | null;
}

export default async function WhatsAppPage() {
  const supabase = await createClient();

  const [
    { data: settingsData },
    { data: campaignsData },
    { data: historyData },
    { data: clientsData },
    { data: blockedData },
    statusCounts,
  ] = await Promise.all([
    supabase.from("message_settings").select("*").eq("is_active", true).maybeSingle(),
    supabase.from("whatsapp_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
    supabase
      .from("whatsapp_campaign_messages")
      .select(
        "id, status, to_phone, message_content, error_message, created_at, attempted_at, confirmed_at, delivered_at, client:clients(name), campaign:whatsapp_campaigns(name)",
      )
      .order("created_at", { ascending: false })
      .limit(150),
    supabase.from("clients").select("id, name, phone").order("name"),
    supabase
      .from("whatsapp_consents")
      .select("id, client_id, blocked_at, notes, client:clients(name, phone)")
      .eq("category", "cobranca")
      .eq("is_blocked", true)
      .order("blocked_at", { ascending: false }),
    getCampaignMessageStatusCounts(supabase),
  ]);

  const settings = (settingsData ?? null) as MessageSettings | null;
  const campaigns = (campaignsData ?? []) as WhatsAppCampaign[];
  const history = (historyData ?? []) as unknown as WhatsAppHistoryRow[];
  const clients = (clientsData ?? []) as { id: string; name: string; phone: string }[];
  const blockedClients = (blockedData ?? []) as unknown as WhatsAppBlockedClientRow[];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <ShinyText className="text-xs font-semibold uppercase tracking-widest">Painel · RECEBE</ShinyText>
        <GradientHeading className="text-3xl sm:text-4xl">Central de WhatsApp</GradientHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Conexão, campanhas de cobrança em lote e histórico de envios — separado do lembrete manual já existente
          em cada parcela.
        </p>
      </div>

      <WhatsAppCenterView
        settings={settings}
        campaigns={campaigns}
        history={history}
        clients={clients}
        blockedClients={blockedClients}
        statusCounts={statusCounts}
      />
    </main>
  );
}
