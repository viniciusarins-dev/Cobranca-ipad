-- Consulta de dados cadastrais (telefone -> CPF/CNPJ/CEP/endereço)
-- Tabela aditiva: não altera clients/contracts/installments/message_settings existentes.
--
-- Não existe base pública gratuita para essa busca no Brasil: é necessário
-- contratar um provedor de dados cadastrais (ex: Big Data Corp, Assertiva,
-- Direct Data, SintegraWS) e configurar as credenciais em lookup_settings.
-- Base legal recomendada: LGPD art. 7º, X (proteção ao crédito).

-- ============================================================
-- clients: campos adicionais preenchidos pela consulta
-- ============================================================
alter table clients add column if not exists document text;
alter table clients add column if not exists document_type text check (document_type in ('cpf', 'cnpj'));
alter table clients add column if not exists cep text;
alter table clients add column if not exists address text;

-- ============================================================
-- lookup_settings (configuração do conector de consulta cadastral)
-- Conector genérico: o usuário informa a URL/método/headers/mapeamento
-- de campos da API do provedor que contratar, sem acoplar o código a um
-- fornecedor específico.
-- ============================================================
create table if not exists lookup_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'generic_rest' check (provider in ('generic_rest')),
  base_url text,
  method text not null default 'GET' check (method in ('GET', 'POST')),
  api_key text,
  auth_header text,
  auth_scheme text,
  body_template text,
  document_field text,
  document_type_field text,
  name_field text,
  cep_field text,
  address_field text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lookup_settings_set_updated_at
  before update on lookup_settings
  for each row execute function set_updated_at();

-- Garante no máximo uma configuração ativa por vez
create unique index if not exists lookup_settings_single_active_idx
  on lookup_settings ((is_active))
  where is_active;

alter table lookup_settings enable row level security;

create policy "Authenticated full access" on lookup_settings
  for all to authenticated using (true) with check (true);
