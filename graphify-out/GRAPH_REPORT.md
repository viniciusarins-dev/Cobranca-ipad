# Graph Report - Cobranca-ipad  (2026-11-10)

## Corpus Check
- 166 files · ~85,498 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 1, .example 1, .toml 1)

## Summary
- 1016 nodes · 3357 edges · 57 communities (47 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `00c11061`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- (app)/page.tsx
- app-nav.tsx
- new-transaction-dialog.tsx
- actions.ts
- backup.mjs
- env
- createClient
- compilerOptions
- dependencies
- Agent Selection Matrix (25 Skills)
- devDependencies
- package.json
- Backup automático — configuração e restauração
- Orchestration Patterns
- manifest.json
- eslint.config.mjs
- scripts
- financial-rules.ts
- loading.tsx
- app/layout.tsx
- weekly-dispatch-queue.ts
- AGENTS.md
- CLAUDE.md
- Orchestrator AI - Specification Driven Development
- debtors.ts
- postcss.config.mjs
- vercel.json
- server.ts
- CodeGraph MCP Server Integration
- evolution-instance.ts
- 🇬🇧 English Welcome Message
- Workflow Engine Integration (v2.1.0)
- Module Integration Examples
- MUSUBI CLI Commands Reference
- Managed Agents Overview (25 Types)
- Agent Selection Logic
- Orchestratorの役割（対話モード時）
- ファイル出力要件
- 標準ワークフロー
- watchdog
- types.ts
- providers.ts
- campaign-queue.ts
- template.ts
- spintax.ts
- @supabase/ssr
- zod
- recalculateContractStatus
- imei.ts
- file-validation.ts
- next.config.ts
- @radix-ui/react-dropdown-menu
- @radix-ui/react-select
- @radix-ui/react-tabs
- @supabase/supabase-js@^2.112.3
- @radix-ui/react-dialog

## God Nodes (most connected - your core abstractions)
1. `cn()` - 65 edges
2. `createClient()` - 58 edges
3. `Button()` - 48 edges
4. `react` - 46 edges
5. `formatCurrency()` - 45 edges
6. `lucide-react` - 40 edges
7. `next` - 40 edges
8. `roundCents()` - 39 edges
9. `Input()` - 35 edges
10. `SpotlightCard()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `CampaignRow()` --indirect_call--> `startWhatsAppCampaign()`  [INFERRED]
  src/components/whatsapp/campaigns-panel.tsx → src/app/actions.ts
- `CampaignRow()` --indirect_call--> `pauseWhatsAppCampaign()`  [INFERRED]
  src/components/whatsapp/campaigns-panel.tsx → src/app/actions.ts
- `CampaignRow()` --indirect_call--> `cancelWhatsAppCampaign()`  [INFERRED]
  src/components/whatsapp/campaigns-panel.tsx → src/app/actions.ts
- `handleConnect()` --calls--> `connectWhatsAppEvolution()`  [EXTRACTED]
  src/components/whatsapp/connection-panel.tsx → src/app/actions.ts
- `handleDisconnect()` --calls--> `disconnectWhatsAppEvolution()`  [EXTRACTED]
  src/components/whatsapp/connection-panel.tsx → src/app/actions.ts

## Import Cycles
- None detected.

## Communities (57 total, 10 thin omitted)

### Community 0 - "cn"
Cohesion: 0.06
Nodes (91): FinancialReportSummary, getWhatsAppConnectionStatus(), sendTestMessage(), setWhatsAppConsent(), BackupsPage(), dynamic, formatBytes(), formatDuration() (+83 more)

### Community 1 - "(app)/page.tsx"
Cohesion: 0.06
Nodes (58): vitest, FinancialReportRow, ClientesPage(), dynamic, DebtorsPage(), dynamic, DashboardPage(), DashboardPageContract (+50 more)

### Community 2 - "app-nav.tsx"
Cohesion: 0.29
Nodes (9): AppShellLayout(), AppNav(), BrandMark(), FINANCEIRO_ITEMS, LOJA_ITEMS, NavGroup(), NavItem, SidebarContent() (+1 more)

### Community 3 - "new-transaction-dialog.tsx"
Cohesion: 0.16
Nodes (49): @hookform/resolvers, lucide-react, next, react, react-hook-form, sonner, EditAddressDialog(), ContractSummary (+41 more)

### Community 4 - "actions.ts"
Cohesion: 0.10
Nodes (35): ContractSettlementSummary, FinancialReportPaymentRow, previewWhatsAppCampaign(), SettlementContractRow, handlePreview(), CampaignPreviewInput, campaignPreviewSchema, ClientAddressInput (+27 more)

### Community 5 - "backup.mjs"
Cohesion: 0.08
Nodes (38): @aws-sdk/client-s3, main(), reportResult(), requireEnv(), downloadAllDocuments(), walk(), decryptBuffer(), encryptBuffer() (+30 more)

### Community 6 - "env"
Cohesion: 0.06
Nodes (30): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, APP_URL, BACKUP_ENCRYPTION_KEY (+22 more)

### Community 7 - "createClient"
Cohesion: 0.10
Nodes (46): ActionResult, buildFinancialReportReference(), cancelWhatsAppCampaign(), createTransaction(), createWhatsAppCampaign(), deleteClientDocument(), deleteContract(), getCurrentUserEmail() (+38 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, @hookform/resolvers@^5.7.1, lucide-react@^1.31.0, next@16.3.5, @radix-ui/react-checkbox@^1.3.11, @radix-ui/react-slot@^1.3.3, @radix-ui/react-switch@^1.3.7 (+11 more)

### Community 10 - "Agent Selection Matrix (25 Skills)"
Cohesion: 0.09
Nodes (21): Additional Skills (Beyond Original 25), Agent Selection Matrix (25 Skills), By SDD Workflow Stage, By Task Type, Category 1: Orchestration & Management (3 Skills), Category 2: Requirements & Planning (3 Skills), Category 3: Architecture & Design (4 Skills), Category 4: Development & Implementation (2 Skills) (+13 more)

### Community 11 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^22, @types/react@^19, @types/react-dom@^19, typescript@^5, vitest@^5.0.5 (+6 more)

### Community 12 - "package.json"
Cohesion: 0.14
Nodes (13): clsx@^2.1.1, date-fns@^4.4.0, @radix-ui/react-label@^2.1.15, recharts@^3.10.1, tailwind-merge@^3.6.0, name, private, version (+5 more)

### Community 13 - "Backup automático — configuração e restauração"
Cohesion: 0.07
Nodes (25): 1. Rodar a migration, 2. Criar a conta e o bucket no Cloudflare R2, 3. Pegar a connection string DIRETA do Postgres, 4. Gerar a chave de criptografia, 5. Configurar os GitHub Secrets, 6. Testar manualmente antes de confiar no agendamento, 7. Retenção, 8. Alertas de falha (+17 more)

### Community 14 - "Orchestration Patterns"
Cohesion: 0.11
Nodes (17): Best Practices, Design Review Gate, Orchestration Patterns, Overview, Pattern 1: Auto Pattern (Recommended), Pattern 2: Sequential Pattern, Pattern 3: Nested Pattern (Hierarchical), Pattern 4: Group Chat Pattern (+9 more)

### Community 15 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 16 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.3.0, eslint, eslint-config-next

### Community 17 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test

### Community 18 - "financial-rules.ts"
Cohesion: 0.11
Nodes (34): buildSettlementInstallmentInputs(), getContractSettlementSummary(), markReminderOpened(), payDownContractBalance(), registerPayment(), settleContract(), InstallmentRow(), handleSendReminder() (+26 more)

### Community 20 - "app/layout.tsx"
Cohesion: 0.23
Nodes (8): cinzel, geistMono, inter, metadata, RootLayout(), viewport, AuroraBackground(), Toaster()

### Community 21 - "weekly-dispatch-queue.ts"
Cohesion: 0.21
Nodes (15): toBusinessDateString(), getBrazilDateInfo(), getBrazilDateString(), getBrazilIsoWeekday(), isWithinDispatchWindow(), WEEKDAY_TO_ISO, delayForProvider(), emptySummary() (+7 more)

### Community 23 - "CLAUDE.md"
Cohesion: 0.40
Nodes (4): graphify, how graphify, orchestrator and security tooling fit together, orchestrator (MUSUBI skill) — automatic triggering policy, security tooling (Strix / Claude Security)

### Community 24 - "Orchestrator AI - Specification Driven Development"
Cohesion: 0.20
Nodes (9): Before Starting Orchestration, Benefits, Guardrails Commands (v3.9.0 NEW), Language Preference Policy, Orchestrator AI - Specification Driven Development, Project Memory (Steering System), Role Definition, Your Responsibilities (+1 more)

### Community 25 - "debtors.ts"
Cohesion: 0.14
Nodes (23): Debtor, DebtorInstallmentRow, DebtorSourceInstallment, getTodayDebtors(), groupDebtorsByClient(), LateInterestDetailRow, client(), installmentRow() (+15 more)

### Community 28 - "server.ts"
Cohesion: 0.14
Nodes (21): dynamic, POST(), reportSchema, dynamic, GET(), hoursSince(), dynamic, GET() (+13 more)

### Community 29 - "CodeGraph MCP Server Integration"
Cohesion: 0.20
Nodes (10): CodeGraph MCP Server Integration, CodeGraph MCP インストール・設定, CodeGraph活用ワークフロー, Step 1: 環境確認, Step 2: インストール実行, Step 3: プロジェクトインデックス作成, Step 4: 設定ファイル作成（オプション選択）, プロジェクトのインデックス作成 (+2 more)

### Community 30 - "evolution-instance.ts"
Cohesion: 0.22
Nodes (12): buildEvolutionWebhookUrl(), connectWhatsAppEvolution(), disconnectWhatsAppEvolution(), createEvolutionInstance(), CreateInstanceResult, EvolutionAdminConfig, extractInstanceToken(), getEvolutionAdminConfig() (+4 more)

### Community 31 - "🇬🇧 English Welcome Message"
Cohesion: 0.20
Nodes (10): 🇬🇧 English Welcome Message, 📋 How to Use, 🎯 Key Features, 🤖 Managed Agents (25 Types), セッション開始メッセージ, 📋 使い方, 🎯 提供機能, 🇯🇵 日本語ウェルカムメッセージ (+2 more)

### Community 32 - "Workflow Engine Integration (v2.1.0)"
Cohesion: 0.29
Nodes (7): 10ステージ ワークフロー, Orchestrator推奨フロー, Workflow Engine Integration (v2.1.0), ステージ遷移, フィードバックループ, メトリクス活用, ワークフロー開始時

### Community 33 - "Module Integration Examples"
Cohesion: 0.29
Nodes (7): Available Modules, Module Integration Examples, OpenHands-Inspired Modules (v3.0.0), Orchestrator Integration Points, Quality Evaluation, Security Pre-check, Stuck Detection

### Community 34 - "MUSUBI CLI Commands Reference"
Cohesion: 0.33
Nodes (6): Advanced Commands (v3.5.0 NEW), Core Workflow Commands, Detailed Command Options, MUSUBI CLI Commands Reference, Replanning Commands (v3.6.0 NEW), Supporting Commands

### Community 35 - "Managed Agents Overview (25 Types)"
Cohesion: 0.33
Nodes (6): Design & Architecture (5 agents), Development & Quality (7 agents), Managed Agents Overview (25 Types), Operations & Infrastructure (5 agents), Orchestration & Governance (3 agents), Specialized Experts (5 agents)

### Community 36 - "Agent Selection Logic"
Cohesion: 0.40
Nodes (5): Agent Selection Logic, Agent Selection Matrix, ステップ1: リクエストタイプの分類, ステップ2: 複雑度評価, ステップ3: 依存関係マッピング

### Community 37 - "Orchestratorの役割（対話モード時）"
Cohesion: 0.40
Nodes (5): Orchestratorの役割（対話モード時）, パターンA: 単一エージェント実行, パターンB: 複数エージェント連携（順次実行）, パターンC: 並列実行可能な複数エージェント, 重要：対話モードについて

### Community 38 - "ファイル出力要件"
Cohesion: 0.40
Nodes (5): ファイル出力要件, ファイル命名規則, 出力ディレクトリ, 必須出力ファイル, 重要：ドキュメント作成の細分化ルール

### Community 39 - "標準ワークフロー"
Cohesion: 0.40
Nodes (5): ワークフロー1: 新機能開発（フルサイクル）, ワークフロー2: バグ修正（迅速対応）, ワークフロー3: セキュリティ強化, ワークフロー4: パフォーマンスチューニング, 標準ワークフロー

### Community 40 - "watchdog"
Cohesion: 0.12
Nodes (15): APP_URL, BACKUP_WATCHDOG_SECRET, jobs, watchdog, name, cron, env, name (+7 more)

### Community 41 - "types.ts"
Cohesion: 0.05
Nodes (52): DebtorBadge(), DebtorsView(), handleCollectWhatsApp(), FilterTab, groupRowsByContract(), SORT_OPTIONS, SortKey, TABS (+44 more)

### Community 42 - "providers.ts"
Cohesion: 0.14
Nodes (11): MessageSettings, MetaHealthResult, EvolutionApiProvider, MetaCloudApiProvider, parseResponse(), TwilioProvider, WhatsAppMessagePayload, WhatsAppProvider (+3 more)

### Community 43 - "campaign-queue.ts"
Cohesion: 0.19
Nodes (14): runWhatsAppCampaignBatch(), useLiveCampaignProgress(), loop(), WhatsAppCampaignMessageStatus, ALL_MESSAGE_STATUSES, buildTemplateParamsIfMeta(), CampaignBatchSummary, CampaignMessageStatusCounts (+6 more)

### Community 44 - "template.ts"
Cohesion: 0.25
Nodes (11): DispatchResult, dispatchWeeklyCharge(), formatDate(), sendCollectionReminder(), SendReminderResult, createWhatsAppProvider(), buildReminderTemplateParams(), renderReminderMessage() (+3 more)

### Community 45 - "spintax.ts"
Cohesion: 0.53
Nodes (5): CLOSINGS, pickClosing(), pickRandom(), resolveSpintax(), varyMessage()

### Community 46 - "@supabase/ssr"
Cohesion: 0.28
Nodes (5): @supabase/ssr@^0.12.4, @supabase/ssr, updateSession(), config, proxy()

### Community 48 - "recalculateContractStatus"
Cohesion: 0.50
Nodes (4): updateInstallmentStatus(), recalculateContractStatus(), syncWeeklyChargeStatus(), ContractStatus

### Community 49 - "imei.ts"
Cohesion: 0.70
Nodes (3): IMEI_PATTERN, isValidImei(), normalizeImei()

### Community 50 - "file-validation.ts"
Cohesion: 0.67
Nodes (3): bytesStartWith(), DetectedFileType, detectSafeDocumentType()

### Community 51 - "next.config.ts"
Cohesion: 0.50
Nodes (3): CONTENT_SECURITY_POLICY, nextConfig, SECURITY_HEADERS

## Knowledge Gaps
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `new-transaction-dialog.tsx` to `cn`, `(app)/page.tsx`, `app-nav.tsx`, `actions.ts`, `createClient`, `dependencies`, `types.ts`, `package.json`, `@supabase/ssr`, `financial-rules.ts`, `next.config.ts`, `app/layout.tsx`, `server.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06330532212885154 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `cn`, `(app)/page.tsx`, `app-nav.tsx`, `actions.ts`, `types.ts`, `campaign-queue.ts`, `recalculateContractStatus`, `financial-rules.ts`, `debtors.ts`, `server.ts`, `evolution-instance.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `(app)/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055087719298245616 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `new-transaction-dialog.tsx` to `cn`, `(app)/page.tsx`, `app-nav.tsx`, `dependencies`, `types.ts`, `package.json`, `financial-rules.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0990990990990991 - nodes in this community are weakly interconnected._
- **Should `backup.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08055152394775036 - nodes in this community are weakly interconnected._