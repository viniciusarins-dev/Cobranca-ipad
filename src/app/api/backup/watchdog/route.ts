import { NextRequest, NextResponse } from "next/server";

import { sendBackupFailureAlert } from "@/lib/backup-alert";
import { isAuthorizedBySecret } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Monitoramento INDEPENDENTE do backup automático — achado da auditoria de
 * 03/11: uma falha que acontece antes de `scripts/backup/backup.mjs` rodar
 * (ex.: a instalação do pg_dump no runner) nunca chega a chamar
 * `/api/backup/report`, então ficava completamente invisível (nenhuma
 * linha em `backup_runs`, nenhum alerta). Esta rota não depende do
 * `backup.mjs` ter rodado nem ter conseguido reportar nada — só olha o
 * ESTADO atual da tabela de fora, disparada por um workflow do GitHub
 * Actions SEPARADO (.github/workflows/backup-watchdog.yml), com seu
 * próprio agendamento e seu próprio segredo.
 *
 * Detecta dois problemas:
 * 1. Nenhum backup bem-sucedido recente (o último "success" está mais
 *    velho que o limite tolerado — generoso o bastante pra não disparar
 *    por causa do atraso normal do agendador do GitHub Actions, mas bem
 *    mais apertado que o intervalo nominal de 6h medido na auditoria de
 *    03/11, já que o backup passou a ser horário em 06/11 — um sistema de
 *    cobrança em produção não pode ficar muitas horas sem alerta).
 * 2. Uma execução "running" (heartbeat) mais velha que o timeout do job
 *    (45min, ver backup.yml) — sinal de que o processo morreu no meio sem
 *    nunca reportar o resultado final.
 *
 * Responde com HTTP 500 quando encontra um problema — de propósito: o
 * workflow chama esta rota com `curl -f`, então uma resposta não-2xx
 * também derruba aquele step, disparando o e-mail automático do GitHub
 * para execução agendada com falha — um SEGUNDO canal de alerta,
 * independente do WhatsApp enviado aqui dentro.
 */
const STALE_SUCCESS_HOURS = 3;
const STUCK_RUNNING_HOURS = 1;

function hoursSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedBySecret(request, "BACKUP_WATCHDOG_SECRET")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const problems: string[] = [];

  const { data: lastSuccess } = await supabase
    .from("backup_runs")
    .select("started_at")
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastSuccess) {
    problems.push("Nenhum backup bem-sucedido encontrado em todo o histórico.");
  } else if (hoursSince(lastSuccess.started_at) > STALE_SUCCESS_HOURS) {
    problems.push(
      `Último backup bem-sucedido há ${hoursSince(lastSuccess.started_at).toFixed(1)}h (limite: ${STALE_SUCCESS_HOURS}h).`,
    );
  }

  const { data: stuckRuns } = await supabase
    .from("backup_runs")
    .select("id, started_at")
    .eq("status", "running")
    .order("started_at", { ascending: false });

  const stuck = (stuckRuns ?? []).filter((r) => hoursSince(r.started_at) > STUCK_RUNNING_HOURS);
  if (stuck.length > 0) {
    problems.push(
      `${stuck.length} execução(ões) travada(s) em "running" há mais de ${STUCK_RUNNING_HOURS}h (provável falha no meio do processo, sem reportar o resultado final).`,
    );
  }

  if (problems.length > 0) {
    await sendBackupFailureAlert(supabase, `Watchdog detectou problema(s):\n\n${problems.join("\n")}`);
    return NextResponse.json({ ok: false, problems }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
