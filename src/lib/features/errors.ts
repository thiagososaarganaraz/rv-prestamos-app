/**
 * Error específico para features deshabilitadas
 * Compatible con HTTP 503 Service Unavailable
 */

import type { FeatureKey } from '@/types/features'

export class FeatureDisabledError extends Error {
  readonly status = 503
  readonly code = 503
  readonly feature: FeatureKey

  constructor(feature: FeatureKey, message?: string) {
    super(message || 'Service Unavailable')
    this.name = 'FeatureDisabledError'
    this.feature = feature
  }

  /**
   * Formato JSON estándar para respuestas de API
   */
  toJSON() {
    return {
      error: 'Service Unavailable',
      code: 503,
      feature: this.feature
    }
  }
}