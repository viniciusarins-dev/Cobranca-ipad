import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MessageCircleIcon } from "lucide-react";

import { InstallmentsGrid } from "@/components/installments-grid";
import { PaymentHistory } from "@/components/payment-history";
import { ContractStatusBadge } from "@/components/status-badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { createClient } from "@/lib/supabase/server";
import { calculateFinancedAmount } from "@/lib/financial-rules";
import {
  CONTRACT_TYPE_LABELS,
  PERIODICITY_LABELS,
  type ContractWithInstallments,
  type Payment,
  type Phone,
} from "@/lib/types";
import { formatCurrency, formatDate, formatPhone, initials, onlyDigits } from "@/lib/utils";

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

  const { markupAmount } = calculateFinancedAmount({
    principalAmount: contract.principal_amount,
    hasDownPayment: contract.has_down_payment,
    downPaymentAmount: contract.down_payment_amount,
  });

  const { data: paymentsData } = await supabase
    .from("payments")
    .select("*")
    .eq("contract_id", id)
    .order("paid_at", { ascending: false });
  const payments = (paymentsData ?? []) as Payment[];
  const installmentNumberById = Object.fromEntries(installments.map((i) => [i.id, i.number]));

  const { data: linkedPhoneData } = await supabase
    .from("phones")
    .select("*")
    .eq("contract_id", id)
    .maybeSingle();
  const linkedPhone = linkedPhoneData as Phone | null;
  const phoneProfit =
    linkedPhone && linkedPhone.sale_amount !== null ? linkedPhone.sale_amount - linkedPhone.cost_amount : null;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Voltar para clientes
      </Link>

      <SpotlightCard>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent-cyan text-sm font-bold text-primary-foreground">
              {initials(contract.client.name)}
            </span>
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
              <dt className="text-muted-foreground">Valor do produto</dt>
              <dd className="font-medium">{formatCurrency(contract.principal_amount)}</dd>
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
            {contract.has_down_payment && (
              <div>
                <dt className="text-muted-foreground">Entrada</dt>
                <dd className="font-medium">{formatCurrency(contract.down_payment_amount)}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Juros (30%)</dt>
              <dd className="font-medium">{formatCurrency(markupAmount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total financiado</dt>
              <dd className="font-semibold text-accent-cyan">{formatCurrency(contract.total_amount)}</dd>
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
          </dl>
        </CardContent>
      </SpotlightCard>

      {linkedPhone && (
        <SpotlightCard>
          <CardHeader>
            <CardTitle className="text-base">Celular vinculado (estoque)</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Modelo</dt>
                <dd className="font-medium">{linkedPhone.model}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Custo de aquisição</dt>
                <dd className="font-medium">{formatCurrency(linkedPhone.cost_amount)}</dd>
              </div>
              {phoneProfit !== null && (
                <div>
                  <dt className="text-muted-foreground">Lucro na venda do aparelho</dt>
                  <dd className={phoneProfit >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
                    {formatCurrency(phoneProfit)}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </SpotlightCard>
      )}

      <div>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground">Parcelas</h2>
        <InstallmentsGrid installments={installments} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Histórico de pagamentos</h2>
        <PaymentHistory
          payments={payments}
          installmentNumberById={installmentNumberById}
          totalInstallments={contract.installments_count}
        />
      </div>
    </main>
  );
}
