# Cobrança iPad — MVP

Aplicativo web (PWA, mobile-first, otimizado para iPad/Safari) para gerenciar empréstimos e
vendas parceladas de iPhone: cadastro de clientes, controle de parcelas em estilo planilha e
disparo automático/manual de cobranças via WhatsApp.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + componentes estilo shadcn/ui (Radix UI) + Lucide Icons
- **Backend/Banco**: Supabase (PostgreSQL) — tabelas `clients`, `contracts`, `installments`, `message_settings`, `message_logs`, `weekly_charges`
- **Automação**: Vercel Cron chamando `/api/cron/check-overdue` (diário) e `/api/cron/weekly-dispatch` (fila semanal com anti-banimento)
- **WhatsApp**: módulo com adapters para Evolution API, Z-API, Twilio e WPPConnect (`src/lib/whatsapp`)

## Estrutura do projeto

```
supabase/migrations/
  0001_init.sql                     # schema do banco (clients, contracts, installments, message_settings, message_logs)
  0002_weekly_dispatch.sql          # tabela weekly_charges (agendamento semanal)
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
    whatsapp/                       # Adapters de envio (Evolution, Z-API, Twilio, WPPConnect), spintax, healthcheck
    scheduling/                     # Trava de horário, fila e disparo de cobrança semanal
    supabase/                       # Clients do Supabase (browser, server, service role)
    types.ts, validations.ts        # Tipos e schemas (zod)
```

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, rode o conteúdo de `supabase/migrations/0001_init.sql` e, em seguida,
   `supabase/migrations/0002_weekly_dispatch.sql`, na ordem.
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

### 6. Cobrança semanal automática (Evolution API)

Contratos com periodicidade **Semanal** ganham automaticamente, ao serem cadastrados, um
registro em `weekly_charges` — o dia da semana do disparo (`dia_semana_disparo`) é herdado da
data do 1º vencimento (sábado/domingo são ajustados para sexta/segunda) e `proximo_disparo`
começa nessa mesma data. O pagamento continua controlado manualmente pelos toggles de parcela
já existentes: quando o contrato fica **Quitado** ou **Cancelado**, o `status` da cobrança
semanal é sincronizado automaticamente para `PAGO`/`CANCELADO` e o disparo é abortado.

A fila roda em `/api/cron/weekly-dispatch` (`src/lib/scheduling/`) e, a cada execução:

1. **Trava de horário** — só processa de segunda a sexta, das 09:00 às 18:00 (horário de
   Brasília). Fora disso, encerra sem fazer nada.
2. **Healthcheck da Evolution API** — confere se a instância configurada está com o status
   `open` antes de iniciar qualquer envio do dia; se não estiver conectada, aborta o lote.
3. **Seleção do dia** — busca em `weekly_charges` quem está `PENDENTE`, com
   `dia_semana_disparo` igual a hoje e `proximo_disparo` já vencido.
4. **Para cada cliente da fila**:
   - Refaz o `SELECT` do status **em tempo real**, imediatamente antes de enviar — se alguém
     marcou a parcela como paga ou o contrato como cancelado enquanto a fila rodava, o disparo
     é abortado para aquele cliente.
   - Monta a mensagem a partir do template configurado em Ajustes, varia o texto (saudação por
     horário + frase de encerramento aleatória, além de suporte a spintax `{opção 1|opção 2}`
     no próprio template) para reduzir repetição.
   - Envia, registra em `message_logs` e avança `proximo_disparo` em +7 dias.
   - Aguarda um **delay aleatório de 60 a 120 segundos** antes do próximo cliente da fila.

> **Limite de tempo de execução:** o delay anti-banimento (60-120s por cliente) pode facilmente
> ultrapassar o tempo máximo de uma function serverless. A fila processa em lote respeitando um
> orçamento de tempo e o que sobrar continua pendente (`proximo_disparo` no passado), sendo
> retomado automaticamente na próxima chamada do cron — o processamento é idempotente. O
> `vercel.json` já agenda `weekly-dispatch` a cada 15 minutos dentro do horário comercial, mas
> **crons com frequência menor que diária exigem plano Vercel Pro** (o plano Hobby só permite
> 1 execução por dia); nesse caso, ajuste a expressão cron para uma execução diária e dimensione
> a carteira de clientes semanais de acordo, ou rode a fila por fora da Vercel (servidor próprio,
> GitHub Actions, etc.) chamando o mesmo endpoint HTTP.

### 7. Consulta de dados cadastrais (telefone → CPF/CNPJ, CEP, endereço)

O app tem um conector **genérico e configurável** para buscar CPF/CNPJ, CEP e endereço a partir
do telefone do cliente — útil para localizar devedores na tela de novo cadastro (botão de lupa
ao lado do campo de telefone).

> **Não existe base pública/gratuita para esse tipo de busca no Brasil.** É necessário contratar
> um provedor de dados cadastrais (ex: Big Data Corp, Assertiva, Direct Data, SintegraWS) e usar
> a consulta com base legal adequada na LGPD — em cobrança, normalmente o art. 7º, X (proteção ao
> crédito). O app não embute nem simula nenhuma fonte de dados: sem um provedor configurado, a
> consulta retorna o erro "Nenhum provedor de consulta cadastral configurado."

Configure em **Configurações** (`/settings`), seção "Consulta de dados cadastrais":

- **URL da API** — endpoint do provedor contratado, com `{phone}` no lugar onde o telefone (só
  dígitos) deve entrar (na URL para GET, ou no corpo para POST).
- **Autenticação** — chave de API e o header em que ela deve ser enviada (ex: `Authorization`
  com prefixo `Bearer`, ou `apikey` sem prefixo — depende do provedor).
- **Mapeamento da resposta** — caminho (dot-path) de cada campo dentro do JSON de retorno da API
  (ex: `data.cpf`, `resultado.0.endereco.cep`), já que cada provedor tem um formato próprio.

Os dados retornados preenchem os campos "CPF/CNPJ", "CEP" e "Endereço" do formulário de novo
cadastro e são salvos no cliente (tabela `clients`); nada é armazenado além do que o formulário
grava.

## Próximos passos sugeridos

- Tela de login (Supabase Auth) protegendo as rotas do app.
- Edição/exclusão de clientes e contratos.
- Histórico de mensagens enviadas (`message_logs`) na UI.
- Relatórios (total a receber, inadimplência por período).
