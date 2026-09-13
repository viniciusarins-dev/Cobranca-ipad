"use client";

import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAYMENT_METHOD_LABELS, type Payment, type PaymentMethod } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface PaymentHistoryProps {
  payments: Payment[];
  /** number da parcela por installment_id, para exibir "Parcela 3/10" no histórico. */
  installmentNumberById: Record<string, number>;
  totalInstallments: number;
}

type MethodFilter = "todos" | PaymentMethod;

export function PaymentHistory({ payments, installmentNumberById, totalInstallments }: PaymentHistoryProps) {
  const [filter, setFilter] = useState<MethodFilter>("todos");

  const filtered = useMemo(
    () => (filter === "todos" ? payments : payments.filter((p) => p.method === filter)),
    [payments, filter],
  );

  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as MethodFilter)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
            <TabsTrigger key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum pagamento com essa forma de pagamento.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((payment) => {
            const total = payment.principal_amount + payment.interest_amount;
            const label = payment.installment_id
              ? `Parcela ${installmentNumberById[payment.installment_id] ?? "?"}/${totalInstallments}`
              : "Entrada";

            return (
              <div
                key={payment.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground"> · {PAYMENT_METHOD_LABELS[payment.method]}</span>
                  {payment.interest_amount > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      · principal {formatCurrency(payment.principal_amount)} + juros{" "}
                      {formatCurrency(payment.interest_amount)}
                    </span>
                  )}
                  {payment.notes && <p className="text-xs text-muted-foreground">{payment.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(total)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(payment.paid_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
