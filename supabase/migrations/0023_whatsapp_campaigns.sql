-- Central de WhatsApp: campanhas de cobrança em lote via Evolution API
-- (ou outro provedor já configurado em message_settings), além de
-- consentimento/bloqueio de contato e idempotência de webhook.
--
-- Migration aditiva: não altera nenhuma tabela financeira existente
-- (clients, contracts, installments, payments). Segue o mesmo padrão de
-- owner_id + RLS "Owner full access" já usado desde a migration 0015.

-- ============================================================
-- whatsapp_consents
-- Controle de autorização de contato por cliente. Ausência de linha =
-- autorizado (comportamento atual preservado: nenhum cliente já
-- cadastrado é bloqueado retroativamente por esta migration). Uma linha
-- com is_blocked = true remove o cliente de qualquer campanha nova e
-- impede reenvio automático — verificado tanto na montagem da campanha
-- quanto no processamento da fila (defesa em profundidade).
-- ============================================================
create table if not exists whatsapp_consents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  category text not null default 'cobranca' check (category in ('cobranca')),
  is_blocked boolean not null default false,
  consent_source text,
  consent_recorded_at timestamptz,
  blocked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, client_id, category)
);

create index if not exists whatsapp_consents_owner_id_idx on whatsapp_consents (owner_id);
create index if not exists whatsapp_consents_client_id_idx on whatsapp_consents (client_id);

create trigger whatsapp_consents_set_updated_at
  before update on whatsapp_consents
  for each row execute function set_updated_at();

alter table whatsapp_consents enable row level security;
create policy "Owner full access" on whatsapp_consents
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================================
-- whatsapp_campaigns
-- Uma campanha = um disparo em lote configurado pelo usuário (filtro de
-- clientes, modelo de mensagem, intervalo). Nunca usa delay randômico nem
-- variação de texto (spintax) — diferente da fila semanal legada
-- (weekly_charges), que continua com esse comportamento por ser
-- funcionalidade já existente e fora do escopo desta mudança.
-- ============================================================
create table if not exists whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  filter_type text not null check (
    filter_type in ('devedores_do_dia', 'parcelas_vencidas', 'parcelas_em_aberto', 'selecao_manual')
  ),
  message_template text not null,
  -- Intervalo fixo entre envios, em segundos — nunca randômico. 0 = sem
  -- espera (só recomendado para Meta Cloud API, que é a API oficial).
  interval_seconds integer not null default 5 check (interval_seconds >= 0),
  status text not null default 'rascunho' check (
    status in ('rascunho', 'em_andamento', 'pausada', 'concluida', 'cancelada')
  ),
  total_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_campaigns_owner_id_idx on whatsapp_campaigns (owner_id);
create index if not exists whatsapp_campaigns_status_idx on whatsapp_campaigns (owner_id, status);

create trigger whatsapp_campaigns_set_updated_at
  before update on whatsapp_campaigns
  for each row execute function set_updated_at();

alter table whatsapp_campaigns enable row level security;
create policy "Owner full access" on whatsapp_campaigns
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================================
-- whatsapp_campaign_messages
-- A fila em si: um registro por destinatário de uma campanha, com
-- conteúdo já renderizado no momento da criação (snapshot — o histórico
-- mostra exatamente o que foi enviado, mesmo que o template ou os dados
-- do cliente mudem depois).
-- ============================================================
create table if not exists whatsapp_campaign_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references whatsapp_campaigns (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  contract_id uuid references contracts (id) on delete set null,
  installment_id uuid references installments (id) on delete set null,
  to_phone text not null,
  message_content text not null,
  status text not null default 'pendente' check (
    status in ('pendente', 'processando', 'aceita', 'enviada', 'entregue', 'falha', 'cancelada')
  ),
  -- Id retornado pelo provedor (Evolution/Meta/etc.) — correlaciona com
  -- eventos de webhook para marcar "entregue" só com evidência real.
  provider_message_id text,
  error_message text,
  attempt_count integer not null default 0,
  -- Protege contra duplicidade ao reprocessar um lote interrompido (mesmo
  -- padrão de idempotency_key já usado em payments/settle_contract_atomic).
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  confirmed_at timestamptz,
  delivered_at timestamptz
);

create index if not exists whatsapp_campaign_messages_owner_id_idx on whatsapp_campaign_messages (owner_id);
create index if not exists whatsapp_campaign_messages_campaign_id_idx on whatsapp_campaign_messages (campaign_id);
create index if not exists whatsapp_campaign_messages_queue_idx
  on whatsapp_campaign_messages (campaign_id, status);
create index if not exists whatsapp_campaign_messages_provider_message_id_idx
  on whatsapp_campaign_messages (provider_message_id)
  where provider_message_id is not null;

alter table whatsapp_campaign_messages enable row level security;
create policy "Owner full access" on whatsapp_campaign_messages
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================================
-- whatsapp_webhook_events
-- Idempotência de webhooks recebidos da Evolution API — evita processar
-- o mesmo evento duas vezes (reentrega é comum em qualquer webhook).
-- Nunca é exibida em tela nenhuma (log interno, como message_logs/
-- audit_logs antes da migration 0017) — ainda assim já nasce com
-- owner_id + RLS própria para não repetir aquele gap.
-- ============================================================
create table if not exists whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, provider_event_id)
);

create index if not exists whatsapp_webhook_events_owner_id_idx on whatsapp_webhook_events (owner_id);

alter table whatsapp_webhook_events enable row level security;
create policy "Owner full access" on whatsapp_webhook_events
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
