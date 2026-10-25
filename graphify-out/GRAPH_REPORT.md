# Graph Report - Cobranca-ipad  (2026-10-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 671 nodes · 2179 edges · 32 communities (18 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed0965d2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- types.ts
- providers.ts
- new-transaction-dialog.tsx
- actions.ts
- backup.mjs
- env
- next
- compilerOptions
- dependencies
- dashboard-overview.tsx
- devDependencies
- package.json
- Backup automático — configuração e restauração
- app-nav.tsx
- manifest.json
- eslint.config.mjs
- scripts
- @supabase/ssr
- loading.tsx
- @radix-ui/react-checkbox
- @radix-ui/react-dialog
- AGENTS.md
- CLAUDE.md
- date-fns
- @radix-ui/react-dropdown-menu
- postcss.config.mjs
- vercel.json
- react-dom@19.2.8
- recharts
- @supabase/supabase-js@^2.112.3
- zod

## God Nodes (most connected - your core abstractions)
1. `cn()` - 65 edges
2. `createClient()` - 40 edges
3. `react` - 35 edges
4. `formatCurrency()` - 30 edges
5. `next` - 30 edges
6. `lucide-react` - 29 edges
7. `Button()` - 28 edges
8. `Input()` - 27 edges
9. `RegisterPaymentDialog()` - 26 edges
10. `roundCents()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `CardFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/card.tsx → src/lib/utils.ts
- `PaymentHistoryProps` --references--> `Payment`  [EXTRACTED]
  src/components/payment-history.tsx → src/lib/types.ts
- `FinancedAmountInput` --references--> `ContractType`  [EXTRACTED]
  src/lib/financial-rules.ts → src/lib/types.ts
- `markReminderOpened()` --calls--> `createClient()`  [EXTRACTED]
  src/app/actions.ts → src/lib/supabase/server.ts
- `BackupsPage()` --calls--> `GradientHeading()`  [EXTRACTED]
  src/app/(app)/backups/page.tsx → src/components/ui/gradient-heading.tsx

## Import Cycles
- None detected.

## Communities (32 total, 14 thin omitted)

### Community 0 - "cn"
Cohesion: 0.07
Nodes (72): markReminderOpened(), BackupsPage(), dynamic, formatBytes(), formatDuration(), hoursSince(), tierLabel(), ContractDetailPage() (+64 more)

### Community 1 - "types.ts"
Cohesion: 0.07
Nodes (59): ClientesPage(), dynamic, DebtorsPage(), dynamic, DashboardPage(), dynamic, dynamic, PhonesPage() (+51 more)

### Community 2 - "providers.ts"
Cohesion: 0.07
Nodes (42): DispatchResult, dispatchWeeklyCharge(), getBrazilDateInfo(), getBrazilDateString(), getBrazilIsoWeekday(), isWithinDispatchWindow(), WEEKDAY_TO_ISO, delayForProvider() (+34 more)

### Community 3 - "new-transaction-dialog.tsx"
Cohesion: 0.16
Nodes (50): @hookform/resolvers, lucide-react, react, react-hook-form, sonner, sendTestMessage(), EditAddressDialog(), FilterBar() (+42 more)

### Community 4 - "actions.ts"
Cohesion: 0.06
Nodes (72): ActionResult, createTransaction(), deleteClientDocument(), deleteContract(), getCurrentUserEmail(), getCurrentUserId(), recalculateContractStatus(), registerExpense() (+64 more)

### Community 5 - "backup.mjs"
Cohesion: 0.08
Nodes (38): @aws-sdk/client-s3, main(), reportResult(), requireEnv(), downloadAllDocuments(), walk(), decryptBuffer(), encryptBuffer() (+30 more)

### Community 6 - "env"
Cohesion: 0.06
Nodes (30): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, APP_URL, BACKUP_ENCRYPTION_KEY (+22 more)

### Community 7 - "next"
Cohesion: 0.09
Nodes (26): CONTENT_SECURITY_POLICY, nextConfig, SECURITY_HEADERS, next, dynamic, POST(), reportSchema, dynamic (+18 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, clsx@^2.1.1, @hookform/resolvers@^5.7.1, lucide-react@^1.31.0, next@16.3.5, @radix-ui/react-slot@^1.3.3, @radix-ui/react-tabs@^1.1.21, react@19.2.8 (+9 more)

### Community 10 - "dashboard-overview.tsx"
Cohesion: 0.26
Nodes (14): BrandMark(), dynamic, LoginPage(), ClientDetailsCard(), formatAddress(), DashboardOverview(), Card(), CardContent() (+6 more)

### Community 11 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^20, @types/react@^19, @types/react-dom@^19, typescript@^5, tailwindcss (+5 more)

### Community 12 - "package.json"
Cohesion: 0.17
Nodes (11): class-variance-authority@^0.7.1, @radix-ui/react-label@^2.1.15, @radix-ui/react-select@^2.3.7, @radix-ui/react-switch@^1.3.7, name, private, version, class-variance-authority (+3 more)

### Community 13 - "Backup automático — configuração e restauração"
Cohesion: 0.07
Nodes (25): 1. Rodar a migration, 2. Criar a conta e o bucket no Cloudflare R2, 3. Pegar a connection string DIRETA do Postgres, 4. Gerar a chave de criptografia, 5. Configurar os GitHub Secrets, 6. Testar manualmente antes de confiar no agendamento, 7. Retenção, 8. Alertas de falha (+17 more)

### Community 14 - "app-nav.tsx"
Cohesion: 0.29
Nodes (9): AppShellLayout(), AppNav(), BrandMark(), FINANCEIRO_ITEMS, LOJA_ITEMS, NavGroup(), NavItem, SidebarContent() (+1 more)

### Community 15 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 16 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.3.0, eslint, eslint-config-next

### Community 17 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `cn`, `types.ts`, `new-transaction-dialog.tsx`, `actions.ts`, `dependencies`, `dashboard-overview.tsx`, `package.json`, `app-nav.tsx`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `types.ts`, `dashboard-overview.tsx`, `new-transaction-dialog.tsx`, `app-nav.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06621004566210045 - nodes in this community are weakly interconnected._
- **Should `providers.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06758832565284179 - nodes in this community are weakly interconnected._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0629746835443038 - nodes in this community are weakly interconnected._
- **Should `backup.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.07826694619147449 - nodes in this community are weakly interconnected._