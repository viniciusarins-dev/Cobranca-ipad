import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContractStatus, WeeklyChargeStatus } from "@/lib/types";

/**
 * Compartilhada entre a Server Action `recalculateContractStatus` (chamada
 * depois de registrar/renovar um pagamento) e o cron diário
 * `/api/cron/check-overdue` (que marca parcelas vencidas como atrasadas) —
 * achado real: o cron tinha sua PRÓPRIA cópia desta lógica, sem a checagem
 * de "cancelado é terminal" abaixo, e por isso reativava contratos já
 * cancelados todo dia (ex.: um contrato cancelado com uma parcela ainda
 * "pendente" vencia no dia seguinte, o cron marcava essa parcela como
 * "atrasado" e recalculava o contrato de volta para "inadimplente" — o
 * cancelamento nunca "pegava" de verdade). Daqui pra frente, qualquer novo
 * lugar que precise recalcular o status de um contrato deve reaproveitar
 * esta função, nunca duplicar a lógica de novo.
 */
export async function syncWeeklyChargeStatus(
  supabase: SupabaseClient,
  contractId: string,
  contractStatus: ContractStatus,
): Promise<void> {
  let weeklyStatus: WeeklyChargeStatus = "PENDENTE";
  if (contractStatus === "quitado") weeklyStatus = "PAGO";
  else if (contractStatus === "cancelado") weeklyStatus = "CANCELADO";

  await supabase.from("weekly_charges").update({ status: weeklyStatus }).eq("contract_id", contractId);
}

export async function recalculateContractStatus(supabase: SupabaseClient, contractId: string): Promise<void> {
  // "Cancelado" é um estado terminal e manual (deleteContract) — nunca
  // recalculado a partir das parcelas. Sem esta checagem, qualquer coisa
  // que mude o status de uma parcela (um pagamento registrado por engano,
  // ou o cron diário marcando uma parcela como atrasada) faz o contrato
  // "reaparecer" como ativo/inadimplente/quitado, voltando a contar em
  // qualquer lista/indicador de onde tinha sido intencionalmente removido.
  const { data: currentContract } = await supabase.from("contracts").select("status").eq("id", contractId).single();
  if (currentContract?.status === "cancelado") return;

  const { data: installments } = await supabase.from("installments").select("status").eq("contract_id", contractId);

  if (!installments || installments.length === 0) return;

  let status: ContractStatus = "ativo";
  if (installments.every((installment) => installment.status === "pago")) {
    status = "quitado";
  } else if (installments.some((installment) => installment.status === "atrasado")) {
    status = "inadimplente";
  }

  // As duas atualizações são independentes entre si (nenhuma lê o
  // resultado da outra) — rodam em paralelo em vez de uma esperar a outra.
  await Promise.all([
    supabase.from("contracts").update({ status }).eq("id", contractId),
    syncWeeklyChargeStatus(supabase, contractId, status),
  ]);
}
