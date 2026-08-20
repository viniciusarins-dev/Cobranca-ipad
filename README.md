# Cobrança iPad — MVP

Aplicativo web (PWA, mobile-first, otimizado para iPad/Safari) para gerenciar empréstimos e
vendas parceladas de iPhone: cadastro de clientes, controle de parcelas em estilo planilha e
disparo automático/manual de cobranças via WhatsApp.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + componentes estilo shadcn/ui (Radix UI) + Lucide Icons
- **Backend/Banco**: Supabase (PostgreSQL) — tabelas `clients`, `contracts`, `installments`, `message_settings`, `message_logs`, `weekly_charges`
- **Automação**: Vercel Cron chamando `/api/cron/check-overdue` (diário) e `/api/cron/weekly-dispatch` (fila semanal com anti-banimento)
- **WhatsApp**: módulo com adapters para Meta Cloud API (oficial), Evolution API, Z-API, Twilio e WPPConnect (`src/lib/whatsapp`)

## Estrutura do projeto

```
supabase/migrations/
  0001_init.sql                     # schema do banco (clients, contracts, installments, message_settings, message_logs)
  0002_weekly_dispatch.sql          # tabela weekly_charges (agendamento semanal)
  0003_meta_whatsapp_provider.sql   # provider "meta" + colunas template_name/template_language
src/
  app/
    page.tsx                        # Dashboard — tabela de clientes/contratos com busca e filtros
    contracts/[id]/page.tsx         # Detalhe do contrato + grid de parcelas
    settings/page.tsx               # Configuração da API de WhatsApp
    api/cron/check-overdue/route.ts    # Job diário: marca parcelas atrasadas e dispara cobranças (não-semanais)
    api/cron/weekly-dispatch/route.ts  # Fila de cobrança semanal (Evolution API) com anti-banimento
    actions.ts                      # Server actions (CRUD, toggle de status, envio de lembrete)
  components/
    clients-table.tsx               # Tabela com busca + abas (Todos/Ativos/Inadimplentes/Quitados)
    new-transaction-dialog.tsx      # Formulário de novo empréstimo/venda
    installments-grid.tsx           # Grid de parcelas com toggle de status e botão de lembrete
    settings-form.tsx               # Formulário de configuração do provedor de WhatsApp
    ui/                             # Componentes base (botão, input, tabela, dialog, etc.)
  lib/
    installments.ts                 # Cálculo das datas/valores de cada parcela
    whatsapp/                       # Adapters de envio (Meta, Evolution, Z-API, Twilio, WPPConnect), spintax, healthchecks
    scheduling/                     # Trava de horário, fila e disparo de cobrança semanal
    supabase/                       # Clients do Supabase (browser, server, service role)
    types.ts, validations.ts        # Tipos e schemas (zod)
```

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, rode as migrations em `supabase/migrations/` na ordem numérica (`0001`, `0002`,
   `0003`, ...).
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

| Provedor                | Campos necessários                                          |
| ------------------------ | ------------------------------------------------------------ |
| **Meta Cloud API** (oficial) | Phone Number ID, Access Token, nome do template aprovado, idioma do template |
| Evolution API            | URL base, API Key, Instance ID                                |
| Z-API                     | URL base, Instance ID, Token                                   |
| Twilio                    | Account SID, Auth Token, número remetente (WhatsApp)          |
| WPPConnect                | URL base, Sessão (Instance ID), Token                          |

O template padrão da mensagem (usado como texto livre pelos provedores não-oficiais, ou como
referência do conteúdo do template aprovado no caso da Meta) é:

> Olá {nome_cliente}, identificamos que a sua parcela {numero_parcela} no valor de R$ {valor}
> com vencimento em {data_vencimento} consta pendente. Por favor, entre em contato para
> regularizar.

#### Meta Cloud API (recomendado)

É a API oficial da WhatsApp Business Platform — ao contrário dos demais provedores (que
automatizam o WhatsApp Web e por isso arriscam banimento), ela é sancionada pela própria Meta e
não precisa dos truques de "anti-banimento" (delay randômico, variação de texto). Em troca, exige
um pouco mais de configuração inicial:

