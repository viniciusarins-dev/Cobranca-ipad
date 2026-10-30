"use client";

import { useState } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, SendIcon, WifiIcon } from "lucide-react";

import { StatTile } from "@/components/ui/stat-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionPanel } from "@/components/whatsapp/connection-panel";
import { CampaignsPanel } from "@/components/whatsapp/campaigns-panel";
import { HistoryPanel } from "@/components/whatsapp/history-panel";
import { ConsentPanel } from "@/components/whatsapp/consent-panel";
import type { CampaignMessageStatusCounts } from "@/lib/whatsapp/campaign-queue";
import type { MessageSettings, WhatsAppCampaign } from "@/lib/types";
import type { WhatsAppBlockedClientRow, WhatsAppHistoryRow } from "@/app/(app)/whatsapp/page";

type TabValue = "painel" | "conexao" | "campanhas" | "historico" | "bloqueios";

export function WhatsAppCenterView({
  settings,
  campaigns,
  history,
  clients,
  blockedClients,
  statusCounts,
}: {
  settings: MessageSettings | null;
  campaigns: WhatsAppCampaign[];
  history: WhatsAppHistoryRow[];
  clients: { id: string; name: string; phone: string }[];
  blockedClients: WhatsAppBlockedClientRow[];
  statusCounts: CampaignMessageStatusCounts;
}) {
  const [tab, setTab] = useState<TabValue>("painel");

  const isConnected = Boolean(settings?.is_active && settings.provider && (settings.provider !== "evolution" || settings.instance_id));
  const pending = statusCounts.pendente + statusCounts.processando + statusCounts.aceita;
  const sent = statusCounts.enviada + statusCounts.entregue;
  const failed = statusCounts.falha;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile
          label="Conexão"
          value={isConnected ? 1 : 0}
          icon={WifiIcon}
          accent={isConnected ? "success" : "destructive"}
          className="[&_span:last-child]:text-base"
        />
        <StatTile label="Pendentes" value={pending} icon={ClockIcon} accent="warning" />
        <StatTile label="Enviadas" value={sent} icon={CheckCircle2Icon} accent="success" />
        <StatTile label="Falhas" value={failed} icon={AlertTriangleIcon} accent="destructive" />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
        <TabsList>
          <TabsTrigger value="painel">
            <SendIcon className="size-3.5" /> Painel
          </TabsTrigger>
          <TabsTrigger value="conexao">Conexão</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="bloqueios">Bloqueios ({blockedClients.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="mt-4">
          <HistoryPanel history={history.slice(0, 15)} compact />
        </TabsContent>

        <TabsContent value="conexao" className="mt-4">
          <ConnectionPanel settings={settings} />
        </TabsContent>

        <TabsContent value="campanhas" className="mt-4">
          <CampaignsPanel campaigns={campaigns} hasActiveSettings={Boolean(settings)} />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <HistoryPanel history={history} />
        </TabsContent>

        <TabsContent value="bloqueios" className="mt-4">
          <ConsentPanel blockedClients={blockedClients} clients={clients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
