# AGENTS.md

Loan management app built with **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict) + **Tailwind CSS 4**, using **Supabase** (auth + PostgreSQL with Row-Level Security) and **shadcn/v0** UI (Radix UI + lucide-react icons).

## ⚠️ Critical: Multi-Tenant & Row-Level Security

**Every database query to `clientes`, `prestamos`, or `configuracion_interes` MUST filter by the authenticated user's `user_id`.** This is enforced by Supabase RLS policies; queries that omit the filter will fail silently or return empty results. Always:
1. Call `supabase.auth.getUser()` to get the session user's ID
2. `.eq('user_id', user.id)` on every query
3. Include `user_id: user.id` when inserting/updating records

See the pattern in `src/lib/actions.ts` — replicate it exactly for new mutations.

## Project Structure

**The entire codebase lives in `src/`** — this is the working directory for all commands.

```
rv-prestamos-app/
├── src/                      ← Root of the project (all code, package.json, tsconfig, .env, npm commands)
│   ├── app/                  ← App Router (Next.js routing)
│   │   ├── (auth)/           ← /auth/login route
│   │   ├── dashboard/        ← /dashboard (home + tabs)
│   │   ├── clientes/[id]/    ← Client detail page
│   │   └── ajustes/          ← Settings (interest rate)
│   ├── components/           ← React components
│   │   ├── ui/               ← Shadcn primitives (Button, Card, Dialog, etc.)
│   │   ├── home/             ← Dashboard home component
│   │   ├── cliente-*.tsx     ← Client-related domain components
│   │   ├── prestamo-*.tsx    ← Loan-related domain components
│   │   └── dashboards/       ← Financial/Risk/Clients/Wallet analytics tabs
│   ├── lib/
│   │   ├── actions.ts        ← Server actions (mutations); all with 'use server' directive
│   │   ├── types.ts          ← Domain types (Cliente, Prestamo, FilterState, etc.)
│   │   ├── utils-clientes.ts ← Loan status logic, currency/date formatting (es-AR locale)
│   │   ├── features/         ← Feature flag registry & plan resolution
│   │   │   ├── registry.ts   ← REGISTRY, isFeatureEnabled(), getPlan() — must be Node-plain (no Next/Supabase imports)
│   │   │   ├── guard.ts      ← requireFeature(), withFeatureGuardResult() for server actions
│   │   │   └── providers/    ← EnvProvider, SupabasePlanProvider
│   │   └── supabase/         ← Supabase client creation (always per-request, never global)
│   │       ├── server.ts     ← createClient() for server actions
│   │       └── proxy.ts      ← Middleware session management (updateSession)
│   ├── scripts/
│   │   ├── *.sql             ← DDL migrations (001_clientes.sql, 002_prestamos.sql, etc.)
│   │   └── plan-flags.spec.ts ← Feature flag registry tests (Node --test)
│   ├── middleware.ts         ← Session refresh & route protection
│   ├── package.json          ← npm scripts: dev, build, typecheck, test:features
│   └── .env.local.example    ← Template for environment variables
├── AGENTS.md                 ← This file (architecture & patterns)
└── CLAUDE.md                 ← Supplementary: feature flags detail, known gotchas, commands
```

## Development Workflow

### Starting

```bash
cd src
npm run dev           # Start dev server at http://localhost:3000
```

### Before Committing

**All three checks must pass** (Next.js build is strict about types despite `ignoreBuildErrors: true`):

```bash
cd src
npx tsc --noEmit      # Type check
npm run build         # Full build (catches async/hydration issues)
npm run test:features # Test feature flag registry (if touching plan/feature code)
```

### Adding a New Feature Flag

1. Add the key to `types/features.ts` → `FeatureKey` union
2. Add definition to `lib/features/registry.ts` → `REGISTRY` object
3. Update the test in `scripts/plan-flags.spec.ts` to include the new key
4. Use in UI: `<FeatureFlag feature="new.feature">` in server components
5. Use in server actions: wrap logic in `requireFeature()` or `withFeatureGuardResult()`

