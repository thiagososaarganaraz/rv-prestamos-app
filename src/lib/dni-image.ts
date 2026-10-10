import sharp from 'sharp'
import { validateDniFile } from './client-profile.ts'

export async function prepareDniImage(file: File) {
  validateDniFile(file)
  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const image = sharp(buffer, { limitInputPixels: 20000000, failOn: 'warning' })
    const metadata = await image.metadata()
    const mime = ({ jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as Record<string, string>)[metadata.format ?? '']
    if (mime !== file.type || (metadata.pages ?? 1) !== 1) throw new Error('Formato no válido')
    // Decodificar y volver a codificar verifica el contenido y elimina metadatos EXIF.
    const bytes = await image.rotate().jpeg({ quality: 90 }).toBuffer()
    validateDniFile({ size: bytes.length, type: 'image/jpeg' })
    return bytes
  } catch {
    throw new Error('La foto no es una imagen válida o es demasiado grande. Elegí otra imagen JPEG, PNG o WebP de hasta 3 MB.')
  }
}
