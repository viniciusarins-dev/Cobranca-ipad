import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MessageCircleIcon } from "lucide-react";

import { InstallmentsGrid } from "@/components/installments-grid";
import { ContractStatusBadge } from "@/components/status-badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { createClient } from "@/lib/supabase/server";
import {
  CONTRACT_TYPE_LABELS,
  PERIODICITY_LABELS,
  type ContractWithInstallments,
} from "@/lib/types";
import { formatCurrency, formatDate, formatPhone, onlyDigits } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contracts")
    .select("*, client:clients(*), installments(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const contract = data as ContractWithInstallments;
  const installments = [...contract.installments].sort((a, b) => a.number - b.number);
  const paidCount = installments.filter((i) => i.status === "pago").length;
  const whatsappLink = `https://wa.me/${onlyDigits(contract.client.phone)}`;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Voltar para clientes
      </Link>

      <SpotlightCard>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl">{contract.client.name}</CardTitle>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <MessageCircleIcon className="size-4" />
              {formatPhone(contract.client.phone)}
            </a>
          </div>
          <ContractStatusBadge status={contract.status} />
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="font-medium">{CONTRACT_TYPE_LABELS[contract.type]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Valor total</dt>
              <dd className="font-medium">{formatCurrency(contract.total_amount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Parcelas</dt>
              <dd className="font-medium">
                {paidCount}/{contract.installments_count} pagas
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Periodicidade</dt>
              <dd className="font-medium">{PERIODICITY_LABELS[contract.periodicity]}</dd>
            </div>
            {contract.description && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-muted-foreground">Descrição</dt>
                <dd className="font-medium">{contract.description}</dd>
              </div>
            )}
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-muted-foreground">1º vencimento</dt>
              <dd className="font-medium">{formatDate(contract.first_due_date)}</dd>
            </div>
            {contract.client.document && (
              <div>
                <dt className="text-muted-foreground">CPF/CNPJ</dt>
                <dd className="font-medium">{contract.client.document}</dd>
              </div>
            )}
            {contract.client.cep && (
              <div>
                <dt className="text-muted-foreground">CEP</dt>
                <dd className="font-medium">{contract.client.cep}</dd>
              </div>
            )}
            {contract.client.address && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-muted-foreground">Endereço</dt>
                <dd className="font-medium">{contract.client.address}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </SpotlightCard>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Parcelas</h2>
        <InstallmentsGrid installments={installments} />
      </div>
    </main>
  );
}
