'use client'

import { useState } from 'react'
import type { Cliente, ClienteDatos } from '@/lib/types'
import { actualizarCliente, guardarFotoDni, quitarFotoDni } from '@/lib/actions'
import { DNI_SIDES, normalizeClientData } from '@/lib/client-profile'

export type PhotoDraft = { path: string | null; file: File | null; remove: boolean }
export type ClientProfileDraft = {
  telefono: string
  ocupacion: string
  redes_sociales: ClienteDatos['redes_sociales']
  dni_frente: PhotoDraft
  dni_dorso: PhotoDraft
}

export function profileDraft(cliente?: Cliente): ClientProfileDraft {
  return {
    telefono: cliente?.telefono ?? '',
    ocupacion: cliente?.ocupacion ?? '',
    redes_sociales: cliente?.redes_sociales?.map((r) => ({ ...r })) ?? [],
    dni_frente: { path: cliente?.dni_frente ?? null, file: null, remove: false },
    dni_dorso: { path: cliente?.dni_dorso ?? null, file: null, remove: false },
  }
}

export function draftPresence(draft: ClientProfileDraft) {
  return {
    ...draft,
    dni_frente: draft.dni_frente.file || (!draft.dni_frente.remove && draft.dni_frente.path),
    dni_dorso: draft.dni_dorso.file || (!draft.dni_dorso.remove && draft.dni_dorso.path),
  }
}

export function useClientProfile() {
  const [draft, setDraft] = useState(profileDraft)
  const [notices, setNotices] = useState<string[]>([])

  function reset(cliente?: Cliente) {
    setDraft(profileDraft(cliente))
    setNotices([])
  }

  function values() {
    return normalizeClientData({ telefono: draft.telefono, ocupacion: draft.ocupacion, redes_sociales: draft.redes_sociales })
  }

  async function save(id: string, nombre?: string) {
    await actualizarCliente(id, { ...values(), ...(nombre === undefined ? {} : { nombre }) })
    const warnings: string[] = []
    for (const side of DNI_SIDES) {
      const photo = draft[side]
      try {
        let path = photo.path
        let warning: string | null = null
        if (photo.file) {
          const form = new FormData()
          form.set('file', photo.file)
          const result = await guardarFotoDni(id, side, form)
          path = result.path
          warning = result.warning
        } else if (photo.remove && photo.path) {
          const result = await quitarFotoDni(id, side)
          path = null
          warning = result.warning
        }
        setDraft((current) => ({ ...current, [side]: { path, file: null, remove: false } }))
        if (warning) {
          warnings.push(warning)
          setNotices((current) => [...current, warning])
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado'
        throw new Error(`Los datos de texto del cliente ya se guardaron. No se pudo guardar el ${side === 'dni_frente' ? 'frente' : 'dorso'} del DNI: ${message}`)
      }
    }
    return warnings
  }

  return { draft, setDraft, reset, values, save, notices }
}
