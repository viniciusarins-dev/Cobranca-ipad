-- Evita que o watchdog de backup (api/backup/watchdog) mande um alerta por
-- WhatsApp a cada execução enquanto o MESMO atraso continua em andamento —
-- o watchdog roda de hora em hora, e o agendador do GitHub Actions pode
-- atrasar o backup por várias horas seguidas, o que sem isto gerava uma
-- mensagem repetida por hora sobre o mesmo problema já avisado.
--
-- Tabela "singleton" (uma única linha, id fixo) guardando a assinatura do
-- último problema já avisado — só a aplicação (service role) escreve nela;
-- não guarda nenhum dado sensível, só um resumo do problema e quando foi.
--
-- Migration aditiva: nenhuma tabela/coluna existente é alterada.

create table if not exists backup_watchdog_state (
  id text primary key default 'singleton',
  last_alert_signature text,
  last_alerted_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into backup_watchdog_state (id) values ('singleton')
on conflict (id) do nothing;

alter table backup_watchdog_state enable row level security;

-- Mesmo padrão de backup_runs: só leitura pra usuários autenticados; quem
-- escreve é sempre a rota do watchdog, com a service role (ignora RLS de
-- propósito, é um processo de sistema).
create policy "Authenticated can read backup watchdog state" on backup_watchdog_state
  for select to authenticated using (true);
