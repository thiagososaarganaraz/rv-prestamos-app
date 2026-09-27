/**
 * Tests unitarios del sistema de feature flags por planes de usuario
 * 
 * Ejecutar con: node --experimental-strip-types --test scripts/plan-flags.spec.ts
 * Requiere Node >= 22.6 para type stripping
 */

import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'

import { 
  REGISTRY, 
  registerProviders, 
  getPlan, 
  isFeatureEnabled,
  getEnabledFeatures,
  planRank 
} from '../lib/features/registry.ts'
import { FeatureDisabledError } from '../lib/features/errors.ts'
import { requireFeature, withFeatureGuardResult } from '../lib/features/guard.ts'
import { EnvProvider } from '../lib/features/providers/env-provider.ts'
import type { FeatureKey, Plan, FeatureContext, PlanLookup } from '../types/features'

describe('Feature Flags System', { concurrency: 1 }, () => {
  
  beforeEach(() => {
    registerProviders([])
  })

  describe('Registry', () => {
    test('contiene solo features existentes sin reservados', () => {
      const expectedKeys: FeatureKey[] = [
        'analytics.dashboard',
        'analytics.wallet', 
        'ui.database-indicator'
      ]
      
      const actualKeys = Object.keys(REGISTRY) as FeatureKey[]
      assert.deepStrictEqual(actualKeys.sort(), expectedKeys.sort())
    })

    test('todas las features requieren plan PRO', () => {
      for (const [key, definition] of Object.entries(REGISTRY)) {
        assert.strictEqual(definition.minPlan, 'PRO', `Feature ${key} debe requerir PRO`)
        assert.strictEqual(definition.key, key)
        assert.ok(definition.description.length > 0)
      }
    })
  })

  describe('Plan Ranking', () => {
    test('PRO > STARTER', () => {
      assert.strictEqual(planRank('PRO'), 1)
      assert.strictEqual(planRank('STARTER'), 0)
      assert.ok(planRank('PRO') > planRank('STARTER'))
    })
  })

  describe('Default behavior (sin providers)', () => {
    test('getPlan devuelve PRO por defecto', async () => {
      const plan = await getPlan({})
      assert.strictEqual(plan, 'PRO')
    })

    test('isFeatureEnabled devuelve true para plan PRO por defecto', async () => {
      for (const key of Object.keys(REGISTRY) as FeatureKey[]) {
        const enabled = await isFeatureEnabled(key, {})
        assert.strictEqual(enabled, true, `Feature ${key} debe estar enabled por defecto`)
      }
    })
  })

  describe('Env Provider', () => {
    test('env provider return false simula STARTER', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => false
      }
      registerProviders([mockProvider])

      for (const key of Object.keys(REGISTRY) as FeatureKey[]) {
        const enabled = await isFeatureEnabled(key, {})
        assert.strictEqual(enabled, false, `Feature ${key} debe estar disabled con plan STARTER`)
      }
    })

    test('env provider return true simula PRO', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => true as const
      }
      registerProviders([mockProvider])

      for (const key of Object.keys(REGISTRY) as FeatureKey[]) {
        const enabled = await isFeatureEnabled(key, {})
        assert.strictEqual(enabled, true, `Feature ${key} debe estar enabled con plan PRO`)
      }
    })

    test('env provider undefined pasa al siguiente', async () => {
      const mockProvider1 = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => undefined
      }
      const mockProvider2 = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => true as const
      }
      registerProviders([mockProvider1, mockProvider2])

      for (const key of Object.keys(REGISTRY) as FeatureKey[]) {
        const enabled = await isFeatureEnabled(key, {})
        assert.strictEqual(enabled, true, `Feature ${key} debe estar enabled por provider2`)
      }
    })
  })

  describe('Supabase Provider (mock)', () => {
    test('plan STARTER desde DB deshabilita features', async () => {
      const mockSupabase: PlanLookup = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { plan: 'STARTER' as Plan },
                error: null
              })
            })
          })
        })
      }

      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => {
          if (ctx.userId && ctx.supabase) {
            const result = await (ctx.supabase as any).from('user_plans').select('plan').eq('user_id', ctx.userId).single()
            if (result.data) {
              return result.data.plan === 'PRO'
            }
            return undefined
          }
          return undefined
        }
      }

      registerProviders([mockProvider])

      const ctx: FeatureContext = {
        userId: 'test-user',
        supabase: mockSupabase
      }

      for (const key of Object.keys(REGISTRY) as FeatureKey[]) {
        const enabled = await isFeatureEnabled(key, ctx)
        assert.strictEqual(enabled, false, `Feature ${key} debe estar disabled con STARTER`)
      }
    })

    test('sin userId/supabase en contexto usa default PRO', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => {
          if (!ctx.userId || !ctx.supabase) {
            return undefined
          }
          return false
        }
      }

      registerProviders([mockProvider])

      const plan = await getPlan({})
      assert.strictEqual(plan, 'PRO')
    })
  })

  describe('Feature Guards', () => {
    test('requireFeature lanza FeatureDisabledError cuando feature disabled', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => false
      }
      registerProviders([mockProvider])

      await assert.rejects(
        async () => await requireFeature('analytics.dashboard'),
        (error: any) => {
          return error instanceof FeatureDisabledError &&
                 error.status === 503 &&
                 error.code === 503 &&
                 error.feature === 'analytics.dashboard'
        }
      )
    })

    test('requireFeature no lanza cuando feature enabled', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => true as const
      }
      registerProviders([mockProvider])

      await requireFeature('analytics.dashboard')
    })

    test('withFeatureGuardResult devuelve 503 shape cuando disabled', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => false
      }
      registerProviders([mockProvider])

      const result = await withFeatureGuardResult(
        'analytics.dashboard',
        async () => ({ success: true })
      )

      assert.deepStrictEqual(result, {
        ok: false,
        error: 'Service Unavailable',
        code: 503
      })
    })

    test('withFeatureGuardResult devuelve data cuando enabled', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => true as const
      }
      registerProviders([mockProvider])

      const testData = { success: true }
      const result = await withFeatureGuardResult(
        'analytics.dashboard',
        async () => testData
      )

      assert.deepStrictEqual(result, {
        ok: true,
        data: testData
      })
    })
  })

  describe('getEnabledFeatures', () => {
    test('devuelve todas las features con plan PRO', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => true as const
      }
      registerProviders([mockProvider])

      const enabled = await getEnabledFeatures({})
      const expectedKeys = Object.keys(REGISTRY).sort()
      
      assert.deepStrictEqual(enabled.sort(), expectedKeys)
    })

    test('devuelve array vacío con plan STARTER', async () => {
      const mockProvider = {
        resolve: async (key: FeatureKey, ctx: FeatureContext) => false
      }
      registerProviders([mockProvider])

      const enabled = await getEnabledFeatures({})
      assert.deepStrictEqual(enabled, [])
    })
  })
})