"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/dashboard-metrics";
import { PAYMENT_METHOD_LABELS } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function DashboardOverview({ metrics }: { metrics: DashboardMetrics }) {
  const flowChartData = [
    { periodo: "Hoje", Entradas: metrics.income.today, Saídas: metrics.expenses.today },
    { periodo: "Semana", Entradas: metrics.income.week, Saídas: metrics.expenses.week },
    { periodo: "Mês", Entradas: metrics.income.month, Saídas: metrics.expenses.month },
    { periodo: "Total", Entradas: metrics.income.total, Saídas: metrics.expenses.total },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Empréstimos e vendas — Total
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total emprestado" period="Total" value={metrics.loans.totalPrincipal} />
          <StatCard label="Previsto para receber" period="Total" value={metrics.loans.totalExpected} />
          <StatCard
            label="Recebido (parcelas)"
            period="Total"
            value={metrics.loans.totalReceivedPrincipal}
            tone="success"
          />
          <StatCard label="Ainda a receber" period="Total" value={metrics.loans.totalOutstanding} tone="warning" />
          <StatCard label="Em atraso" period="Total" value={metrics.loans.totalOverdue} tone="destructive" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Juros de atraso recebidos
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Juros" period="Diário" value={metrics.lateInterestReceived.today} tone="success" />
          <StatCard label="Juros" period="Semanal" value={metrics.lateInterestReceived.week} tone="success" />
          <StatCard label="Juros" period="Mensal" value={metrics.lateInterestReceived.month} tone="success" />
          <StatCard label="Juros" period="Total" value={metrics.lateInterestReceived.total} tone="success" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ganhos (30% + juros de atraso já realizados)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Ganhos" period="Diário" value={metrics.earnings.today} tone="success" />
          <StatCard label="Ganhos" period="Semanal" value={metrics.earnings.week} tone="success" />
          <StatCard label="Ganhos" period="Mensal" value={metrics.earnings.month} tone="success" />
          <StatCard label="Ganhos" period="Total" value={metrics.earnings.total} tone="success" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrency(Number(value))} width={90} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="Entradas" fill="var(--success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Saldo líquido (total): <span className="font-medium text-foreground">{formatCurrency(metrics.netBalance)}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">💵 Dinheiro em caixa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Entradas" period="Diário" value={metrics.cash.income.today} />
              <StatCard label="Entradas" period="Semanal" value={metrics.cash.income.week} />
              <StatCard label="Entradas" period="Mensal" value={metrics.cash.income.month} />
              <StatCard label="Entradas" period="Total" value={metrics.cash.income.total} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Saídas em dinheiro" period="Total" value={metrics.cash.expensesTotal} tone="destructive" />
              <StatCard label="Saldo em caixa" period="Atual" value={metrics.cash.balance} tone="success" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recebido por forma de pagamento
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(PAYMENT_METHOD_LABELS) as Array<keyof typeof PAYMENT_METHOD_LABELS>).map((method) => (
            <StatCard
              key={method}
              label={PAYMENT_METHOD_LABELS[method]}
              period="Total"
              value={metrics.receivedByMethod[method]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
