/**
 * Provider de environment variables para override de plan en desarrollo
 * Lee FEATURE_PLAN_OVERRIDE para forzar un plan específico
 * 
 * IMPORTANTE: No debe importar dependencias de Next.js/Supabase para permitir testing
 */

import type { FeatureKey, FeatureContext, FeatureProvider, Plan } from '@/types/features'

export class EnvProvider implements FeatureProvider {
  async resolve(key: FeatureKey, ctx: FeatureContext): Promise<boolean | undefined> {
    const planOverride = process.env.FEATURE_PLAN_OVERRIDE as Plan | undefined
    if (planOverride) {
      console.log('[EnvProvider] FEATURE_PLAN_OVERRIDE:', planOverride)
      return planOverride === 'PRO'
    }
    return undefined
  }
}

// Instance singleton para evitar recrear
export const envProvider = new EnvProvider()