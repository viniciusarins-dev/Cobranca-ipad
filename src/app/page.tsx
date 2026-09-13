import { ClientsTable } from "@/components/clients-table";
import { DashboardOverview } from "@/components/dashboard-overview";
import { ExpenseDialog } from "@/components/expense-dialog";
import { NewTransactionDialog } from "@/components/new-transaction-dialog";
import { ShinyText } from "@/components/ui/shiny-text";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { createClient } from "@/lib/supabase/server";
import type { ContractWithClient } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data, error }, metrics] = await Promise.all([
    supabase.from("contracts").select("*, client:clients(*)").order("created_at", { ascending: false }),
    getDashboardMetrics(supabase),
  ]);

  const contracts = (data ?? []) as ContractWithClient[];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <ShinyText className="text-xs font-semibold uppercase tracking-widest">Cobrança iPad</ShinyText>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Empréstimos e vendas de iPhone parceladas — visão geral e status de cobrança.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExpenseDialog />
          <NewTransactionDialog />
        </div>
      </div>

      <DashboardOverview metrics={metrics} />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clientes</h2>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Não foi possível carregar os dados. Verifique se o Supabase está configurado (veja o README) e se a
          migração <code>supabase/migrations/0001_init.sql</code> foi aplicada.
          <br />
          <span className="text-xs opacity-80">{error.message}</span>
        </div>
      ) : (
        <ClientsTable contracts={contracts} />
      )}
    </main>
  );
}
