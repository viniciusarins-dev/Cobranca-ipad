import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import {
  CONTRACT_STATUS_LABELS,
  INSTALLMENT_STATUS_LABELS,
  type ContractStatus,
  type InstallmentStatus,
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
