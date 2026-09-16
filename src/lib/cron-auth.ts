import { NextRequest } from "next/server";

/**
 * Autoriza as rotas de cron (`/api/cron/*`, fora do proxy.ts de sessão —
 * elas rodam sem usuário logado, com a service role key). Antes, quando
 * `CRON_SECRET` não estava configurado, a rota ficava aberta para
 * qualquer um (`return true`) — um endpoint público com acesso de service
 * role (ignora RLS) e capaz de disparar mensagens de WhatsApp para
 * clientes reais. Agora nega por padrão: sem segredo configurado, a rota
 * fica bloqueada (falha fechada), nunca aberta por engano.
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
