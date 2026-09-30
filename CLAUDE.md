# CLAUDE.md

@AGENTS.md

Las reglas de AGENTS.md aplican íntegras. Lo siguiente las complementa/corrige (verificado contra el código).

## Comandos actualizados (desde `src/`)
- `npm run typecheck` (= `tsc --noEmit`) ya existe.
- `npm run test:features` corre `scripts/plan-flags.spec.ts` con `node --test --experimental-strip-types` (Node >= 22.6). Es el único test; `npm run lint` sigue roto (sin eslint).
- Hay `package-lock.json` y `pnpm-lock.yaml`; usar npm (scripts/Vercel) y no regenerar el otro.
- `src/.env.local.example` es la plantilla de variables (sí está trackeado).

## Mapa de la app
- Rutas (`src/app`): `/` (redirige), `/auth/login`, `/dashboard` (home + tabs), `/clientes/[id]`, `/ajustes` (tasa de interés).
- Componentes de dominio en `src/components/` (`home`, `cliente-*`, `prestamo-*`, `marcar-pagado-modal`, `dashboards/*` = financiero/riesgo/clientes/wallet). Tipos de dominio en `lib/types.ts`.

## Planes y feature flags (STARTER vs PRO)
- Registry en `lib/features/registry.ts` (`REGISTRY`, `isFeatureEnabled`, `getPlan`); tipos en `types/features.ts`. Features: `analytics.dashboard`, `analytics.wallet`, `ui.database-indicator` (todas `minPlan: 'PRO'`).
- Resolución de plan por cadena de providers: `EnvProvider` (`FEATURE_PLAN_OVERRIDE=starter|pro`) → `SupabasePlanProvider` (tabla `user_plans`, script `003`, cacheado con `React.cache`) → default **PRO**.
- Uso: `<FeatureFlag feature="...">` (server component, `components/feature-flag.tsx`) en UI; `requireFeature` / `withFeatureGuardResult` (`lib/features/guard.ts`) en server actions (devuelven 503).
- **`registry.ts`, `guard.ts`, `errors.ts` y `providers/env-provider.ts` deben seguir importables en Node plano**: sin `next/*` ni `@supabase/*` (los tests los importan con extensión `.ts`). Para agregar una feature: sumar la key a `FeatureKey`, a `REGISTRY` y actualizar el test.

## Gotchas conocidos
- `getTasaVigente()` en `lib/actions.ts` consulta `configuracion_interes` **sin filtrar por `user_id`** (contradice la regla de AGENTS.md; `setNuevaTasa` sí guarda `user_id`). Al tocarla, agregar el filtro.
- `FeatureFlag` crea su propio cliente Supabase en vez de usar `lib/supabase/server.ts`; preferir `createClient()` de ahí en código nuevo.
- `tsconfig` tiene `allowImportingTsExtensions`; los imports `.ts` explícitos solo son necesarios en los módulos testeados.
- `src/repomix-output.xml` es un volcado generado: ignorarlo al buscar código.
