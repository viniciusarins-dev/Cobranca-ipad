# Graph Report - Cobranca-ipad  (2026-10-28)

## Corpus Check
- 138 files · ~63,312 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 833 nodes · 2492 edges · 47 communities (37 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e6f29997`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- debtors.ts
- providers.ts
- new-transaction-dialog.tsx
- actions.ts
- backup.mjs
- env
- @radix-ui/react-dialog
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
- @supabase/ssr
- loading.tsx
- app/layout.tsx
- debtors-view.tsx
- AGENTS.md
- CLAUDE.md
- Orchestrator AI - Specification Driven Development
- types.ts
- postcss.config.mjs
- vercel.json
- @radix-ui/react-dropdown-menu
- CodeGraph MCP Server Integration
- debtors.test.ts
- 🇬🇧 English Welcome Message
- Workflow Engine Integration (v2.1.0)
- Module Integration Examples
- MUSUBI CLI Commands Reference
- Managed Agents Overview (25 Types)
- Agent Selection Logic
- Orchestratorの役割（対話モード時）
- ファイル出力要件
- 標準ワークフロー
- @radix-ui/react-tabs
- @supabase/supabase-js@^2.112.3
- server.ts
- next.config.ts
- dispatch-weekly-charge.ts
- @radix-ui/react-select
- zod

## God Nodes (most connected - your core abstractions)
1. `cn()` - 65 edges
2. `createClient()` - 42 edges
3. `react` - 37 edges
4. `formatCurrency()` - 36 edges
5. `roundCents()` - 35 edges
6. `Button()` - 34 edges
7. `next` - 32 edges
8. `lucide-react` - 31 edges
9. `Input()` - 29 edges
10. `RegisterPaymentDialog()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `handleConfirm()` --calls--> `deleteContract()`  [EXTRACTED]
  src/components/delete-contract-dialog.tsx → src/app/actions.ts
- `BackupsPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(app)/backups/page.tsx → src/lib/supabase/server.ts
- `BackupsPage()` --calls--> `formatDateTime()`  [EXTRACTED]
  src/app/(app)/backups/page.tsx → src/lib/utils.ts
- `ClientesPage()` --calls--> `ExpenseDialog()`  [EXTRACTED]
  src/app/(app)/clientes/page.tsx → src/components/expense-dialog.tsx
- `ClientesPage()` --calls--> `NewTransactionDialog()`  [EXTRACTED]
  src/app/(app)/clientes/page.tsx → src/components/new-transaction-dialog.tsx

## Import Cycles
- None detected.

## Communities (47 total, 10 thin omitted)

### Community 0 - "cn"
Cohesion: 0.06
Nodes (75): BackupsPage(), dynamic, formatBytes(), formatDuration(), hoursSince(), tierLabel(), ClientesPage(), dynamic (+67 more)

### Community 1 - "debtors.ts"
Cohesion: 0.26
Nodes (14): getBusinessToday(), Debtor, DebtorInstallmentRow, getTodayDebtors(), calculateLateInterest(), daysLate(), WeeklyChargeWithRelations, Client (+6 more)

### Community 2 - "providers.ts"
Cohesion: 0.14
Nodes (13): dynamic, SettingsPage(), MessageSettings, onlyDigits(), EvolutionApiProvider, MetaCloudApiProvider, parseResponse(), TwilioProvider (+5 more)

### Community 3 - "new-transaction-dialog.tsx"
Cohesion: 0.11
Nodes (71): @hookform/resolvers, lucide-react, next, react, react-hook-form, sonner, sendTestMessage(), EditAddressDialog() (+63 more)

### Community 4 - "actions.ts"
Cohesion: 0.08
Nodes (59): ActionResult, buildSettlementInstallmentInputs(), ContractSettlementSummary, createTransaction(), deleteClientDocument(), deleteContract(), getContractSettlementSummary(), getCurrentUserEmail() (+51 more)

### Community 5 - "backup.mjs"
Cohesion: 0.08
Nodes (38): @aws-sdk/client-s3, main(), reportResult(), requireEnv(), downloadAllDocuments(), walk(), decryptBuffer(), encryptBuffer() (+30 more)

### Community 6 - "env"
Cohesion: 0.06
Nodes (30): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, APP_URL, BACKUP_ENCRYPTION_KEY (+22 more)

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

### Community 18 - "@supabase/ssr"
Cohesion: 0.28
Nodes (5): @supabase/ssr@^0.12.4, @supabase/ssr, updateSession(), config, proxy()

### Community 20 - "app/layout.tsx"
Cohesion: 0.23
Nodes (8): cinzel, geistMono, inter, metadata, RootLayout(), viewport, AuroraBackground(), Toaster()

### Community 21 - "debtors-view.tsx"
Cohesion: 0.18
Nodes (23): markReminderOpened(), DebtorBadge(), DebtorsView(), handleCollectWhatsApp(), FilterTab, groupRowsByContract(), SORT_OPTIONS, SortKey (+15 more)

### Community 23 - "CLAUDE.md"
Cohesion: 0.40
Nodes (4): graphify, how graphify, orchestrator and security tooling fit together, orchestrator (MUSUBI skill) — automatic triggering policy, security tooling (Strix / Claude Security)

### Community 24 - "Orchestrator AI - Specification Driven Development"
Cohesion: 0.20
Nodes (9): Before Starting Orchestration, Benefits, Guardrails Commands (v3.9.0 NEW), Language Preference Policy, Orchestrator AI - Specification Driven Development, Project Memory (Steering System), Role Definition, Your Responsibilities (+1 more)

### Community 25 - "types.ts"
Cohesion: 0.05
Nodes (53): BACKUP_RUN_LABELS, BACKUP_RUN_VARIANT, CONTRACT_TYPE_VARIANT, CONTRACT_VARIANT, INSTALLMENT_VARIANT, addToPeriod(), computeDashboardMetrics(), DashboardMetrics (+45 more)

### Community 29 - "CodeGraph MCP Server Integration"
Cohesion: 0.20
Nodes (10): CodeGraph MCP Server Integration, CodeGraph MCP インストール・設定, CodeGraph活用ワークフロー, Step 1: 環境確認, Step 2: インストール実行, Step 3: プロジェクトインデックス作成, Step 4: 設定ファイル作成（オプション選択）, プロジェクトのインデックス作成 (+2 more)

### Community 30 - "debtors.test.ts"
Cohesion: 0.15
Nodes (7): vitest, handleSendReminder(), client(), contract(), mockSupabase(), overdueDateStr, todayStr

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

### Community 42 - "server.ts"
Cohesion: 0.10
Nodes (28): dynamic, POST(), reportSchema, dynamic, GET(), dynamic, GET(), maxDuration (+20 more)

### Community 44 - "next.config.ts"
Cohesion: 0.50
Nodes (3): CONTENT_SECURITY_POLICY, nextConfig, SECURITY_HEADERS

### Community 47 - "dispatch-weekly-charge.ts"
Cohesion: 0.26
Nodes (12): DispatchResult, dispatchWeeklyCharge(), sendCollectionReminder(), SendReminderResult, createWhatsAppProvider(), CLOSINGS, pickClosing(), pickRandom() (+4 more)

## Knowledge Gaps
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `new-transaction-dialog.tsx` to `cn`, `providers.ts`, `actions.ts`, `dependencies`, `server.ts`, `next.config.ts`, `package.json`, `@supabase/ssr`, `app/layout.tsx`, `debtors-view.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06202020202020202 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `new-transaction-dialog.tsx`, `actions.ts`, `debtors-view.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `providers.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13846153846153847 - nodes in this community are weakly interconnected._
- **Should `new-transaction-dialog.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11019036954087345 - nodes in this community are weakly interconnected._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07867494824016563 - nodes in this community are weakly interconnected._
- **Should `backup.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07826694619147449 - nodes in this community are weakly interconnected._