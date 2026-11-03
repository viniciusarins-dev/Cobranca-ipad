import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sendBackupFailureAlert } from "@/lib/backup-alert";
import { isAuthorizedBySecret } from "@/lib/cron-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Recebe o ESTADO de uma execução do backup automático (scripts/backup/,
 * disparado pelo GitHub Actions a cada 6h) — nunca o conteúdo do backup em
 * si. Chamado só pelo workflow, autenticado por `BACKUP_REPORT_SECRET`
 * (segredo próprio, separado do `CRON_SECRET` usado pelos crons da Vercel —
 * cada chamador externo com sua própria credencial).
 *
 * Dois usos:
 * 1) "running" (heartbeat, chamado no INÍCIO do backup.mjs, sem `runId`):
 *    insere uma linha e devolve `runId` — se o processo morrer antes de
 *    terminar (ex.: falha no step de instalar o pg_dump, como já aconteceu
 *    uma vez — ver achado da auditoria de 03/11), essa linha fica visível
 *    como "running" indefinidamente em vez de a execução simplesmente não
 *    aparecer em lugar nenhum, que era o comportamento antes desta mudança.
 * 2) "success"/"failed" (chamado no FIM, com o `runId` do passo 1 quando
 *    disponível): ATUALIZA essa mesma linha em vez de inserir uma nova.
 *    Sem `runId` (chamador antigo, ou o heartbeat falhou por algum motivo
 *    externo), insere uma linha nova — nunca perde o resultado por causa
 *    disso.
 */
const reportSchema = z.object({
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  status: z.enum(["running", "success", "failed"]),
  runId: z.string().uuid().optional(),
  tiers: z.array(z.enum(["6h", "daily", "monthly"])).default([]),
  sizeBytes: z.number().int().nonnegative().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  destination: z.string().optional(),
  checksum: z.string().optional(),
  validation: z.record(z.string(), z.boolean()).optional(),
  errorMessage: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedBySecret(request, "BACKUP_REPORT_SECRET")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }
  const data = parsed.data;
  const supabase = createServiceRoleClient();

  if (data.status === "running") {
    const { data: inserted, error } = await supabase
      .from("backup_runs")
      .insert({ started_at: data.startedAt, status: "running" })
      .select("id")
      .single();

    if (error || !inserted) {
      return NextResponse.json({ error: "Erro ao registrar início do backup." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, runId: inserted.id });
  }

  const fields = {
    finished_at: data.finishedAt ?? new Date().toISOString(),
    status: data.status,
    tiers: data.tiers,
    size_bytes: data.sizeBytes ?? null,
    duration_seconds: data.durationSeconds ?? null,
    destination: data.destination ?? null,
    checksum: data.checksum ?? null,
    validation: data.validation ?? null,
    error_message: data.errorMessage ?? null,
  };

  const { error } = data.runId
    ? await supabase.from("backup_runs").update(fields).eq("id", data.runId)
    : await supabase.from("backup_runs").insert({ started_at: data.startedAt, ...fields });

  if (error) {
    return NextResponse.json({ error: "Erro ao registrar execução do backup." }, { status: 500 });
  }

  if (data.status === "failed") {
    const finishedAtLabel = new Date(fields.finished_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    await sendBackupFailureAlert(
      supabase,
      `Data/hora: ${finishedAtLabel}\nStatus: FALHOU\nMotivo: ${data.errorMessage ?? "não informado"}`,
    );
  }

  return NextResponse.json({ ok: true });
}
