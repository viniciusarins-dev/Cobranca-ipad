import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendCollectionReminder } from "@/lib/whatsapp";
import type { ContractStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sem segredo configurado: MVP/dev only, ajuste antes de produção
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Marca como atrasadas as parcelas pendentes OU parcialmente pagas cujo
  //    vencimento já passou (uma parcela paga em parte continua acumulando
  //    juros e deve aparecer como atrasada até ser quitada — o valor já
  //    pago fica preservado em paid_principal_amount, não é perdido).
  const { data: newlyOverdue, error: overdueError } = await supabase
    .from("installments")
    .update({ status: "atrasado" })
    .in("status", ["pendente", "parcial"])
    .lt("due_date", today)
    .select("id, contract_id");

  if (overdueError) {
    return NextResponse.json({ error: overdueError.message }, { status: 500 });
  }

  // 2. Recalcula o status geral dos contratos afetados
  const contractIds = Array.from(new Set((newlyOverdue ?? []).map((i) => i.contract_id)));
  for (const contractId of contractIds) {
    const { data: installments } = await supabase
      .from("installments")
      .select("status")
      .eq("contract_id", contractId);

    if (!installments?.length) continue;

    let status: ContractStatus = "ativo";
    if (installments.every((i) => i.status === "pago")) {
      status = "quitado";
    } else if (installments.some((i) => i.status === "atrasado")) {
      status = "inadimplente";
    }

    await supabase.from("contracts").update({ status }).eq("id", contractId);
  }

  // 3. Envia lembrete de cobrança para parcelas em atraso que ainda não
  //    receberam lembrete hoje (inclui as recém marcadas + as já atrasadas).
  //    Contratos com periodicidade 'semanal' são excluídos: eles já são
  //    cobrados pela fila dedicada em /api/cron/weekly-dispatch (com
  //    delay randômico, spintax e trava de horário anti-banimento) — enviar
  //    por aqui também duplicaria mensagens no mesmo dia.
  const { data: dueForReminder } = await supabase
    .from("installments")
    .select("id, reminder_sent_at, contract:contracts(periodicity)")
    .eq("status", "atrasado");

  let sent = 0;
  let failed = 0;

  for (const installment of (dueForReminder ?? []) as unknown as Array<{
    id: string;
    reminder_sent_at: string | null;
    contract: { periodicity: string } | null;
  }>) {
    if (installment.contract?.periodicity === "semanal") continue;

    const alreadyRemindedToday =
      installment.reminder_sent_at && installment.reminder_sent_at.slice(0, 10) === today;
    if (alreadyRemindedToday) continue;

    const result = await sendCollectionReminder(supabase, installment.id);
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({
    checkedDate: today,
    markedOverdue: newlyOverdue?.length ?? 0,
    remindersSent: sent,
    remindersFailed: failed,
  });
}
