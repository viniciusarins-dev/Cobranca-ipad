import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  INSTALLMENT_STATUS_LABELS,
  WHATSAPP_CAMPAIGN_MESSAGE_STATUS_LABELS,
  WHATSAPP_CAMPAIGN_STATUS_LABELS,
  type BackupRunStatus,
  type ContractStatus,
  type ContractType,
  type InstallmentStatus,
  type WhatsAppCampaignMessageStatus,
  type WhatsAppCampaignStatus,
} from "@/lib/types";

const CONTRACT_VARIANT: Record<ContractStatus, "success" | "warning" | "destructive" | "secondary"> = {
  ativo: "secondary",
  inadimplente: "destructive",
  quitado: "success",
  cancelado: "warning",
};

const INSTALLMENT_VARIANT: Record<InstallmentStatus, "success" | "warning" | "destructive" | "outline"> = {
  pago: "success",
  pendente: "warning",
  parcial: "outline",
  atrasado: "destructive",
};

const CONTRACT_TYPE_VARIANT: Record<ContractType, "secondary" | "outline"> = {
  emprestimo: "secondary",
  venda_iphone: "outline",
};

/** Ponto pulsante (estilo uiverse.io) para chamar atenção a status críticos. */
function PulseDot() {
  return (
    <span
      aria-hidden
      className="pulse-glow inline-block size-1.5 rounded-full bg-destructive"
      style={
        {
          "--pulse-glow-start": "color-mix(in oklch, var(--destructive), transparent 45%)",
          "--pulse-glow-end": "color-mix(in oklch, var(--destructive), transparent 100%)",
        } as CSSProperties
      }
    />
  );
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge variant={CONTRACT_VARIANT[status]}>
      {status === "inadimplente" && <PulseDot />}
      {CONTRACT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <Badge variant={INSTALLMENT_VARIANT[status]}>
      {status === "atrasado" && <PulseDot />}
      {INSTALLMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ContractTypeBadge({ type }: { type: ContractType }) {
  return <Badge variant={CONTRACT_TYPE_VARIANT[type]}>{CONTRACT_TYPE_LABELS[type]}</Badge>;
}

const BACKUP_RUN_VARIANT: Record<BackupRunStatus, "success" | "warning" | "destructive"> = {
  success: "success",
  running: "warning",
  failed: "destructive",
};

const BACKUP_RUN_LABELS: Record<BackupRunStatus, string> = {
  success: "Concluído",
  running: "Em andamento",
  failed: "Falhou",
};

const CAMPAIGN_VARIANT: Record<WhatsAppCampaignStatus, "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  rascunho: "outline",
  em_andamento: "secondary",
  pausada: "warning",
  concluida: "success",
  cancelada: "destructive",
};

export function WhatsAppCampaignStatusBadge({ status }: { status: WhatsAppCampaignStatus }) {
  return <Badge variant={CAMPAIGN_VARIANT[status]}>{WHATSAPP_CAMPAIGN_STATUS_LABELS[status]}</Badge>;
}

const CAMPAIGN_MESSAGE_VARIANT: Record<WhatsAppCampaignMessageStatus, "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  pendente: "outline",
  processando: "secondary",
  aceita: "secondary",
  enviada: "success",
  entregue: "success",
  falha: "destructive",
  cancelada: "warning",
};

export function WhatsAppCampaignMessageStatusBadge({ status }: { status: WhatsAppCampaignMessageStatus }) {
  return (
    <Badge variant={CAMPAIGN_MESSAGE_VARIANT[status]}>
      {status === "falha" && <PulseDot />}
      {WHATSAPP_CAMPAIGN_MESSAGE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function BackupRunStatusBadge({ status }: { status: BackupRunStatus }) {
  return (
    <Badge variant={BACKUP_RUN_VARIANT[status]}>
      {status === "failed" && <PulseDot />}
      {BACKUP_RUN_LABELS[status]}
    </Badge>
  );
}
