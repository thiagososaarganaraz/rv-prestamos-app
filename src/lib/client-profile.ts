import type { ClienteDatos, ClienteFormData, DniSide } from './types.ts'

export const DNI_MAX_BYTES = 3 * 1024 * 1024
export const DNI_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const DNI_SIDES: DniSide[] = ['dni_frente', 'dni_dorso']

export function missingClientData(data: Partial<ClienteDatos> & { dni_frente?: unknown; dni_dorso?: unknown }) {
  const missing: string[] = []
  if (!data.telefono?.trim()) missing.push('Número telefónico')
  if (!data.ocupacion?.trim()) missing.push('Ocupación')
  if (!data.redes_sociales?.some((r) => r.red.trim() && r.usuario.trim())) missing.push('Redes sociales')
  if (!data.dni_frente) missing.push('Foto del frente del DNI')
  if (!data.dni_dorso) missing.push('Foto del dorso del DNI')
  return missing
}

export function validateDniFile(file: { size: number; type: string }) {
  if (file.size <= 0 || file.size > DNI_MAX_BYTES) throw new Error('Cada foto del DNI debe pesar entre 1 byte y 3 MB.')
  if (!DNI_TYPES.includes(file.type)) throw new Error('La foto debe ser JPEG, PNG o WebP.')
}

// Lista explícita: nunca aceptar user_id, identificadores o rutas de Storage del navegador.
export function normalizeClientData(input: Partial<ClienteFormData>): Partial<ClienteFormData> {
  const output: Partial<ClienteFormData> = {}
  for (const key of ['nombre', 'telefono', 'ocupacion', 'notas'] as const) {
    if (!(key in input)) continue
    const value = input[key]
    if (value !== null && typeof value !== 'string') throw new Error('Los datos del cliente deben ser texto.')
    const text = value?.trim() || null
    if (key === 'nombre') {
      if (!text) throw new Error('El nombre del cliente es obligatorio.')
      output.nombre = text
    } else output[key] = text
  }
  if ('redes_sociales' in input) {
    if (!Array.isArray(input.redes_sociales)) throw new Error('La lista de redes sociales no es válida.')
    output.redes_sociales = input.redes_sociales.flatMap((entry) => {
      if (!entry || typeof entry.red !== 'string' || typeof entry.usuario !== 'string') throw new Error('La red social no es válida.')
      const red = entry.red.trim()
      const usuario = entry.usuario.trim()
      if (!red && !usuario) return []
      if (!red || !usuario) throw new Error('Completá la red y su usuario o enlace, o eliminá la entrada.')
      return [{ red, usuario }]
    })
  }
  return output
}
