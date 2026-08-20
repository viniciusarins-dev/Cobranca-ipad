import { AlertTriangleIcon, TrendingUpIcon, UsersIcon, WalletIcon } from "lucide-react";

import { ClientsTable } from "@/components/clients-table";
import { NewTransactionDialog } from "@/components/new-transaction-dialog";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { ShinyText } from "@/components/ui/shiny-text";
import { StatTile } from "@/components/ui/stat-tile";
import { createClient } from "@/lib/supabase/server";
import type { ContractWithInstallments } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*, client:clients(*), installments(*)")
    .order("created_at", { ascending: false });

  const contracts = (data ?? []) as ContractWithInstallments[];

  const allInstallments = contracts.flatMap((contract) => contract.installments ?? []);
  const outstandingAmount = allInstallments
    .filter((installment) => installment.status !== "pago")
    .reduce((sum, installment) => sum + installment.amount, 0);

  const activeClients = new Set(
    contracts.filter((c) => c.status === "ativo" || c.status === "inadimplente").map((c) => c.client_id),
  ).size;

  const overdueCount = contracts.filter((c) => c.status === "inadimplente").length;

  const now = new Date();
  const receivedThisMonth = allInstallments
    .filter((installment) => installment.status === "pago" && installment.paid_at)
    .filter((installment) => {
      const paidAt = new Date(installment.paid_at!);
      return paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear();
    })
    .reduce((sum, installment) => sum + installment.amount, 0);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <ShinyText className="text-xs font-semibold uppercase tracking-widest">Cobrança iPad</ShinyText>
          <GradientHeading className="text-3xl sm:text-4xl">Clientes</GradientHeading>
          <p className="mt-1 text-sm text-muted-foreground">
            Empréstimos e vendas de iPhone parceladas — visão geral e status de cobrança.
          </p>
        </div>
        <NewTransactionDialog />
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Não foi possível carregar os dados. Verifique se o Supabase está configurado (veja o README) e se a
          migração <code>supabase/migrations/0001_init.sql</code> foi aplicada.
          <br />
          <span className="text-xs opacity-80">{error.message}</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatTile label="Em aberto" value={outstandingAmount} format="currency" icon={WalletIcon} accent="primary" />
            <StatTile label="Clientes ativos" value={activeClients} icon={UsersIcon} accent="cyan" />
            <StatTile label="Inadimplentes" value={overdueCount} icon={AlertTriangleIcon} accent="destructive" />
            <StatTile
              label="Recebido no mês"
              value={receivedThisMonth}
              format="currency"
              icon={TrendingUpIcon}
              accent="success"
            />
          </div>

          <ClientsTable contracts={contracts} />
        </>
      )}
    </main>
  );
}
