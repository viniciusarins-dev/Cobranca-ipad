"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TagIcon } from "lucide-react";
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
import { PAYMENT_METHOD_LABELS, type Phone } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { sellPhoneDirectSchema, type SellPhoneDirectInput } from "@/lib/validations";
import { sellPhoneDirect } from "@/app/actions";

export function SellPhoneDialog({ phone }: { phone: Phone }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaultValues: SellPhoneDirectInput = {
    phoneId: phone.id,
    saleAmount: phone.cost_amount,
    saleMethod: "dinheiro",
    buyerName: "",
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SellPhoneDirectInput>({
    resolver: zodResolver(sellPhoneDirectSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await sellPhoneDirect(data);
    if (result.ok) {
      toast.success("Venda registrada.");
      reset(defaultValues);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao registrar venda.");
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaultValues);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <TagIcon />
          Vender diretamente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vender {phone.model}</DialogTitle>
          <DialogDescription>
            Venda à vista, fora do sistema de parcelas. Custo de aquisição: {formatCurrency(phone.cost_amount)}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <input type="hidden" {...register("phoneId")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="saleAmount">Valor de venda (R$)</Label>
              <Input
                id="saleAmount"
                type="number"
                step="0.01"
                min="0"
                {...register("saleAmount", { valueAsNumber: true })}
              />
              {errors.saleAmount && <p className="text-xs text-destructive">{errors.saleAmount.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="saleMethod">Forma de pagamento</Label>
              <Controller
                control={control}
                name="saleMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="saleMethod">
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
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="buyerName">Nome do comprador (opcional)</Label>
            <Input id="buyerName" placeholder="Ex: João Silva" {...register("buyerName")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Confirmar venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
