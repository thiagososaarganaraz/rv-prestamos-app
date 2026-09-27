# AGENTS.md

App de gestión de préstamos: Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind CSS 4, con Supabase (auth + Postgres/RLS) y UI shadcn/v0 (Radix UI, iconos `lucide-react`).

## Layout: la app vive en `src/`
La raíz del repo solo tiene git/Veracel/VSCode y `.tokensave/`. **Todo el código y los comandos de npm viven dentro de `src/`** (usar `workdir=src` o `cd src`), incluido `package.json`, `tsconfig.json`, `middleware.ts` y `.env*`.

## Comandos (desde `src/`)
- `npm run dev` / `npm run build` / `npm start`
- **No hay test, typecheck ni lint funcionales.** `npm run lint` falla porque eslint no está en `devDependencies`, y `next.config.mjs` define `typescript.ignoreBuildErrors: true` (un build NO falla por errores de tipos). Verificación mínima tras cambios: `npx tsc --noEmit` + `npm run build`.

## Entorno
- `src/.env.local` (QA) y `src/.env.production` (production) NO están trackeados (`.gitignore` excluye `.env*`). Next carga `.env.local` en dev y `.env.production` en build/start; no hay que hacer nada manual.
- La app solo consume vars `NEXT_PUBLIC_*`. `NEXT_PUBLIC_APP_ENV=qa|production` alimenta el indicador de base de datos de la UI. QA y production apuntan a proyectos Supabase distintos.

## Base de datos
- El schema se mantiene en `src/scripts/*.sql` (001 clientes, 002 prestamos), DDL idempotente que se ejecuta a mano en el SQL Editor de Supabase. **No hay migraciones automáticas**: al cambiar el schema, agregar un script numerado nuevo.
- La tabla `configuracion_interes` (usada en `lib/actions.ts`) NO tiene script propio; créala manualmente si se borra.
- Multi-tenant por columna `user_id` + RLS (`auth.uid() = user_id`). **Toda query a `clientes`, `prestamos` o `configuracion_interes` debe filtrar por el `user_id` del usuario autenticado.**

## Arquitectura
- `src/middleware.ts` + `lib/supabase/proxy.ts` (`updateSession`) refrescan la sesión y protegen rutas: `/dashboard` exige sesión; `/auth/*` y `/` redirigen según haya usuario.
- Clientes de Supabase: se crean por request con `@supabase/ssr` (nunca en variables globales) y **siempre** hay que llamar `supabase.auth.getUser()` — los comentarios en `server.ts`/`proxy.ts` advierten que omitirlo cierra sesiones de forma aleatoria.
- Toda mutación de datos pasa por server actions en `src/lib/actions.ts` (`'use server'`); los componentes client (sufijo `-client.tsx`) nunca consultan Supabase directamente.
- La lógica de estado de préstamo (vencido/pronto/pagado, formateo moneda ARS y fechas es-AR) está centralizada en `src/lib/utils-clientes.ts`; reutilizarla en vez de recalcular.

## Convenciones
- UI en español (`html lang="es"`), commits en español estilo conventional (`feat:`, `fix:`); identificadores de código en inglés.
- Componentes UI genéricos en `src/components/ui/` (generados por shadcn/v0): usar esos primitivos y el helper `cn()` de `@/lib/utils` para fusionar clases; alias `@/*` → `src/*`.
- Deploy en Vercel (proyecto `v0-loan-agency-app`, Node 24) desde `master`/`qa`; `.vercel/` está ignorado por git.