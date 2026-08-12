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

const INSTALLMENT_VARIANT: Record<InstallmentStatus, "success" | "warning" | "destructive"> = {
  pago: "success",
  pendente: "warning",
  atrasado: "destructive",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge variant={CONTRACT_VARIANT[status]}>{CONTRACT_STATUS_LABELS[status]}</Badge>;
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return <Badge variant={INSTALLMENT_VARIANT[status]}>{INSTALLMENT_STATUS_LABELS[status]}</Badge>;
}
