"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, MegaphoneIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WHATSAPP_CAMPAIGN_FILTER_LABELS, type WhatsAppCampaignFilterType } from "@/lib/types";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { createWhatsAppCampaign, previewWhatsAppCampaign, startWhatsAppCampaign } from "@/app/actions";
import type { CampaignCandidate, CampaignExclusion } from "@/lib/whatsapp/campaign-recipients";

const DEFAULT_TEMPLATE =
  "Olá {nome_cliente}! Identificamos pendência de R$ {valor} referente à parcela {numero_parcela}, vencimento em {data_vencimento}. Você tem {quantidade_parcelas_atraso} parcela(s) em atraso, saldo total em aberto de R$ {saldo_total_em_aberto}. Regularize o quanto antes.";

type Step = "form" | "preview";

export function NewCampaignDialog({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [filterType, setFilterType] = useState<WhatsAppCampaignFilterType>("devedores_do_dia");
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);
  const [intervalSeconds, setIntervalSeconds] = useState(5);

  const [candidates, setCandidates] = useState<CampaignCandidate[]>([]);
  const [excluded, setExcluded] = useState<CampaignExclusion[]>([]);
  const [deselected, setDeselected] = useState<Set<string>>(new Set());

  function resetAll() {
    setStep("form");
    setName("");
    setFilterType("devedores_do_dia");
    setMessageTemplate(DEFAULT_TEMPLATE);
    setIntervalSeconds(5);
    setCandidates([]);
    setExcluded([]);
    setDeselected(new Set());
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetAll();
  }

  async function handlePreview() {
    if (!messageTemplate.trim()) {
      toast.error("Informe o texto da mensagem.");
      return;
    }
    setLoadingPreview(true);
    const result = await previewWhatsAppCampaign({ filterType, messageTemplate });
    setLoadingPreview(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.candidates.length === 0) {
      toast.error("Nenhum destinatário elegível para este filtro.");
      return;
    }
    setCandidates(result.candidates);
    setExcluded(result.excluded);
    setDeselected(new Set());
    setStep("preview");
  }

  const selectedCandidates = candidates.filter((c) => !deselected.has(c.clientId));
  const totalValue = selectedCandidates.reduce((sum, c) => sum + c.installmentTotalDue, 0);

  async function handleConfirm() {
    if (!name.trim()) {
      toast.error("Dê um nome para a campanha.");
      return;
    }
    if (selectedCandidates.length === 0) {
      toast.error("Selecione ao menos um destinatário.");
      return;
    }

    setSubmitting(true);
    const result = await createWhatsAppCampaign({
      name,
      filterType,
      messageTemplate,
      intervalSeconds,
      manualClientIds: selectedCandidates.map((c) => c.clientId),
    });
    setSubmitting(false);

    if (!result.ok || !result.campaignId) {
      toast.error(result.error ?? "Erro ao criar campanha.");
      return;
    }

    await startWhatsAppCampaign(result.campaignId);
    toast.success("Campanha criada e iniciada.");
    setOpen(false);
    resetAll();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled}>
          <MegaphoneIcon />
          Nova campanha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova campanha de cobrança</DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Escolha quem receber e o texto da mensagem — a lista real é montada na prévia, a partir dos dados de hoje."
              : "Confira exatamente quem vai receber e a mensagem de cada um antes de confirmar."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="campaign-name">Nome da campanha</Label>
              <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cobrança de outubro" />
            </div>

            <div className="grid gap-1.5">
              <Label>Destinatários</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as WhatsAppCampaignFilterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WHATSAPP_CAMPAIGN_FILTER_LABELS)
                    .filter(([value]) => value !== "selecao_manual")
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A seleção manual (desmarcar clientes específicos) acontece na próxima tela, depois da prévia.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="campaign-interval">Intervalo entre envios (segundos)</Label>
              <Input
                id="campaign-interval"
                type="number"
                min={0}
                max={600}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="max-w-32"
              />
              <p className="text-xs text-muted-foreground">Intervalo fixo — nunca randômico.</p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="campaign-template">Mensagem</Label>
              <Textarea id="campaign-template" rows={5} value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: <code>{"{nome_cliente}"}</code> <code>{"{numero_parcela}"}</code>{" "}
                <code>{"{valor}"}</code> <code>{"{data_vencimento}"}</code> <code>{"{dias_atraso}"}</code>{" "}
                <code>{"{juros_dia}"}</code> <code>{"{valor_atualizado}"}</code> <code>{"{quantidade_parcelas_atraso}"}</code>{" "}
                <code>{"{saldo_total_em_aberto}"}</code>.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handlePreview} disabled={loadingPreview}>
                {loadingPreview && <Loader2Icon className="animate-spin" />}
                Pré-visualizar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 rounded-md bg-muted px-3 py-2 text-sm sm:grid-cols-3">
              <p>
                <span className="font-medium">{selectedCandidates.length}</span> selecionados
              </p>
              <p>
                <span className="font-medium">{formatCurrency(totalValue)}</span> em aberto
              </p>
              <p className="text-muted-foreground">{excluded.length} excluído(s) automaticamente</p>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border">
              {candidates.map((candidate) => {
                const isOut = deselected.has(candidate.clientId);
                return (
                  <div
                    key={candidate.clientId}
                    className={`flex items-start gap-3 border-b p-3 last:border-b-0 ${isOut ? "opacity-50" : ""}`}
                  >
                    <Checkbox
                      checked={!isOut}
                      onCheckedChange={(checked) => {
                        setDeselected((prev) => {
                          const next = new Set(prev);
                          if (checked) next.delete(candidate.clientId);
                          else next.add(candidate.clientId);
                          return next;
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {candidate.clientName} · {formatPhone(candidate.toPhone)} · {formatCurrency(candidate.installmentTotalDue)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{candidate.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {excluded.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none">Ver excluídos automaticamente ({excluded.length})</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {excluded.map((e) => (
                    <li key={e.clientId}>
                      {e.clientName} — {e.reason === "contato_bloqueado" ? "contato bloqueado" : "sem telefone válido"}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("form")}>
                Voltar
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={submitting || selectedCandidates.length === 0}>
                {submitting && <Loader2Icon className="animate-spin" />}
                Confirmar e iniciar campanha
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
