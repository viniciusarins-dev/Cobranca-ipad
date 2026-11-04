"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CoinsIcon,
  DownloadIcon,
  FilterIcon,
  HandCoinsIcon,
  PrinterIcon,
  ReceiptIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { getFinancialReport, type FinancialReportRow, type FinancialReportSummary } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { StatTile } from "@/components/ui/stat-tile";
import { buildCsv, downloadCsv } from "@/lib/csv-export";
import {
  FINANCIAL_REPORT_PRESET_LABELS,
  resolvePresetRange,
  type DateRange,
  type FinancialReportPreset,
} from "@/lib/financial-report-presets";
import { PAYMENT_METHOD_LABELS } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const DEFAULT_PRESET: Exclude<FinancialReportPreset, "personalizado"> = "este_mes";

export function FinancialReportPanel({
  initialRange,
  initialSummary,
  initialRows,
  initialGeneratedByEmail,
}: {
  initialRange: DateRange;
  initialSummary: FinancialReportSummary;
  initialRows: FinancialReportRow[];
  initialGeneratedByEmail: string | null;
}) {
  const [preset, setPreset] = useState<FinancialReportPreset>(DEFAULT_PRESET);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [summary, setSummary] = useState(initialSummary);
  const [rows, setRows] = useState(initialRows);
  const [generatedByEmail, setGeneratedByEmail] = useState(initialGeneratedByEmail);
  const [loading, setLoading] = useState(false);

  async function applyRange(range: DateRange) {
    setLoading(true);
    const result = await getFinancialReport(range);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSummary(result.summary);
    setRows(result.rows);
    setGeneratedByEmail(result.generatedByEmail);
    setAppliedRange(range);
  }

  function handlePresetChange(value: string) {
    const nextPreset = value as FinancialReportPreset;
    setPreset(nextPreset);
    if (nextPreset === "personalizado") return;
    const range = resolvePresetRange(nextPreset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function handleFilter() {
    if (startDate > endDate) {
      toast.error("A data inicial não pode ser depois da data final.");
      return;
    }
    void applyRange({ startDate, endDate });
  }

  function handleClear() {
    const range = resolvePresetRange(DEFAULT_PRESET);
    setPreset(DEFAULT_PRESET);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    void applyRange(range);
  }

  function handleExportCsv() {
    const header = ["Data do recebimento", "Cliente", "Valor recebido", "Juros recebidos", "Referência", "Forma de pagamento"];
    const body = rows.map((row) => [
      formatDateTime(row.paidAt),
      row.clientName,
      formatCurrency(row.totalAmount),
      formatCurrency(row.interestAmount),
      row.reference,
      PAYMENT_METHOD_LABELS[row.method],
    ]);
    const csv = buildCsv(header, body);
    downloadCsv(`recebimentos_${appliedRange.startDate}_a_${appliedRange.endDate}.csv`, csv);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FilterIcon className="size-4" />
            Filtro financeiro
          </CardTitle>
          <CardDescription>
            Consulte quanto foi recebido em qualquer período — mês, intervalo pronto ou datas personalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid gap-1.5 sm:w-56">
              <Label htmlFor="financial-preset">Período</Label>
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger id="financial-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FINANCIAL_REPORT_PRESET_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {preset === "personalizado" && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="financial-start">Data inicial</Label>
                  <Input id="financial-start" type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="financial-end">Data final</Label>
                  <Input id="financial-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleFilter} disabled={loading}>
                {loading ? "Filtrando..." : "Filtrar"}
              </Button>
              <Button type="button" variant="outline" onClick={handleClear} disabled={loading}>
                <XIcon />
                Limpar filtros
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Mostrando: <span className="font-medium text-foreground">{formatDate(appliedRange.startDate)}</span> até{" "}
            <span className="font-medium text-foreground">{formatDate(appliedRange.endDate)}</span>
          </p>
        </CardContent>
      </Card>

      <div className="print:hidden">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Indicadores do período
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile
            label="Total recebido"
            value={summary.totalReceived}
            format="currency"
            icon={WalletIcon}
            accent="success"
            className="col-span-2 sm:col-span-1"
          />
          <StatTile label="Pagamentos" value={summary.paymentsCount} icon={ReceiptIcon} accent="primary" />
          <StatTile label="Juros recebidos" value={summary.totalInterestReceived} format="currency" icon={CoinsIcon} accent="cyan" />
          <StatTile label="Total emprestado" value={summary.totalDisbursed} format="currency" icon={HandCoinsIcon} accent="warning" />
          <StatTile label="Clientes que pagaram" value={summary.distinctClientsCount} icon={UsersIcon} accent="cyan" />
          <StatTile
            label="Saldo em aberto (atual)"
            value={summary.outstandingBalance}
            format="currency"
            icon={AlertTriangleIcon}
            accent="destructive"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          &quot;Saldo em aberto&quot; é o total que falta receber AGORA, de todos os contratos — não é limitado ao
          período filtrado acima.
        </p>
      </div>

      <div className="print:hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico de recebimentos</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} disabled={rows.length === 0}>
              <DownloadIcon />
              Exportar CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()} disabled={rows.length === 0}>
              <PrinterIcon />
              Exportar PDF
            </Button>
          </div>
        </div>

        <SpotlightCard>
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum recebimento nesse período.</p>
          ) : (
            <div className="flex flex-col gap-2 p-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{row.clientName}</span>
                    <span className="text-muted-foreground"> · {row.reference}</span>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[row.method]}
                      {row.interestAmount > 0 && <> · juros {formatCurrency(row.interestAmount)}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold">{formatCurrency(row.totalAmount)}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(row.paidAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>
      </div>

      {/* Visão de impressão (PDF) — só aparece no print, formatada como relatório simples (sem botões/filtros). */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Relatório financeiro — Cobrança/Recebe</h1>
        <p className="text-sm">Responsável: {generatedByEmail ?? "—"}</p>
        <p className="text-sm">
          Período: {formatDate(appliedRange.startDate)} até {formatDate(appliedRange.endDate)}
        </p>
        <table className="mt-4 w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border px-2 py-1 font-medium">Total recebido</td>
              <td className="border px-2 py-1">{formatCurrency(summary.totalReceived)}</td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-medium">Quantidade de pagamentos</td>
              <td className="border px-2 py-1">{summary.paymentsCount}</td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-medium">Total de juros recebidos</td>
              <td className="border px-2 py-1">{formatCurrency(summary.totalInterestReceived)}</td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-medium">Total emprestado no período</td>
              <td className="border px-2 py-1">{formatCurrency(summary.totalDisbursed)}</td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-medium">Clientes que pagaram</td>
              <td className="border px-2 py-1">{summary.distinctClientsCount}</td>
            </tr>
            <tr>
              <td className="border px-2 py-1 font-medium">Saldo em aberto (atual, não limitado ao período)</td>
              <td className="border px-2 py-1">{formatCurrency(summary.outstandingBalance)}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="mt-6 text-base font-semibold">Listagem detalhada</h2>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">Data</th>
              <th className="border px-2 py-1 text-left">Cliente</th>
              <th className="border px-2 py-1 text-left">Valor</th>
              <th className="border px-2 py-1 text-left">Juros</th>
              <th className="border px-2 py-1 text-left">Referência</th>
              <th className="border px-2 py-1 text-left">Forma</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border px-2 py-1">{formatDateTime(row.paidAt)}</td>
                <td className="border px-2 py-1">{row.clientName}</td>
                <td className="border px-2 py-1">{formatCurrency(row.totalAmount)}</td>
                <td className="border px-2 py-1">{formatCurrency(row.interestAmount)}</td>
                <td className="border px-2 py-1">{row.reference}</td>
                <td className="border px-2 py-1">{PAYMENT_METHOD_LABELS[row.method]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
