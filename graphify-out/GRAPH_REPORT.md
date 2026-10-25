# Graph Report - Cobranca-ipad  (2026-10-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 640 nodes · 2158 edges · 28 communities (18 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f5efd6f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27

## God Nodes (most connected - your core abstractions)
1. `cn()` - 65 edges
2. `createClient()` - 40 edges
3. `react` - 36 edges
4. `formatCurrency()` - 30 edges
5. `next` - 30 edges
6. `lucide-react` - 29 edges
7. `Button()` - 28 edges
8. `Input()` - 27 edges
9. `roundCents()` - 26 edges
10. `RegisterPaymentDialog()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `CardFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/card.tsx → src/lib/utils.ts
- `@supabase/supabase-js@^2.112.3` --declares--> `@supabase/supabase-js`  [EXTRACTED]
  scripts/backup/package.json → package.json
- `PaymentHistoryProps` --references--> `Payment`  [EXTRACTED]
  src/components/payment-history.tsx → src/lib/types.ts
- `FinancedAmountInput` --references--> `ContractType`  [EXTRACTED]
  src/lib/financial-rules.ts → src/lib/types.ts
- `BackupsPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(app)/backups/page.tsx → src/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (28 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (73): BackupsPage(), dynamic, formatBytes(), formatDuration(), hoursSince(), tierLabel(), ClientesPage(), dynamic (+65 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (77): markReminderOpened(), DashboardPage(), dynamic, InstallmentRow(), handleSendReminder(), InstallmentsGrid(), ReminderClient, ReminderContract (+69 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (45): sendTestMessage(), handleTestSend(), toBusinessDateString(), DispatchResult, dispatchWeeklyCharge(), getBrazilDateInfo(), getBrazilDateString(), getBrazilIsoWeekday() (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (44): @hookform/resolvers, lucide-react, react, react-hook-form, sonner, EditAddressDialog(), FilterBar(), ContractSummary (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (58): ActionResult, createTransaction(), deleteClientDocument(), deleteContract(), getCurrentUserEmail(), getCurrentUserId(), recalculateContractStatus(), registerExpense() (+50 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (39): @supabase/supabase-js@^2.112.3, @supabase/supabase-js, @aws-sdk/client-s3, main(), reportResult(), requireEnv(), downloadAllDocuments(), walk() (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (30): runs-on, steps, timeout-minutes, concurrency, cancel-in-progress, group, APP_URL, BACKUP_ENCRYPTION_KEY (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (19): CONTENT_SECURITY_POLICY, nextConfig, SECURITY_HEADERS, next, dynamic, POST(), reportSchema, dynamic (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (17): dependencies, date-fns@^4.4.0, @hookform/resolvers@^5.7.1, lucide-react@^1.31.0, next@16.3.5, @radix-ui/react-select@^2.3.7, react@19.2.8, react-dom@19.2.8 (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.26
Nodes (14): BrandMark(), dynamic, LoginPage(), ClientDetailsCard(), formatAddress(), DashboardOverview(), Card(), CardContent() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (13): devDependencies, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^20, @types/react@^19, @types/react-dom@^19, typescript@^5, tailwindcss (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (11): clsx@^2.1.1, @radix-ui/react-dropdown-menu@^2.1.24, @radix-ui/react-switch@^1.3.7, tailwind-merge@^3.6.0, name, private, version, clsx (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (8): cinzel, geistMono, inter, metadata, RootLayout(), viewport, AuroraBackground(), Toaster()

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (9): AppShellLayout(), AppNav(), BrandMark(), FINANCEIRO_ITEMS, LOJA_ITEMS, NavGroup(), NavItem, SidebarContent() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.3.0, eslint, eslint-config-next

### Community 17 - "Community 17"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Community 7` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06444444444444444 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `Community 5` to `Community 12`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05381400208986416 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Community 0` to `Community 1`, `Community 10`, `Community 3`, `Community 14`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0648018648018648 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.07787698412698413 - nodes in this community are weakly interconnected._