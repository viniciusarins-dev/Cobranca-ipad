import { getBusinessToday } from "@/lib/date-utils";

/**
 * Atalhos de período do filtro financeiro da Visão Geral. Tudo em datas
 * "YYYY-MM-DD" (calendário puro, sem hora) — a conversão para o instante
 * UTC real de início/fim de cada dia (para filtrar `paid_at`, uma coluna
 * timestamptz) acontece só na hora de montar a consulta
 * (`businessDayRangeUTC`, já existente), nunca aqui.
 */
export type FinancialReportPreset =
  | "este_mes"
  | "mes_passado"
  | "ultimos_30_dias"
  | "ultimos_90_dias"
  | "este_ano"
  | "personalizado";

export const FINANCIAL_REPORT_PRESET_LABELS: Record<FinancialReportPreset, string> = {
  este_mes: "Este mês",
  mes_passado: "Mês passado",
  ultimos_30_dias: "Últimos 30 dias",
  ultimos_90_dias: "Últimos 90 dias",
  este_ano: "Este ano",
  personalizado: "Período personalizado",
};

export interface DateRange {
  startDate: string;
  endDate: string;
}

function toDateString(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateString(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/** Dia corrido somado/subtraído de uma data "YYYY-MM-DD" — aritmética em UTC puro, nunca no fuso local do processo. */
function addDaysToDateString(value: string, days: number): string {
  const { year, month, day } = parseDateString(value);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return toDateString(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Último dia de um mês (1-indexado) — "dia 0 do mês seguinte" é um truque padrão do Date em UTC. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Resolve um atalho de período para datas concretas, sempre a partir de
 * "hoje" no fuso do negócio (nunca o fuso do servidor). "personalizado"
 * não tem resolução própria — as datas vêm direto do usuário.
 */
export function resolvePresetRange(
  preset: Exclude<FinancialReportPreset, "personalizado">,
  referenceDate: Date = new Date(),
): DateRange {
  const todayStr = getBusinessToday(referenceDate);
  const { year, month } = parseDateString(todayStr);

  switch (preset) {
    case "este_mes":
      return { startDate: toDateString(year, month, 1), endDate: todayStr };
    case "mes_passado": {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      return {
        startDate: toDateString(prevYear, prevMonth, 1),
        endDate: toDateString(prevYear, prevMonth, lastDayOfMonth(prevYear, prevMonth)),
      };
    }
    // Janela corrida de 30/90 dias INCLUINDO hoje (hoje − 29/89 dias até hoje).
    case "ultimos_30_dias":
      return { startDate: addDaysToDateString(todayStr, -29), endDate: todayStr };
    case "ultimos_90_dias":
      return { startDate: addDaysToDateString(todayStr, -89), endDate: todayStr };
    case "este_ano":
      return { startDate: toDateString(year, 1, 1), endDate: todayStr };
  }
}
