"use client";

import { useState, useTransition } from "react";
import { MessageCircleIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { InstallmentStatusBadge } from "@/components/status-badge";
import { INSTALLMENT_STATUS_LABELS, type Installment, type InstallmentStatus } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { sendReminderAction, updateInstallmentStatus } from "@/app/actions";

const STATUS_OPTIONS: InstallmentStatus[] = ["pendente", "atrasado", "pago"];

function InstallmentRow({
  installment,
  totalInstallments,
}: {
  installment: Installment;
  totalInstallments: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSending, setIsSending] = useState(false);

  function handleStatusChange(status: InstallmentStatus) {
    if (status === installment.status) return;
    startTransition(async () => {
      const result = await updateInstallmentStatus(installment.id, status);
      if (!result.ok) toast.error(result.error ?? "Erro ao atualizar parcela.");
    });
  }

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
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-opacity sm:flex-row sm:items-center sm:justify-between",
        isPending && "opacity-60",
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
        {installment.reminder_sent_at && (
          <span className="text-xs text-muted-foreground">
            Último lembrete enviado em {formatDate(installment.reminder_sent_at)} ({installment.reminder_count}x)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border p-1">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange(status)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                installment.status === status
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {INSTALLMENT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
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

export function InstallmentsGrid({ installments }: { installments: Installment[] }) {
  return (
    <div className="flex flex-col gap-3">
      {installments.map((installment) => (
        <InstallmentRow key={installment.id} installment={installment} totalInstallments={installments.length} />
      ))}
    </div>
  );
}
