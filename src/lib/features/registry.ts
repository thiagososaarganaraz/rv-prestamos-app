/**
 * Registry central de features y resolución de planes por usuario
 * 
 * IMPORTANTE: Este módulo debe ser importable en Node plano (sin Next.js runtime)
 * para permitir testing unitario. No importar `next/*` ni `@supabase/*` aquí.
 */

import type { 
  Plan, 
  FeatureKey, 
  FeatureDefinition, 
  FeatureContext, 
  FeatureProvider 
} from '@/types/features'

/**
 * Registry de features existentes - todas requieren plan PRO
 * (STARTER solo muestra los 4 dominios core protegidos)
 */
export const REGISTRY: Record<FeatureKey, FeatureDefinition> = {
  'analytics.dashboard': {
    key: 'analytics.dashboard',
    minPlan: 'PRO',
    description: 'Tab Cuenta con dashboards Financiero, Riesgo y Clientes'
  },
  'analytics.wallet': {
    key: 'analytics.wallet', 
    minPlan: 'PRO',
    description: 'Wallet Overview con métricas de cartera activa'
  },
  'ui.database-indicator': {
    key: 'ui.database-indicator',
    minPlan: 'PRO', 
    description: 'Badge indicador de ambiente (QA/Production) en header'
  }
}

/**
 * Ranking numérico de planes para comparación
 */
export function planRank(plan: Plan): number {
  switch (plan) {
    case 'STARTER': return 0
    case 'PRO': return 1
    default: return 0
  }
}

/**
 * Providers registrados para resolución de plan
 * Orden: env override -> supabase DB -> default PRO
 */
let registeredProviders: FeatureProvider[] = []

export function registerProviders(providers: FeatureProvider[]): void {
  registeredProviders = providers
}

/**
 * Resuelve el plan efectivo del usuario a través de la cadena de providers
 */
export async function getPlan(ctx: FeatureContext = {}): Promise<Plan> {
  // Solo auto-inicializar si NO hay providers registrados (solo en producción)
  // En tests, los providers se registran manualmente con registerProviders
  if (registeredProviders.length === 0) {
    const { envProvider } = await import('./providers/env-provider.ts')
    const { supabasePlanProvider } = await import('./providers/supabase-plan-provider.ts')
    registerProviders([envProvider, supabasePlanProvider])
  }

  for (const provider of registeredProviders) {
    const result = await provider.resolve('analytics.dashboard', ctx)
    if (result !== undefined) {
      // Si analytics.dashboard es true -> PRO, si false -> STARTER  
      return result ? 'PRO' : 'STARTER'
    }
  }
  
  return 'PRO' // Default cuando ningún provider opina
}

/**
 * Determina si una feature está habilitada para el contexto dado
 */
export async function isFeatureEnabled(
  key: FeatureKey, 
  ctx: FeatureContext = {}
): Promise<boolean> {
  const definition = REGISTRY[key]
  if (!definition) {
    throw new Error(`Feature '${key}' not found in registry`)
  }

  const userPlan = await getPlan(ctx)
  return planRank(userPlan) >= planRank(definition.minPlan)
}

/**
 * Obtiene todas las features habilitadas para un contexto
 */
export async function getEnabledFeatures(ctx: FeatureContext = {}): Promise<FeatureKey[]> {
  const enabled: FeatureKey[] = []
  
  for (const key of Object.keys(REGISTRY) as FeatureKey[]) {
    if (await isFeatureEnabled(key, ctx)) {
      enabled.push(key)
    }
  }
  
  return enabled
}