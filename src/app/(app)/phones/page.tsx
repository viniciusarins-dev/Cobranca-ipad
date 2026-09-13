import { PhonesTable } from "@/components/phones-table";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { ShinyText } from "@/components/ui/shiny-text";
import { createClient } from "@/lib/supabase/server";
import type { Phone } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PhonesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phones")
    .select("*")
    .order("created_at", { ascending: false });

  const phones = (data ?? []) as Phone[];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <ShinyText className="text-xs font-semibold uppercase tracking-widest">Cobrança iPad</ShinyText>
        <GradientHeading className="text-3xl sm:text-4xl">Celulares</GradientHeading>
        <p className="mt-1 text-sm text-muted-foreground">
          Estoque de aparelhos, custo de aquisição e lucro na venda — controlado separadamente dos empréstimos.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Não foi possível carregar o estoque de celulares.
          <br />
          <span className="text-xs opacity-80">{error.message}</span>
        </div>
      ) : (
        <PhonesTable phones={phones} />
      )}
    </main>
  );
}
