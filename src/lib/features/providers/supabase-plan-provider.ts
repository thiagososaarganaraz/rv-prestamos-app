/**
 * Provider Supabase para resolución de planes por usuario desde DB
 * Utiliza React.cache para memoización por request y evitar queries duplicadas
 */

import { cache } from 'react'
import type { 
  FeatureKey, 
  FeatureContext, 
  FeatureProvider, 
  Plan,
  PlanLookup 
} from '@/types/features'

/**
 * Cache por request para planes de usuario
 * React.cache memoiza por parámetros - un userId -> un plan por request
 */
const getCachedUserPlan = cache(async (
  supabase: PlanLookup,
  userId: string
): Promise<Plan | null> => {
  try {
    const { data, error } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      return null // No plan específico -> usar default PRO
    }
    
    return data.plan
  } catch (error) {
    console.warn('Error querying user plan:', error)
    return null
  }
})

export class SupabasePlanProvider implements FeatureProvider {
  async resolve(key: FeatureKey, ctx: FeatureContext): Promise<boolean | undefined> {
    // Requiere contexto de usuario y cliente Supabase
    if (!ctx.userId || !ctx.supabase) {
      return undefined // No puede opinar sin datos
    }

    try {
      const plan = await getCachedUserPlan(ctx.supabase, ctx.userId)
      
      // Si no hay plan en DB -> undefined (usar default PRO)
      if (!plan) {
        return undefined
      }
      
      // STARTER -> todas las features opcionales false
      // PRO -> todas las features opcionales true  
      return plan === 'PRO'
      
    } catch (error) {
      console.warn(`Error resolving plan for user ${ctx.userId}:`, error)
      return undefined // Falback to default en caso de error
    }
  }
}

// Instance singleton
export const supabasePlanProvider = new SupabasePlanProvider()