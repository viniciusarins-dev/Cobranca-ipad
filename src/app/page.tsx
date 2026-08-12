import { ClientsTable } from "@/components/clients-table";
import { NewTransactionDialog } from "@/components/new-transaction-dialog";
import { createClient } from "@/lib/supabase/server";
import type { ContractWithClient } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*, client:clients(*)")
    .order("created_at", { ascending: false });

  const contracts = (data ?? []) as ContractWithClient[];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
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
        <ClientsTable contracts={contracts} />
      )}
    </main>
  );
}
