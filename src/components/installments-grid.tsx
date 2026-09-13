"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircleIcon, Loader2Icon, WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { InstallmentStatusBadge } from "@/components/status-badge";
import { calculateLateInterest, roundCents } from "@/lib/financial-rules";
import { PAYMENT_METHOD_LABELS, type Installment } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { paymentSchema, type PaymentInput } from "@/lib/validations";
import { sendReminderAction, registerPayment } from "@/app/actions";

function RegisterPaymentDialog({ installment }: { installment: Installment }) {
  const [open, setOpen] = useState(false);

  const outstandingPrincipal = roundCents(Math.max(installment.amount - installment.paid_principal_amount, 0));
  const interestOwed = useMemo(
    () =>
      calculateLateInterest({
        amount: installment.amount,
        paidPrincipalAmount: installment.paid_principal_amount,
        dueDate: installment.due_date,
        status: installment.status,
      }),
    [installment.amount, installment.paid_principal_amount, installment.due_date, installment.status],
  );
  const totalDue = roundCents(outstandingPrincipal + interestOwed);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      installmentId: installment.id,
      amount: totalDue,
      method: "dinheiro",
      notes: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await registerPayment(data);
    if (result.ok) {
      toast.success("Pagamento registrado.");
      reset();
      setOpen(false);
    } else {
      toast.error(result.error ?? "Erro ao registrar pagamento.");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset({ installmentId: installment.id, amount: totalDue, method: "dinheiro", notes: "" });
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <WalletIcon />
          Registrar pagamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pagamento — Parcela {installment.number}</DialogTitle>
          <DialogDescription>
            Valor da parcela: {formatCurrency(installment.amount)}
            {installment.paid_principal_amount > 0 && ` · Já pago: ${formatCurrency(installment.paid_principal_amount)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1 rounded-md bg-muted px-3 py-2 text-sm">
          <p className="text-muted-foreground">Principal em aberto: {formatCurrency(outstandingPrincipal)}</p>
          {interestOwed > 0 && (
            <p className="text-destructive">Juros de atraso (1%/dia): {formatCurrency(interestOwed)}</p>
          )}
          <p className="font-medium">Total devido hoje: {formatCurrency(totalDue)}</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" {...register("installmentId")} />
          <div className="grid gap-1.5">
            <Label htmlFor="amount">Valor pago (R$)</Label>
            <Input id="amount" type="number" step="0.01" min="0" {...register("amount", { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="method">Forma de pagamento</Label>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Input id="notes" placeholder="Ex: pagou metade hoje" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InstallmentRow({
  installment,
  totalInstallments,
}: {
  installment: Installment;
  totalInstallments: number;
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
        {installment.status !== "pago" && <RegisterPaymentDialog installment={installment} />}

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

export function InstallmentsGrid({ installments }: { installments: Installment[] }) {
  return (
    <div className="flex flex-col gap-3">
      {installments.map((installment) => (
        <InstallmentRow key={installment.id} installment={installment} totalInstallments={installments.length} />
      ))}
    </div>
  );
}
