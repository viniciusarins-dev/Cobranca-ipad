"use client";

import { useState } from "react";
import { MessageCircleIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InstallmentStatusBadge } from "@/components/status-badge";
import { RegisterPaymentDialog } from "@/components/register-payment-dialog";
import { type Installment } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { sendReminderAction } from "@/app/actions";

function InstallmentRow({
  installment,
  totalInstallments,
  contractPrincipalAmount,
}: {
  installment: Installment;
  totalInstallments: number;
  contractPrincipalAmount: number;
}) {
  const [isSending, setIsSending] = useState(false);

  async function handleSendReminder() {
    setIsSending(true);
    const result = await sendReminderAction(installment.id);
    setIsSending(false);
    if (result.ok) {
      toast.success("Lembrete de cobrança enviado.");
    } else {
      toast.error(result.error ?? "Erro ao enviar lembrete.");
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between",
        installment.status === "atrasado" && "border-destructive/30",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            Parcela {installment.number}/{totalInstallments}
          </span>
          <InstallmentStatusBadge status={installment.status} />
        </div>
        <span className="text-sm text-muted-foreground">
          {formatCurrency(installment.amount)} · Vencimento: {formatDate(installment.due_date)}
        </span>
        {installment.paid_principal_amount > 0 && installment.status !== "pago" && (
          <span className="text-xs text-muted-foreground">
            Pago parcialmente: {formatCurrency(installment.paid_principal_amount)}
          </span>
        )}
        {installment.reminder_sent_at && (
          <span className="text-xs text-muted-foreground">
            Último lembrete enviado em {formatDate(installment.reminder_sent_at)} ({installment.reminder_count}x)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {installment.status !== "pago" && (
          <RegisterPaymentDialog installment={installment} contractPrincipalAmount={contractPrincipalAmount} />
        )}

        <Button
          type="button"
          variant={installment.status === "atrasado" ? "glow" : "outline"}
          size="sm"
          disabled={installment.status === "pago" || isSending}
          onClick={handleSendReminder}
        >
          {isSending ? <Loader2Icon className="animate-spin" /> : <MessageCircleIcon />}
          Enviar Lembrete
        </Button>
      </div>
    </div>
  );
}

export function InstallmentsGrid({
  installments,
  contractPrincipalAmount,
}: {
  installments: Installment[];
  contractPrincipalAmount: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {installments.map((installment) => (
        <InstallmentRow
          key={installment.id}
          installment={installment}
          totalInstallments={installments.length}
          contractPrincipalAmount={contractPrincipalAmount}
        />
      ))}
    </div>
  );
}
