"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { splitAmount } from "@/lib/installments";
import { formatCurrency } from "@/lib/utils";
import { transactionSchema, type TransactionInput } from "@/lib/validations";
import { createTransaction } from "@/app/actions";

const today = () => new Date().toISOString().slice(0, 10);

export function NewTransactionDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "emprestimo",
      periodicity: "mensal",
      installmentsCount: 1,
      firstDueDate: today(),
    },
  });

  const totalAmount = Number(watch("totalAmount")) || 0;
  const installmentsCount = Number(watch("installmentsCount")) || 1;
  const previewAmounts = totalAmount > 0 && installmentsCount > 0 ? splitAmount(totalAmount, installmentsCount) : [];

  const onSubmit = handleSubmit(async (data) => {
    const result = await createTransaction(data);
    if (result.ok) {
      toast.success("Cadastro criado com sucesso.");
      reset();
      setOpen(false);
      router.refresh();
      if (result.contractId) {
        router.push(`/contracts/${result.contractId}`);
      }
    } else {
      toast.error(result.error ?? "Erro ao criar cadastro.");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="glow" size="lg">
          <PlusIcon />
          Novo Cadastro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo empréstimo / venda</DialogTitle>
          <DialogDescription>
            Cadastre o cliente (ou reutilize um existente pelo telefone) e os detalhes do parcelamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="clientName">Nome do cliente</Label>
              <Input id="clientName" placeholder="Ex: João Silva" {...register("clientName")} />
              {errors.clientName && <p className="text-xs text-destructive">{errors.clientName.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="clientPhone">Telefone / WhatsApp</Label>
              <Input id="clientPhone" placeholder="(11) 91234-5678" {...register("clientPhone")} />
              {errors.clientPhone && <p className="text-xs text-destructive">{errors.clientPhone.message}</p>}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="clientEmail">E-mail (opcional)</Label>
            <Input id="clientEmail" type="email" placeholder="cliente@email.com" {...register("clientEmail")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="type">Tipo de operação</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emprestimo">Empréstimo</SelectItem>
                      <SelectItem value="venda_iphone">Venda de iPhone</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input id="description" placeholder="Ex: iPhone 13 Pro 256GB" {...register("description")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="totalAmount">Valor total (R$)</Label>
              <Input id="totalAmount" type="number" step="0.01" min="0" placeholder="0,00" {...register("totalAmount", { valueAsNumber: true })} />
              {errors.totalAmount && <p className="text-xs text-destructive">{errors.totalAmount.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="installmentsCount">Qtd. de parcelas</Label>
              <Input id="installmentsCount" type="number" min="1" max="60" {...register("installmentsCount", { valueAsNumber: true })} />
              {errors.installmentsCount && (
                <p className="text-xs text-destructive">{errors.installmentsCount.message}</p>
              )}
            </div>
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
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="firstDueDate">Data do 1º vencimento</Label>
            <Input id="firstDueDate" type="date" {...register("firstDueDate")} />
            {errors.firstDueDate && <p className="text-xs text-destructive">{errors.firstDueDate.message}</p>}
          </div>

          {previewAmounts.length > 0 && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {previewAmounts.length}x de {formatCurrency(previewAmounts[0])}
              {previewAmounts.length > 1 && previewAmounts.at(-1) !== previewAmounts[0]
                ? ` (última parcela ${formatCurrency(previewAmounts.at(-1)!)})`
                : ""}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="glow" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar cadastro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
