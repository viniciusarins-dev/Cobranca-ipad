"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon, PlusIcon } from "lucide-react";
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
import type { Phone } from "@/lib/types";
import { phoneSchema, type PhoneInput } from "@/lib/validations";
import { createPhone, updatePhone } from "@/app/actions";

const today = () => new Date().toISOString().slice(0, 10);

export function PhoneFormDialog({ phone }: { phone?: Phone }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditing = Boolean(phone);

  const defaultValues: PhoneInput = phone
    ? {
        model: phone.model,
        description: phone.description ?? "",
        costAmount: phone.cost_amount,
        acquiredAt: phone.acquired_at,
        notes: phone.notes ?? "",
      }
    : {
        model: "",
        description: "",
        costAmount: 0,
        acquiredAt: today(),
        notes: "",
      };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PhoneInput>({
    resolver: zodResolver(phoneSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = isEditing && phone ? await updatePhone(phone.id, data) : await createPhone(data);
    if (result.ok) {
      toast.success(isEditing ? "Celular atualizado." : "Celular adicionado ao estoque.");
      reset(defaultValues);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao salvar celular.");
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
        {isEditing ? (
          <Button type="button" variant="outline" size="sm">
            <PencilIcon />
            Editar
          </Button>
        ) : (
          <Button type="button" variant="glow" size="lg">
            <PlusIcon />
            Novo celular
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar celular" : "Novo celular no estoque"}</DialogTitle>
          <DialogDescription>
            Registre o custo de aquisição para calcular o lucro real na hora da venda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" placeholder="Ex: iPhone 13 Pro 256GB Grafite" {...register("model")} />
            {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input id="description" placeholder="Ex: Seminovo, bateria 89%" {...register("description")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="costAmount">Custo de aquisição (R$)</Label>
              <Input
                id="costAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register("costAmount", { valueAsNumber: true })}
              />
              {errors.costAmount && <p className="text-xs text-destructive">{errors.costAmount.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acquiredAt">Data de aquisição</Label>
              <Input id="acquiredAt" type="date" {...register("acquiredAt")} />
              {errors.acquiredAt && <p className="text-xs text-destructive">{errors.acquiredAt.message}</p>}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Input id="notes" {...register("notes")} />
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
      </DialogContent>
    </Dialog>
  );
}
