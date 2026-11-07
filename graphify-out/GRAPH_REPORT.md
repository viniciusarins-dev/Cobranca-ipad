# Graph Report - Cobranca-ipad  (2026-11-07)

## Corpus Check
- 165 files · ~85,291 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 1, .example 1, .toml 1)

## Summary
- 1015 nodes · 3350 edges · 59 communities (47 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `26ca61fb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- roundCents
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
- disconnectWhatsAppEvolution
- AGENTS.md
- CLAUDE.md
- Orchestrator AI - Specification Driven Development
- template.ts
- postcss.config.mjs
- vercel.json
- server.ts
- CodeGraph MCP Server Integration
- [id]/page.tsx
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
- auth-actions.ts
- debtors-view.tsx
- spintax.ts
- campaign-recipients.ts
- zod
- installments.ts
- imei.ts
- uploadClientDocument
- vitest
- class-variance-authority
- @radix-ui/react-checkbox
- @radix-ui/react-label
- @radix-ui/react-dialog
- @radix-ui/react-slot
- tw-animate-css@^1.4.0
- react-dom@19.2.8

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
- `CardFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/card.tsx → src/lib/utils.ts
- `BackupsPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(app)/backups/page.tsx → src/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (59 total, 12 thin omitted)

### Community 0 - "cn"
Cohesion: 0.07
Nodes (75): runWhatsAppCampaignBatch(), BackupsPage(), dynamic, formatBytes(), formatDuration(), hoursSince(), tierLabel(), ClientesPage() (+67 more)

### Community 1 - "roundCents"
Cohesion: 0.12
Nodes (31): FinancialReportRow, getFinancialReport(), DashboardPage(), DashboardPageContract, dynamic, addToPeriod(), computeDashboardMetrics(), DashboardContractInput (+23 more)

### Community 2 - "app-nav.tsx"
Cohesion: 0.29
Nodes (9): AppShellLayout(), AppNav(), BrandMark(), FINANCEIRO_ITEMS, LOJA_ITEMS, NavGroup(), NavItem, SidebarContent() (+1 more)

### Community 3 - "new-transaction-dialog.tsx"
Cohesion: 0.17
Nodes (55): @hookform/resolvers, lucide-react, react, react-hook-form, sonner, EditAddressDialog(), FilterBar(), ContractSummary (+47 more)

### Community 4 - "actions.ts"
Cohesion: 0.10
Nodes (35): buildFinancialReportReference(), ContractSettlementSummary, FinancialReportPaymentRow, FinancialReportSummary, SettlementContractRow, CampaignPreviewInput, campaignPreviewSchema, ClientAddressInput (+27 more)

### Community 5 - "backup.mjs"
Cohesion: 0.08
Nodes (38): @aws-sdk/client-s3, main(), reportResult(), requireEnv(), downloadAllDocuments(), walk(), decryptBuffer(), encryptBuffer() (+30 more)

### Community 6 - "env"
Cohesion: 0.06
Nodes (30): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, APP_URL, BACKUP_ENCRYPTION_KEY (+22 more)

### Community 7 - "createClient"
Cohesion: 0.18
Nodes (32): buildSettlementInstallmentInputs(), cancelWhatsAppCampaign(), createTransaction(), createWhatsAppCampaign(), deleteContract(), getContractSettlementSummary(), getCurrentUserEmail(), getCurrentUserId() (+24 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, clsx@^2.1.1, @hookform/resolvers@^5.7.1, lucide-react@^1.31.0, next@16.3.5, @radix-ui/react-dropdown-menu@^2.1.24, @radix-ui/react-tabs@^1.1.21, react@19.2.8 (+9 more)

### Community 10 - "Agent Selection Matrix (25 Skills)"
Cohesion: 0.09
Nodes (21): Additional Skills (Beyond Original 25), Agent Selection Matrix (25 Skills), By SDD Workflow Stage, By Task Type, Category 1: Orchestration & Management (3 Skills), Category 2: Requirements & Planning (3 Skills), Category 3: Architecture & Design (4 Skills), Category 4: Development & Implementation (2 Skills) (+13 more)

### Community 11 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^22, @types/react@^19, @types/react-dom@^19, typescript@^5, vitest@^5.0.5 (+6 more)

### Community 12 - "package.json"
Cohesion: 0.17
Nodes (11): date-fns@^4.4.0, @radix-ui/react-select@^2.3.7, @radix-ui/react-switch@^1.3.7, @supabase/supabase-js@^2.112.3, @supabase/supabase-js, name, private, version (+3 more)

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
Cohesion: 0.18
Nodes (18): allocateSettlement(), calculateFinancedAmount(), calculateRenewalInterest(), DEFAULT_LOAN_INTEREST_RATE_PERCENT, FinancedAmountInput, FinancedAmountResult, LATE_INTEREST_RATE_PER_DAY, LateInterestInstallmentInput (+10 more)

### Community 20 - "app/layout.tsx"
Cohesion: 0.23
Nodes (8): cinzel, geistMono, inter, metadata, RootLayout(), viewport, AuroraBackground(), Toaster()

### Community 21 - "disconnectWhatsAppEvolution"
Cohesion: 0.67
Nodes (3): disconnectWhatsAppEvolution(), handleDisconnect(), logoutEvolutionInstance()

### Community 23 - "CLAUDE.md"
Cohesion: 0.40
Nodes (4): graphify, how graphify, orchestrator and security tooling fit together, orchestrator (MUSUBI skill) — automatic triggering policy, security tooling (Strix / Claude Security)

### Community 24 - "Orchestrator AI - Specification Driven Development"
Cohesion: 0.20
Nodes (9): Before Starting Orchestration, Benefits, Guardrails Commands (v3.9.0 NEW), Language Preference Policy, Orchestrator AI - Specification Driven Development, Project Memory (Steering System), Role Definition, Your Responsibilities (+1 more)

### Community 25 - "template.ts"
Cohesion: 0.15
Nodes (22): sendReminderAction(), Debtor, DebtorSourceInstallment, groupDebtorsByClient(), LateInterestDetailRow, client(), installmentRow(), REF (+14 more)

### Community 28 - "server.ts"
Cohesion: 0.06
Nodes (46): CONTENT_SECURITY_POLICY, nextConfig, SECURITY_HEADERS, @supabase/ssr@^0.12.4, next, @supabase/ssr, dynamic, POST() (+38 more)

### Community 29 - "CodeGraph MCP Server Integration"
Cohesion: 0.20
Nodes (10): CodeGraph MCP Server Integration, CodeGraph MCP インストール・設定, CodeGraph活用ワークフロー, Step 1: 環境確認, Step 2: インストール実行, Step 3: プロジェクトインデックス作成, Step 4: 設定ファイル作成（オプション選択）, プロジェクトのインデックス作成 (+2 more)

### Community 30 - "[id]/page.tsx"
Cohesion: 0.07
Nodes (45): buildEvolutionWebhookUrl(), connectWhatsAppEvolution(), getWhatsAppConnectionStatus(), ContractDetailPage(), dynamic, BrandMark(), dynamic, LoginPage() (+37 more)

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
Cohesion: 0.09
Nodes (28): BACKUP_RUN_LABELS, BACKUP_RUN_VARIANT, CAMPAIGN_MESSAGE_VARIANT, CAMPAIGN_VARIANT, CONTRACT_TYPE_VARIANT, CONTRACT_VARIANT, INSTALLMENT_VARIANT, BackupRun (+20 more)

### Community 42 - "providers.ts"
Cohesion: 0.10
Nodes (25): sendTestMessage(), handleTestSend(), MessageSettings, WhatsAppCampaignMessageStatus, onlyDigits(), ALL_MESSAGE_STATUSES, buildTemplateParamsIfMeta(), CampaignBatchSummary (+17 more)

### Community 43 - "auth-actions.ts"
Cohesion: 0.20
Nodes (11): ActionResult, clientIp(), signIn(), signOut(), AuditLogEntry, Bucket, buckets, checkRateLimit() (+3 more)

### Community 44 - "debtors-view.tsx"
Cohesion: 0.11
Nodes (28): markReminderOpened(), DebtorBadge(), DebtorsView(), handleCollectWhatsApp(), FilterTab, groupRowsByContract(), SORT_OPTIONS, SortKey (+20 more)

### Community 45 - "spintax.ts"
Cohesion: 0.53
Nodes (5): CLOSINGS, pickClosing(), pickRandom(), resolveSpintax(), varyMessage()

### Community 46 - "campaign-recipients.ts"
Cohesion: 0.21
Nodes (12): previewWhatsAppCampaign(), handlePreview(), WhatsAppCampaignFilterType, toWhatsAppDigits(), CampaignCandidate, CampaignCandidatesResult, CampaignExclusion, ContractRow (+4 more)

### Community 48 - "installments.ts"
Cohesion: 0.31
Nodes (8): addPeriod(), GeneratedInstallment, generateInstallments(), nextDueDate(), reflowSchedule(), ScheduleInstallmentInput, splitAmount(), Periodicity

### Community 49 - "imei.ts"
Cohesion: 0.53
Nodes (4): updateIphoneSale(), IMEI_PATTERN, isValidImei(), normalizeImei()

### Community 50 - "uploadClientDocument"
Cohesion: 0.31
Nodes (8): deleteClientDocument(), uploadClientDocument(), DocumentSection(), handleRemove(), handleUpload(), bytesStartWith(), DetectedFileType, detectSafeDocumentType()

### Community 52 - "vitest"
Cohesion: 0.25
Nodes (4): vitest, PaymentHistoryProps, contract(), Payment

## Knowledge Gaps
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `server.ts` to `cn`, `roundCents`, `app-nav.tsx`, `new-transaction-dialog.tsx`, `actions.ts`, `dependencies`, `auth-actions.ts`, `package.json`, `debtors-view.tsx`, `app/layout.tsx`, `[id]/page.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06929373691224062 - nodes in this community are weakly interconnected._
- **Why does `formatCurrency()` connect `new-transaction-dialog.tsx` to `cn`, `actions.ts`, `createClient`, `debtors-view.tsx`, `template.ts`, `[id]/page.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `roundCents` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `cn`, `roundCents`, `app-nav.tsx`, `actions.ts`, `providers.ts`, `auth-actions.ts`, `debtors-view.tsx`, `campaign-recipients.ts`, `imei.ts`, `uploadClientDocument`, `disconnectWhatsAppEvolution`, `template.ts`, `server.ts`, `[id]/page.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0990990990990991 - nodes in this community are weakly interconnected._
- **Should `backup.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07826694619147449 - nodes in this community are weakly interconnected._