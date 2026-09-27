// FeatureFlag.tsx - Server Component wrapper para gating de features por plan
// Uso: <FeatureFlag feature="analytics.dashboard"> contenido </FeatureFlag>
// Renderiza children solo cuando el feature está habilitado para el plan del usuario

import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/features/registry'
import { cookies } from 'next/headers'
import { ReactNode } from 'react'
import { cookies as cookiesNext } from 'next/headers'

interface FeatureFlagProps {
  feature: string
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Wrapper Server Component para gating de features por plan de usuario
 * 
 * Resuelve el plan del usuario desde la DB (o env override) y decide si renderizar children
 * Usa React.cache() internamente para evitar múltiples queries por request
 * 
 * @param feature - Key de feature en REGISTRY (ej: 'analytics.dashboard')
 * @param fallback - Elemento a renderizar cuando feature está disabled (default: null)
 * @param children - Contenido a renderizar cuando feature está enabled
 */
export async function FeatureFlag({
  feature,
  fallback = null,
  children
}: FeatureFlagProps) {
  // Crear cliente Supabase por request (usando createClient del proxy para manejar cookies correctamente)
  const cookieStore = await cookiesNext()
  const { createServerClient } = await import('@supabase/ssr')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{name: string, value: string, options?: any}>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Ignorar si es llamado desde Server Component
          }
        },
      },
    },
  )

  // Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Si no hay usuario, no renderizar features PRO (seguridad por defecto)
    return <>{fallback}</>
  }

  // Determinar si el feature está habilitado para este usuario
  const enabled = await isFeatureEnabled(feature as any, {
    userId: user.id,
    supabase: supabase as any
  })

  return enabled ? <>{children}</> : <>{fallback}</>
}

export default FeatureFlag