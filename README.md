# Cobrança iPad — MVP

Aplicativo web (PWA, mobile-first, otimizado para iPad/Safari) para gerenciar empréstimos e
vendas parceladas de iPhone: cadastro de clientes, controle de parcelas em estilo planilha e
disparo automático/manual de cobranças via WhatsApp.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + componentes estilo shadcn/ui (Radix UI) + Lucide Icons
- **Backend/Banco**: Supabase (PostgreSQL) — tabelas `clients`, `contracts`, `installments`, `message_settings`, `message_logs`
- **Automação**: Vercel Cron chamando `/api/cron/check-overdue` diariamente
- **WhatsApp**: módulo com adapters para Evolution API, Z-API, Twilio e WPPConnect (`src/lib/whatsapp`)

## Estrutura do projeto

```
supabase/migrations/0001_init.sql   # schema do banco (clients, contracts, installments, message_settings, message_logs)
src/
  app/
    page.tsx                        # Dashboard — tabela de clientes/contratos com busca e filtros
    contracts/[id]/page.tsx         # Detalhe do contrato + grid de parcelas
    settings/page.tsx               # Configuração da API de WhatsApp
    api/cron/check-overdue/route.ts # Job diário: marca parcelas atrasadas e dispara cobranças
    actions.ts                      # Server actions (CRUD, toggle de status, envio de lembrete)
  components/
    clients-table.tsx               # Tabela com busca + abas (Todos/Ativos/Inadimplentes/Quitados)
    new-transaction-dialog.tsx      # Formulário de novo empréstimo/venda
    installments-grid.tsx           # Grid de parcelas com toggle de status e botão de lembrete
    settings-form.tsx               # Formulário de configuração do provedor de WhatsApp
    ui/                             # Componentes base (botão, input, tabela, dialog, etc.)
  lib/
    installments.ts                 # Cálculo das datas/valores de cada parcela
    whatsapp/                       # Adapters de envio (Evolution, Z-API, Twilio, WPPConnect)
    supabase/                       # Clients do Supabase (browser, server, service role)
    types.ts, validations.ts        # Tipos e schemas (zod)
```

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, rode o conteúdo de `supabase/migrations/0001_init.sql`.
3. Habilite autenticação por e-mail/senha (Auth) e crie o usuário administrador que vai operar
   o app — as políticas de RLS liberam acesso total para qualquer usuário autenticado (MVP
   single-tenant). Para múltiplos operadores/permissões, ajuste as policies antes de produção.
4. Copie `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
   em Project Settings → API.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
# preencha com os valores do seu projeto Supabase
```

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Para testar como PWA no iPad, acesse pelo
Safari e use "Adicionar à Tela de Início".

### 4. Configurar a cobrança via WhatsApp

Acesse a tela **Configurações** (`/settings`) dentro do app e informe as credenciais do provedor
escolhido:

| Provedor      | Campos necessários                                  |
| ------------- | ---------------------------------------------------- |
| Evolution API | URL base, API Key, Instance ID                       |
| Z-API         | URL base, Instance ID, Token                          |
| Twilio        | Account SID, Auth Token, número remetente (WhatsApp) |
| WPPConnect    | URL base, Sessão (Instance ID), Token                 |

O template padrão da mensagem é:

> Olá {nome_cliente}, identificamos que a sua parcela {numero_parcela} no valor de R$ {valor}
> com vencimento em {data_vencimento} consta pendente. Por favor, entre em contato para
> regularizar.

### 5. Cron de verificação diária

Ao fazer deploy na Vercel, o arquivo `vercel.json` já registra o cron job
(`/api/cron/check-overdue`, todo dia às 09:00 UTC). Configure a env var `CRON_SECRET` no projeto
Vercel — ela é enviada automaticamente pelo cron como `Authorization: Bearer $CRON_SECRET` e
validada pela rota.

O job:
1. Marca como **Atrasado** toda parcela **Pendente** cujo vencimento já passou.
2. Recalcula o status geral do contrato (Ativo / Inadimplente / Quitado).
3. Envia a mensagem de cobrança para toda parcela atrasada que ainda não recebeu lembrete no dia.

Fora da Vercel, qualquer scheduler (cron do servidor, GitHub Actions, Supabase Edge Functions
com `pg_cron`, etc.) pode chamar o mesmo endpoint HTTP com o header `Authorization: Bearer
<CRON_SECRET>`.

## Próximos passos sugeridos

- Tela de login (Supabase Auth) protegendo as rotas do app.
- Edição/exclusão de clientes e contratos.
- Histórico de mensagens enviadas (`message_logs`) na UI.
- Relatórios (total a receber, inadimplência por período).
