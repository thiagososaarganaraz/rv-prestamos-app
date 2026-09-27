/**
 * Guards y wrappers para proteger features deshabilitadas con HTTP 503
 */

import type { FeatureKey, FeatureContext, GuardedResult } from '@/types/features'
import { FeatureDisabledError } from './errors.ts'
import { isFeatureEnabled } from './registry.ts'

/**
 * Guard que lanza excepción 503 si la feature está deshabilitada
 * Para usar en server actions y funciones que pueden lanzar errores
 */
export async function requireFeature(
  key: FeatureKey, 
  ctx: FeatureContext = {}
): Promise<void> {
  const enabled = await isFeatureEnabled(key, ctx)
  if (!enabled) {
    throw new FeatureDisabledError(key)
  }
}

/**
 * Wrapper para server actions que devuelve resultado discriminado
 * En lugar de lanzar, devuelve { ok: false, error: '503' } que el cliente puede manejar
 */
export async function withFeatureGuardResult<T>(
  key: FeatureKey,
  fn: () => Promise<T>,
  ctx: FeatureContext = {}
): Promise<GuardedResult<T>> {
  try {
    await requireFeature(key, ctx)
    const data = await fn()
    return { ok: true, data }
  } catch (error) {
    if (error instanceof FeatureDisabledError) {
      return { 
        ok: false, 
        error: 'Service Unavailable', 
        code: 503 
      }
    }
    throw error // Re-lanzar otros errores
  }
}

/**
 * Wrapper para futuras API routes de Next.js que devuelve NextResponse 503
 * Nota: Requiere import de 'next/server' en el punto de uso
 */
export function createFeatureRouteWrapper() {
  return function withFeatureRoute<T>(
    key: FeatureKey,
    handler: () => Promise<T>,
    ctx: FeatureContext = {}
  ) {
    return async () => {
      try {
        await requireFeature(key, ctx)
        return await handler()
      } catch (error) {
        if (error instanceof FeatureDisabledError) {
          // Esto requiere NextResponse que debe importarse en el archivo que usa este wrapper
          // return NextResponse.json(error.toJSON(), { status: 503 })
          throw error // El wrapper en la API route manejará el NextResponse
        }
        throw error
      }
    }
  }
}

/**
 * Helper para construir contexto desde request de server component
 */
export function createServerContext(userId?: string, supabase?: unknown): FeatureContext {
  return {
    userId,
    supabase: supabase as any // Estructural typing
  }
}