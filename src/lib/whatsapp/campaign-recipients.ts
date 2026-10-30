import type { SupabaseClient } from "@supabase/supabase-js";

import { getTodayDebtors, groupDebtorsByClient, type Debtor, type DebtorSourceInstallment } from "@/lib/debtors";
import { renderCampaignMessage } from "@/lib/whatsapp/template";
import { toWhatsAppDigits } from "@/lib/utils";
import type { Client, Contract, Installment, WhatsAppCampaignFilterType } from "@/lib/types";

export interface CampaignCandidate {
  clientId: string;
  clientName: string;
  contractId: string;
  installmentId: string;
  /** Telefone já normalizado (DDI+DDD+número, só dígitos) — o que de fato vai para o provedor. */
  toPhone: string;
  message: string;
  outstandingPrincipal: number;
  interestOwed: number;
  /** Saldo só desta parcela escolhida (a mais urgente do cliente). */
  installmentTotalDue: number;
  /** Saldo somado de TODAS as parcelas em aberto do cliente — mesmo valor usado em {saldo_total_em_aberto}. */
  clientTotalDue: number;
  daysLate: number;
}

export interface CampaignExclusion {
  clientId: string;
  clientName: string;
  reason: "sem_telefone_valido" | "contato_bloqueado";
}

export interface CampaignCandidatesResult {
  candidates: CampaignCandidate[];
  excluded: CampaignExclusion[];
}

type ContractRow = Pick<
  Contract,
  "id" | "type" | "status" | "description" | "installments_count" | "principal_amount" | "periodicity"
> & {
  client: Client;
  installments: Installment[];
};

/**
 * Busca contratos (não cancelados) com suas parcelas, de baixo pra cima —
 * reaproveitada pelos 3 filtros que não são "devedores do dia" (que já tem
 * sua própria query otimizada em `getTodayDebtors`). `clientIds` filtra
 * para "seleção manual"; omitido, traz todos os clientes do usuário (RLS
 * já restringe à própria conta).
 */
async function fetchOpenContracts(supabase: SupabaseClient, clientIds?: string[]): Promise<ContractRow[]> {
  let query = supabase
    .from("contracts")
    .select(
      "id, type, status, description, installments_count, principal_amount, periodicity, client:clients(*), installments(*)",
    )
    .neq("status", "cancelado");

  if (clientIds) {
    if (clientIds.length === 0) return [];
    query = query.in("client_id", clientIds);
  }

  const { data } = await query;
  return (data ?? []) as unknown as ContractRow[];
}

function flattenToInstallmentRows(contracts: ContractRow[], statuses: Installment["status"][]): DebtorSourceInstallment[] {
  const rows: DebtorSourceInstallment[] = [];
  for (const contract of contracts) {
    const { installments, ...contractFields } = contract;
    for (const installment of installments) {
      if (!statuses.includes(installment.status)) continue;
      rows.push({ ...installment, contract: contractFields });
    }
  }
  return rows;
}

/**
 * `restrictToClientIds`, quando informado, SEMPRE restringe o resultado a
 * essa lista — não só quando `filterType` é "selecao_manual". É o que
 * permite a tela de confirmação (`new-campaign-dialog.tsx`) desmarcar
 * clientes específicos de QUALQUER filtro antes de criar a campanha de
 * verdade: a campanha final é sempre restrita exatamente ao que foi
 * confirmado na prévia, nunca recalculada "do zero" a partir só do filtro.
 */
async function resolveDebtors(
  supabase: SupabaseClient,
  filterType: WhatsAppCampaignFilterType,
  restrictToClientIds: string[] | undefined,
): Promise<Debtor[]> {
  if (filterType === "devedores_do_dia") {
    const { debtors } = await getTodayDebtors(supabase);
    if (!restrictToClientIds) return debtors;
    const allowed = new Set(restrictToClientIds);
    return debtors.filter((debtor) => allowed.has(debtor.client.id));
  }

  const statuses: Installment["status"][] =
    filterType === "parcelas_vencidas" ? ["atrasado"] : ["pendente", "atrasado", "parcial"];
  const clientIds = filterType === "selecao_manual" ? (restrictToClientIds ?? []) : restrictToClientIds;

  const contracts = await fetchOpenContracts(supabase, clientIds);
  const rows = flattenToInstallmentRows(contracts, statuses);
  return groupDebtorsByClient(rows, new Date());
}

/**
 * Monta a lista de destinatários elegíveis para uma campanha: aplica o
 * filtro escolhido, exclui quem está bloqueado (`whatsapp_consents`) e
 * quem não tem telefone válido — nunca inclui esses dois casos na lista
 * de envio, só no relatório de exclusão (seção 5.3/8 do pedido). Escolhe,
 * de cada cliente, a parcela mais urgente (já ordenada por
 * `groupDebtorsByClient`) como contexto da mensagem.
 */
export async function getCampaignCandidates(
  supabase: SupabaseClient,
  filterType: WhatsAppCampaignFilterType,
  messageTemplate: string,
  manualClientIds?: string[],
): Promise<CampaignCandidatesResult> {
  const debtors = await resolveDebtors(supabase, filterType, manualClientIds);

  const { data: blockedRows } = await supabase
    .from("whatsapp_consents")
    .select("client_id")
    .eq("category", "cobranca")
    .eq("is_blocked", true);
  const blockedClientIds = new Set((blockedRows ?? []).map((row) => row.client_id as string));

  const candidates: CampaignCandidate[] = [];
  const excluded: CampaignExclusion[] = [];

  for (const debtor of debtors) {
    const primaryRow = debtor.rows[0];
    if (!primaryRow) continue;

    if (blockedClientIds.has(debtor.client.id)) {
      excluded.push({ clientId: debtor.client.id, clientName: debtor.client.name, reason: "contato_bloqueado" });
      continue;
    }

    const toPhone = toWhatsAppDigits(debtor.client.phone);
    if (!toPhone) {
      excluded.push({ clientId: debtor.client.id, clientName: debtor.client.name, reason: "sem_telefone_valido" });
      continue;
    }

    const message = renderCampaignMessage(
      messageTemplate,
      debtor.client,
      primaryRow.contract,
      primaryRow.installment,
      primaryRow.contract.installments_count,
      debtor,
    );

    candidates.push({
      clientId: debtor.client.id,
      clientName: debtor.client.name,
      contractId: primaryRow.contract.id,
      installmentId: primaryRow.installment.id,
      toPhone,
      message,
      outstandingPrincipal: primaryRow.outstandingPrincipal,
      interestOwed: primaryRow.interestOwed,
      installmentTotalDue: primaryRow.totalDue,
      clientTotalDue: debtor.totalDue,
      daysLate: primaryRow.daysLate,
    });
  }

  return { candidates, excluded };
}
