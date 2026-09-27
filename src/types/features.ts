/**
 * Sistema de planes de usuario - Feature Flags
 * 
 * Modelo:
 * - STARTER: Solo dominios core (Clientes, Préstamos, Cobros, Interés)
 * - PRO: Todos los módulos (incluyendo analytics, wallet overview, etc.)
 * 
 * Default: PRO (versión actual sin restricciones)
 */

export type Plan = 'STARTER' | 'PRO'

/**
 * Claves de features opcionales que existen en el codebase.
 * Solo módulos existentes, sin flags reservados futuros.
 */
export type FeatureKey = 
  | 'analytics.dashboard'     // Tab "Cuenta" + 3 dashboards (financiero, riesgo, clientes)
  | 'analytics.wallet'        // WalletOverview component
  | 'ui.database-indicator'   // Badge de ambiente en header

/**
 * Contexto para resolución de features - datos del usuario y cliente DB
 */
export interface FeatureContext {
  userId?: string
  supabase?: PlanLookup
  [key: string]: unknown
}

/**
 * Interfaz estructural para query de planes (mock-friendly para tests)
 * Evita importar @supabase/supabase-js en registry.ts (debe ser importable en Node plano)
 */
export interface PlanLookup {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: unknown) => {
        single: () => Promise<{
          data: { plan: Plan } | null
          error?: unknown
        }>
      }
    }
  }
}

/**
 * Definición de feature en el registry
 */
export interface FeatureDefinition {
  readonly key: FeatureKey
  readonly minPlan: Plan
  readonly description: string
}

/**
 * Interfaz de proveedor de resolución de features
 */
export interface FeatureProvider {
  resolve(key: FeatureKey, ctx: FeatureContext): Promise<boolean | undefined>
}

/**
 * Resultado wrapper para server actions con guard 503
 */
export type GuardedResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: 'Service Unavailable'; code: 503 }