1. Crie um app no [Meta for Developers](https://developers.facebook.com/) com o produto
   **WhatsApp Business Platform**, e uma conta comercial (WABA) com o número verificado.
2. Gere um **Access Token de sistema** (permanente, não o token de teste de 24h) e copie o
   **Phone Number ID** do número configurado.
3. No **Meta Business Manager**, crie um **template de mensagem** (categoria *Utility*, ex:
   `lembrete_cobranca`) com **exatamente 4 variáveis no corpo**, nesta ordem: nome do cliente,
   número da parcela, valor e data de vencimento — por exemplo:

   > Olá {{1}}, sua parcela {{2}} no valor de R$ {{3}} com vencimento em {{4}} consta pendente.
   > Entre em contato para regularizar.

   Aguarde a aprovação da Meta (pode levar de minutos a alguns dias).
4. Em Configurações, escolha o provedor **Meta Cloud API**, informe o Phone Number ID, o Access
   Token e o nome/idioma exatos do template aprovado.

O custo é por mensagem (cobrado pela Meta, não pelo app) — na categoria *Utility*, algo em torno
de R$ 0,03/mensagem no Brasil; mensagens de resposta dentro de 24h após o cliente escrever são
gratuitas. Preços mudam com frequência — confira sempre a
[página oficial de preços](https://developers.facebook.com/docs/whatsapp/pricing/) antes de
estimar custo.

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

### 6. Cobrança semanal automática (Meta Cloud API ou Evolution API)

Contratos com periodicidade **Semanal** ganham automaticamente, ao serem cadastrados, um
registro em `weekly_charges` — o dia da semana do disparo (`dia_semana_disparo`) é herdado da
data do 1º vencimento (sábado/domingo são ajustados para sexta/segunda) e `proximo_disparo`
começa nessa mesma data. O pagamento continua controlado manualmente pelos toggles de parcela
já existentes: quando o contrato fica **Quitado** ou **Cancelado**, o `status` da cobrança
semanal é sincronizado automaticamente para `PAGO`/`CANCELADO` e o disparo é abortado.

A fila (`/api/cron/weekly-dispatch`, código em `src/lib/scheduling/`) só está disponível para os
provedores **Meta Cloud API** e **Evolution API** — os demais (Z-API, Twilio, WPPConnect) seguem
funcionando para lembretes manuais e para o `check-overdue` diário, mas não para este disparo
semanal automatizado. A cada execução:

1. **Trava de horário** — só processa de segunda a sexta, das 09:00 às 18:00 (horário de
   Brasília), independente do provedor. Fora disso, encerra sem fazer nada.
2. **Healthcheck do provedor** — Evolution API: confere se a instância está com status `open`;
   Meta Cloud API: confere se o Access Token e o Phone Number ID são válidos. Se falhar, aborta
   o lote inteiro antes de qualquer envio.
3. **Seleção do dia** — busca em `weekly_charges` quem está `PENDENTE`, com
   `dia_semana_disparo` igual a hoje e `proximo_disparo` já vencido.
4. **Para cada cliente da fila**:
   - Refaz o `SELECT` do status **em tempo real**, imediatamente antes de enviar — se alguém
     marcou a parcela como paga ou o contrato como cancelado enquanto a fila rodava, o disparo
     é abortado para aquele cliente.
   - **Evolution API**: monta a mensagem a partir do template configurado em Ajustes e varia o
     texto (saudação por horário + frase de encerramento aleatória, além de spintax
     `{opção 1|opção 2}` no próprio template) para reduzir repetição — depois aguarda um
     **delay aleatório de 60 a 120 segundos** antes do próximo cliente.
   - **Meta Cloud API**: envia o template aprovado preenchendo as 4 variáveis (nome, parcela,
     valor, vencimento) — sem variação de texto (não é permitido alterar um template aprovado) e
     com um intervalo mínimo entre envios, já que não há risco de banimento.
   - Envia, registra em `message_logs` e avança `proximo_disparo` em +7 dias.

> **Limite de tempo de execução (Evolution API):** o delay anti-banimento (60-120s por cliente)
> pode facilmente ultrapassar o tempo máximo de uma function serverless. A fila processa em lote
> respeitando um orçamento de tempo e o que sobrar continua pendente (`proximo_disparo` no
> passado), sendo retomado automaticamente na próxima chamada do cron — o processamento é
> idempotente. O `vercel.json` já agenda `weekly-dispatch` a cada 15 minutos dentro do horário
> comercial, mas **crons com frequência menor que diária exigem plano Vercel Pro** (o plano Hobby
> só permite 1 execução por dia); nesse caso, ajuste a expressão cron para uma execução diária e
> dimensione a carteira de clientes semanais de acordo, ou rode a fila por fora da Vercel
> (servidor próprio, GitHub Actions, etc.) chamando o mesmo endpoint HTTP. **Com a Meta Cloud
> API**, sem o delay de 60-120s, esse limite praticamente não é um problema — a fila costuma
> processar dezenas/centenas de clientes em poucos segundos.

## Próximos passos sugeridos

- Tela de login (Supabase Auth) protegendo as rotas do app.
- Edição/exclusão de clientes e contratos.
- Histórico de mensagens enviadas (`message_logs`) na UI.
- Relatórios (total a receber, inadimplência por período).
