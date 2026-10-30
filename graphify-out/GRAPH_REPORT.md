# Graph Report - Cobranca-ipad  (2026-10-30)

## Corpus Check
- 150 files · ~75,549 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 1, .example 1, .toml 1)

## Summary
- 922 nodes · 2839 edges · 57 communities (44 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f51ac59`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- dashboard-metrics.ts
- whatsapp-reminder-link.ts
- new-transaction-dialog.tsx
- actions.ts
- backup.mjs
- env
- createClient
- compilerOptions
- dependencies
- Agent Selection Matrix (25 Skills)
- devDependencies
- @radix-ui/react-select
- Backup automático — configuração e restauração
- Orchestration Patterns
- manifest.json
- eslint.config.mjs
- scripts
- financial-rules.ts
- loading.tsx
- app/layout.tsx
- roundCents
- AGENTS.md
- CLAUDE.md
- Orchestrator AI - Specification Driven Development
- vitest
- postcss.config.mjs
- vercel.json
- server.ts
- CodeGraph MCP Server Integration
- debtors.ts
- 🇬🇧 English Welcome Message
- Workflow Engine Integration (v2.1.0)
- Module Integration Examples
- MUSUBI CLI Commands Reference
- Managed Agents Overview (25 Types)
- Agent Selection Logic
- Orchestratorの役割（対話モード時）
- ファイル出力要件
- 標準ワークフロー
- types.ts
- auth-actions.ts
- providers.ts
- @radix-ui/react-checkbox
- @supabase/ssr
- evolution-instance.ts
- campaign-recipients.ts
- zod
- installments.ts
- imei.ts
- file-validation.ts
- @radix-ui/react-label
- date-fns
- @radix-ui/react-dialog
- react-dom@19.2.8
- @supabase/supabase-js@^2.112.3
- tw-animate-css@^1.4.0

## God Nodes (most connected - your core abstractions)
1. `cn()` - 65 edges
2. `createClient()` - 54 edges
3. `formatCurrency()` - 40 edges
4. `react` - 39 edges
5. `Button()` - 38 edges
6. `roundCents()` - 37 edges
7. `next` - 35 edges
8. `lucide-react` - 33 edges
9. `Input()` - 29 edges
10. `DialogContent()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `BackupsPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(app)/backups/page.tsx → src/lib/supabase/server.ts
- `ClientesPage()` --calls--> `ExpenseDialog()`  [EXTRACTED]
  src/app/(app)/clientes/page.tsx → src/components/expense-dialog.tsx
- `ClientesPage()` --calls--> `NewTransactionDialog()`  [EXTRACTED]
  src/app/(app)/clientes/page.tsx → src/components/new-transaction-dialog.tsx
- `ClientesPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(app)/clientes/page.tsx → src/lib/supabase/server.ts
- `ContractDetailPage()` --calls--> `DeleteContractDialog()`  [EXTRACTED]
  src/app/(app)/contracts/[id]/page.tsx → src/components/delete-contract-dialog.tsx

## Import Cycles
- None detected.

## Communities (57 total, 13 thin omitted)

### Community 0 - "cn"
Cohesion: 0.06
Nodes (92): markReminderOpened(), BackupsPage(), dynamic, formatBytes(), formatDuration(), hoursSince(), tierLabel(), ClientesPage() (+84 more)

### Community 1 - "dashboard-metrics.ts"
Cohesion: 0.12
Nodes (27): DashboardPage(), DashboardPageContract, dynamic, PaymentHistoryProps, addToPeriod(), computeDashboardMetrics(), DashboardContractInput, DashboardExpenseInput (+19 more)

### Community 2 - "whatsapp-reminder-link.ts"
Cohesion: 0.17
Nodes (9): contract(), IphoneSale, IphoneSalesSummary, Contract, Phone, ConsolidatedReminderRow, ReminderContract, ReminderInstallment (+1 more)

### Community 3 - "new-transaction-dialog.tsx"
Cohesion: 0.15
Nodes (57): @hookform/resolvers, lucide-react, react, react-hook-form, sonner, sendTestMessage(), dynamic, SettingsPage() (+49 more)

### Community 4 - "actions.ts"
Cohesion: 0.11
Nodes (32): ContractSettlementSummary, previewWhatsAppCampaign(), SettlementContractRow, CampaignPreviewInput, campaignPreviewSchema, ClientAddressInput, clientAddressSchema, ClientInfoInput (+24 more)

### Community 5 - "backup.mjs"
Cohesion: 0.08
Nodes (38): @aws-sdk/client-s3, main(), reportResult(), requireEnv(), downloadAllDocuments(), walk(), decryptBuffer(), encryptBuffer() (+30 more)

### Community 6 - "env"
Cohesion: 0.06
Nodes (30): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, APP_URL, BACKUP_ENCRYPTION_KEY (+22 more)

### Community 7 - "createClient"
Cohesion: 0.18
Nodes (30): cancelWhatsAppCampaign(), createTransaction(), createWhatsAppCampaign(), deleteClientDocument(), deleteContract(), getCurrentUserEmail(), getCurrentUserId(), pauseWhatsAppCampaign() (+22 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, @hookform/resolvers@^5.7.1, lucide-react@^1.31.0, next@16.3.5, @radix-ui/react-dropdown-menu@^2.1.24, @radix-ui/react-slot@^1.3.3 (+13 more)

### Community 10 - "Agent Selection Matrix (25 Skills)"
Cohesion: 0.09
Nodes (21): Additional Skills (Beyond Original 25), Agent Selection Matrix (25 Skills), By SDD Workflow Stage, By Task Type, Category 1: Orchestration & Management (3 Skills), Category 2: Requirements & Planning (3 Skills), Category 3: Architecture & Design (4 Skills), Category 4: Development & Implementation (2 Skills) (+13 more)

### Community 11 - "devDependencies"
Cohesion: 0.16
Nodes (16): devDependencies, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^22, @types/react@^19, @types/react-dom@^19, typescript@^5, name (+8 more)

### Community 12 - "@radix-ui/react-select"
Cohesion: 0.33
Nodes (4): @radix-ui/react-select@^2.3.7, @radix-ui/react-switch@^1.3.7, @radix-ui/react-select, @radix-ui/react-switch

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
Cohesion: 0.24
Nodes (10): DEFAULT_LOAN_INTEREST_RATE_PERCENT, FinancedAmountInput, FinancedAmountResult, LATE_INTEREST_RATE_PER_DAY, LateInterestInstallmentInput, SettlementAllocation, SettlementAllocationResult, SplitPaymentResult (+2 more)

### Community 20 - "app/layout.tsx"
Cohesion: 0.23
Nodes (8): cinzel, geistMono, inter, metadata, RootLayout(), viewport, AuroraBackground(), Toaster()

### Community 21 - "roundCents"
Cohesion: 0.26
Nodes (14): buildSettlementInstallmentInputs(), getContractSettlementSummary(), payDownContractBalance(), recalculateContractStatus(), registerPayment(), settleContract(), syncWeeklyChargeStatus(), allocateSettlement() (+6 more)

### Community 23 - "CLAUDE.md"
Cohesion: 0.40
Nodes (4): graphify, how graphify, orchestrator and security tooling fit together, orchestrator (MUSUBI skill) — automatic triggering policy, security tooling (Strix / Claude Security)

### Community 24 - "Orchestrator AI - Specification Driven Development"
Cohesion: 0.20
Nodes (9): Before Starting Orchestration, Benefits, Guardrails Commands (v3.9.0 NEW), Language Preference Policy, Orchestrator AI - Specification Driven Development, Project Memory (Steering System), Role Definition, Your Responsibilities (+1 more)

### Community 25 - "vitest"
Cohesion: 0.25
Nodes (6): vitest@^5.0.5, vitest, DebtorSourceInstallment, client(), installmentRow(), REF

### Community 28 - "server.ts"
Cohesion: 0.07
Nodes (38): CONTENT_SECURITY_POLICY, nextConfig, SECURITY_HEADERS, next, sendReminderAction(), dynamic, POST(), reportSchema (+30 more)

### Community 29 - "CodeGraph MCP Server Integration"
Cohesion: 0.20
Nodes (10): CodeGraph MCP Server Integration, CodeGraph MCP インストール・設定, CodeGraph活用ワークフロー, Step 1: 環境確認, Step 2: インストール実行, Step 3: プロジェクトインデックス作成, Step 4: 設定ファイル作成（オプション選択）, プロジェクトのインデックス作成 (+2 more)

### Community 30 - "debtors.ts"
Cohesion: 0.19
Nodes (15): Debtor, DebtorInstallmentRow, LateInterestDetailRow, PaidTodayRow, daysLate(), DispatchResult, WeeklyChargeWithRelations, Client (+7 more)

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

### Community 40 - "types.ts"
Cohesion: 0.09
Nodes (22): BackupRun, BackupRunStatus, CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS, ContractWithClient, ContractWithInstallments, Expense, INSTALLMENT_STATUS_LABELS (+14 more)

### Community 41 - "auth-actions.ts"
Cohesion: 0.22
Nodes (10): ActionResult, clientIp(), signIn(), AuditLogEntry, Bucket, buckets, checkRateLimit(), resetRateLimit() (+2 more)

### Community 42 - "providers.ts"
Cohesion: 0.06
Nodes (43): runWhatsAppCampaignBatch(), sendBackupFailureAlert(), dispatchWeeklyCharge(), getBrazilDateInfo(), getBrazilDateString(), getBrazilIsoWeekday(), isWithinDispatchWindow(), WEEKDAY_TO_ISO (+35 more)

### Community 45 - "evolution-instance.ts"
Cohesion: 0.22
Nodes (12): buildEvolutionWebhookUrl(), connectWhatsAppEvolution(), disconnectWhatsAppEvolution(), createEvolutionInstance(), CreateInstanceResult, EvolutionAdminConfig, extractInstanceToken(), getEvolutionAdminConfig() (+4 more)

### Community 46 - "campaign-recipients.ts"
Cohesion: 0.27
Nodes (10): getTodayDebtors(), groupDebtorsByClient(), WhatsAppCampaignFilterType, CampaignCandidate, CampaignCandidatesResult, CampaignExclusion, ContractRow, fetchOpenContracts() (+2 more)

### Community 48 - "installments.ts"
Cohesion: 0.31
Nodes (8): addPeriod(), GeneratedInstallment, generateInstallments(), nextDueDate(), reflowSchedule(), ScheduleInstallmentInput, splitAmount(), Periodicity

### Community 49 - "imei.ts"
Cohesion: 0.70
Nodes (3): IMEI_PATTERN, isValidImei(), normalizeImei()

### Community 50 - "file-validation.ts"
Cohesion: 0.67
Nodes (3): bytesStartWith(), DetectedFileType, detectSafeDocumentType()

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `server.ts` to `cn`, `dashboard-metrics.ts`, `new-transaction-dialog.tsx`, `actions.ts`, `dependencies`, `auth-actions.ts`, `devDependencies`, `app/layout.tsx`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.0561624649859944 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `new-transaction-dialog.tsx`, `server.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `dashboard-metrics.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12096774193548387 - nodes in this community are weakly interconnected._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11051693404634581 - nodes in this community are weakly interconnected._
- **Should `backup.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07826694619147449 - nodes in this community are weakly interconnected._
- **Should `env` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._