Example: Adding `"reports.export"` feature:

```typescript
// types/features.ts
export type FeatureKey = /* ... */ | 'reports.export'

// lib/features/registry.ts
export const REGISTRY: Record<FeatureKey, FeatureDefinition> = {
  // ...
  'reports.export': {
    key: 'reports.export',
    minPlan: 'PRO',
    description: 'Export loan/client data as CSV'
  }
}

// In UI:
<FeatureFlag feature="reports.export">
  <ExportButton />
</FeatureFlag>

// In server actions:
export async function exportData() {
  await requireFeature('reports.export')
  // ... export logic
}
```

### Adding a Database Table or Modifying Schema

1. Create a new numbered SQL script: `scripts/004_new_table.sql`
2. Write **idempotent** DDL: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE IF EXISTS`, etc.
3. **Always include `user_id` column + `auth.uid() = user_id` RLS policy** for multi-tenancy
4. Execute manually in Supabase SQL Editor (there are no automatic migrations)
5. Add corresponding TypeScript types to `lib/types.ts`
6. Add server actions to `lib/actions.ts` with proper `user_id` filtering

Example script (`scripts/004_example.sql`):

```sql
CREATE TABLE IF NOT EXISTS example (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE example ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own records"
  ON example FOR ALL
  USING (auth.uid() = user_id);
```

### Adding a Server Action (Mutation)

All data mutations go in `src/lib/actions.ts` with `'use server'` directive:

```typescript
export async function createThing(formData: ThingFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('things')
    .insert({ ...formData, user_id: user.id })  // ← Always include user_id
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')  // ← Refresh affected routes
  return data.id
}
```

**Pattern:**
1. Create Supabase client with `createClient()`
2. Call `supabase.auth.getUser()` (required; see comments in `server.ts`/`proxy.ts`)
3. Filter all queries by `user_id`
4. Call `revalidatePath()` or `revalidateTag()` after mutations to refresh UI
5. Let errors bubble; middleware catches them and returns 503 (bad request)

### Adding a UI Component

Domain components go in `src/components/` by feature:
- `src/components/cliente-*.tsx` — client-related UI
- `src/components/prestamo-*.tsx` — loan-related UI
- `src/components/ui/` — generic Radix primitives from shadcn/v0

Use the `cn()` helper from `@/lib/utils` to merge Tailwind classes:

```typescript
import { cn } from '@/lib/utils'

export function MyButton({ className, ...props }) {
  return <button className={cn('px-4 py-2 bg-blue-500', className)} {...props} />
}
```

Server components are default; mark client-only components with the `-client.tsx` suffix and add `'use client'` at the top. Client components **never** call Supabase directly—fetch data from server actions only.

### Querying Data (Read-Only)

For read-only queries, pass them directly in server components or as props—no need for server actions. Example:

```typescript
// src/app/dashboard/page.tsx (server component)
export default async function DashboardPage() {
  const clientes = await getClientes()  // Server action used as utility
  return <Dashboard clientes={clientes} />
}
```

## Environment & Deployment

### Local Environment

- `src/.env.local` (QA) — loaded in dev, **not tracked in git**
- Next.js loads env vars automatically; no manual setup needed
- Template: `src/.env.local.example` (tracked; shows required vars)

### Public Environment Variable

- `NEXT_PUBLIC_APP_ENV=qa|production` — controls the database-indicator badge in the UI
- QA and production Supabase projects are separate

### Deployment

- **Vercel** project: `v0-loan-agency-app`
- **Node.js**: 24.x
- **Branches**: `master` (production) and `qa` (staging)
- `.vercel/` is git-ignored

## Architecture Details

### Session Management & Route Protection

- `src/middleware.ts` — middleware that runs on every request
- `lib/supabase/proxy.ts` — `updateSession()` refreshes auth tokens and protects routes:
  - `/dashboard` requires session; redirects to `/auth/login` if not authenticated
  - `/auth/*` and `/` redirect to `/dashboard` if already logged in
- **Important**: Always call `supabase.auth.getUser()` after creating a client—the Supabase team warns that omitting this can randomly close sessions

### Supabase Clients

- Created **per-request** with `@supabase/ssr` (never global singletons)
- `lib/supabase/server.ts` exports `createClient()` for server actions
- Example:

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Centralized Loan Status & Formatting Logic

**Reuse, don't recalculate.** Loan status (overdue/upcoming/paid), ARS currency formatting, and es-AR date formatting are in `lib/utils-clientes.ts`:

- `getStatusPrestamo(prestamo)` → `{ label, color, diasRestantes }`
- `formatCurrency(amount)` → "ARS 1.234"
- `formatDate(dateStr)` → "1 ene 2025" (es-AR locale)
- `todayStr()` → "2025-01-01" (ISO date string)

Use these in all components that display loan data.

### Feature Flags & Plan Resolution

- Registry: `lib/features/registry.ts` with `REGISTRY`, `isFeatureEnabled()`, `getPlan()`
- **Important**: These modules must be importable in Node (tests use them); avoid `next/*` and `@supabase/*` imports
- Provider chain for plan resolution:
  1. `EnvProvider` — reads `FEATURE_PLAN_OVERRIDE=starter|pro` (dev override)
  2. `SupabasePlanProvider` — queries `user_plans` table (script 003), cached with `React.cache()`
  3. Default → **PRO** plan

## Code Conventions

### Naming & Language

- **UI**: Spanish (`html lang="es"`)
- **Code identifiers**: English (functions, variables, types)
- **Commits**: Spanish, conventional style (`feat:`, `fix:`, `docs:`, etc.)
- **Comments**: Omit obvious descriptions; only explain the *why* (e.g., constraints, workarounds, non-obvious invariants)

### TypeScript

- `strict: true` in `tsconfig.json`
- Avoid `any`; use proper types
- `.ts` extension imports only in test files (leveraging `allowImportingTsExtensions` in tsconfig)

### State & Props

- Favor server components; client components are the exception
- Server components fetch data and pass down as props
- Client components (ending in `-client.tsx`) use `'use client'` and never call Supabase

### Styling

- Tailwind CSS 4 + shadcn/v0 primitives
- Use `cn()` from `@/lib/utils` to merge class lists
- All generic UI components live in `src/components/ui/` (generated by shadcn/v0; add to via `npx shadcn-ui add <component>`)

## Known Gotchas

1. **`getTasaVigente()` in `lib/actions.ts`** — queries `configuracion_interes` without filtering by `user_id` (violates the multi-tenant rule). Fix this if you touch the function.

2. **`FeatureFlag` component** — creates its own Supabase client instead of using `createClient()` from `lib/supabase/server.ts`. Prefer the factory function in new code.

3. **`tsconfig` allows `.ts` imports** — `allowImportingTsExtensions: true` lets test files import modules directly. Only necessary for the feature-flag test; avoid in production code.

4. **`src/repomix-output.xml`** — generated file from `repomix`. Ignore when searching for code.

5. **No automatic ESLint** — `npm run lint` fails because eslint is not in `devDependencies`. Typecheck and build verification are the minimal checks.

## Testing

The repo has **limited testing**: only `scripts/plan-flags.spec.ts` runs with Node's `--test` flag.

```bash
cd src
npm run test:features  # Runs plan-flags.spec.ts
```

This test validates the feature registry structure. New features must be added to the registry *and* the test.

For UI/integration testing, run the dev server and test manually in the browser, or write new `.spec.ts` files following the same pattern.

---

**For supplementary info on feature flags detail, additional commands, and environment setup, see CLAUDE.md.**
