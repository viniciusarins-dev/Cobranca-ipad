"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClockIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Periodicity } from "@/lib/types";
import { PERIODICITY_LABELS } from "@/lib/types";
import { contractPeriodicitySchema, type ContractPeriodicityInput } from "@/lib/validations";
import { updateContractPeriodicity } from "@/app/actions";

/**
 * Corrige a periodicidade cadastrada errada (ex.: marcado mensal, combinado
 * era semanal) — só liberado enquanto nenhum pagamento foi registrado
 * (mudar depois moveria o vencimento de parcelas já pagas).
 */
export function EditPeriodicityDialog({
  contractId,
  currentPeriodicity,
  hasPayments,
}: {
  contractId: string;
  currentPeriodicity: Periodicity;
  hasPayments: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaultValues: ContractPeriodicityInput = { periodicity: currentPeriodicity };

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ContractPeriodicityInput>({
    resolver: zodResolver(contractPeriodicitySchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await updateContractPeriodicity(contractId, data);
    if (result.ok) {
      toast.success("Periodicidade atualizada.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao atualizar periodicidade.");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(defaultValues);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <CalendarClockIcon />
          Periodicidade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Periodicidade das parcelas</DialogTitle>
          <DialogDescription>
            {hasPayments
              ? "Esta operação já tem pagamento registrado — a periodicidade não pode mais ser alterada (mudaria o vencimento de parcelas já pagas)."
              : "Corrige a periodicidade cadastrada por engano. As datas de vencimento das parcelas são recalculadas a partir do 1º vencimento já definido; o valor total e a quantidade de parcelas não mudam."}
          </DialogDescription>
        </DialogHeader>

        {!hasPayments && (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="periodicity">Periodicidade</Label>
              <Controller
                control={control}
                name="periodicity"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="periodicity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">{PERIODICITY_LABELS.semanal}</SelectItem>
                      <SelectItem value="quinzenal">{PERIODICITY_LABELS.quinzenal}</SelectItem>
                      <SelectItem value="mensal">{PERIODICITY_LABELS.mensal}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
