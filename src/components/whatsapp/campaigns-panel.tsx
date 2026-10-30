"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PauseIcon, PlayIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WhatsAppCampaignStatusBadge } from "@/components/status-badge";
import { NewCampaignDialog } from "@/components/whatsapp/new-campaign-dialog";
import { cancelWhatsAppCampaign, pauseWhatsAppCampaign, runWhatsAppCampaignBatch, startWhatsAppCampaign } from "@/app/actions";
import { WHATSAPP_CAMPAIGN_FILTER_LABELS, type WhatsAppCampaign } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

/**
 * Enquanto uma campanha está "em_andamento", processa lotes repetidamente
 * — o app roda serverless na Vercel, sem processo de fundo contínuo, então
 * é o próprio navegador (com esta tela aberta) que mantém o avanço,
 * chamando `runWhatsAppCampaignBatch` de novo assim que o lote anterior
 * responde (o servidor já pausa entre cada envio pelo intervalo
 * configurado — nunca um delay extra somado aqui). Pausar/cancelar a
 * campanha (de outra aba, inclusive) interrompe isto no próximo lote.
 */
function useLiveCampaignProgress(campaign: WhatsAppCampaign, onFinished: () => void) {
  const [liveSent, setLiveSent] = useState(0);
  const [liveFailed, setLiveFailed] = useState(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (campaign.status !== "em_andamento") return;
    let cancelled = false;

    async function loop() {
      if (runningRef.current) return;
      runningRef.current = true;
      while (!cancelled) {
        const summary = await runWhatsAppCampaignBatch(campaign.id);
        if (cancelled) break;
        if (!summary.ok) break;
        setLiveSent((s) => s + summary.sent);
        setLiveFailed((f) => f + summary.failed);
        if (summary.campaignFinished || summary.processed === 0) {
          onFinished();
          break;
        }
      }
      runningRef.current = false;
    }

    void loop();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reinicia quando o status muda, nunca a cada render.
  }, [campaign.id, campaign.status]);

  return { liveSent, liveFailed };
}

function CampaignRow({ campaign, onChanged }: { campaign: WhatsAppCampaign; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const { liveSent, liveFailed } = useLiveCampaignProgress(campaign, onChanged);

  const sentCount = campaign.sent_count + liveSent;
  const failedCount = campaign.failed_count + liveFailed;
  const pendingCount = Math.max(campaign.total_count - sentCount - failedCount, 0);

  async function handleAction(action: (id: string) => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    setBusy(true);
    const result = await action(campaign.id);
    setBusy(false);
    if (result.ok) {
      toast.success(successMessage);
      onChanged();
    } else {
      toast.error(result.error ?? "Erro ao atualizar campanha.");
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{campaign.name}</TableCell>
      <TableCell className="text-muted-foreground">{WHATSAPP_CAMPAIGN_FILTER_LABELS[campaign.filter_type]}</TableCell>
      <TableCell>
        <WhatsAppCampaignStatusBadge status={campaign.status} />
      </TableCell>
      <TableCell className="tabular-nums">
        {sentCount}/{campaign.total_count}
        {failedCount > 0 && <span className="ml-1 text-destructive">({failedCount} falhas)</span>}
        {campaign.status === "em_andamento" && pendingCount > 0 && (
          <Loader2Icon className="ml-1.5 inline size-3 animate-spin text-muted-foreground" />
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(campaign.created_at)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1.5">
          {(campaign.status === "rascunho" || campaign.status === "pausada") && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => handleAction(startWhatsAppCampaign, "Campanha iniciada.")}>
              <PlayIcon />
            </Button>
          )}
          {campaign.status === "em_andamento" && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => handleAction(pauseWhatsAppCampaign, "Campanha pausada.")}>
              <PauseIcon />
            </Button>
          )}
          {(campaign.status === "rascunho" || campaign.status === "em_andamento" || campaign.status === "pausada") && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => handleAction(cancelWhatsAppCampaign, "Campanha cancelada.")}>
              <XIcon />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function CampaignsPanel({
  campaigns,
  hasActiveSettings,
}: {
  campaigns: WhatsAppCampaign[];
  hasActiveSettings: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hasActiveSettings ? "Campanhas em lote — intervalo sempre fixo, nunca randômico." : "Configure o WhatsApp em Ajustes antes de criar uma campanha."}
        </p>
        <NewCampaignDialog disabled={!hasActiveSettings} />
      </div>

      <SpotlightCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campanha</TableHead>
              <TableHead>Filtro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma campanha criada ainda.
                </TableCell>
              </TableRow>
            )}
            {campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} onChanged={() => router.refresh()} />
            ))}
          </TableBody>
        </Table>
      </SpotlightCard>
    </div>
  );
}
