import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { runWeeklyDispatchQueue } from "@/lib/scheduling/weekly-dispatch-queue";

export const dynamic = "force-dynamic";

// Tempo máximo da function. Na Vercel isso é limitado pelo plano
// (Hobby: até 60s; Pro: até 300s por padrão, maior sob configuração).
// A fila respeita esse orçamento internamente e retoma o restante na
// próxima execução do cron — ajuste `maxDurationMs` abaixo junto com
// este valor caso seu plano permita mais tempo.
export const maxDuration = 300;

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
  const summary = await runWeeklyDispatchQueue(supabase, { maxDurationMs: 280_000 });

  return NextResponse.json(summary);
}
