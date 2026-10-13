'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DniImageViewer } from '@/components/dni-image-viewer'
import type { ClientProfileDraft, PhotoDraft } from '@/hooks/use-client-profile'
import { draftPresence } from '@/hooks/use-client-profile'
import { DNI_SIDES, missingClientData, validateDniFile } from '@/lib/client-profile'
import type { DniSide } from '@/lib/types'
import { verFotoDni } from '@/lib/actions'

export function DniPreview({ clientId, side }: { clientId: string; side: DniSide }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!url) return
    const timer = setTimeout(() => setUrl(null), 300000)
    return () => clearTimeout(timer)
  }, [url])
  async function show() {
    setLoading(true)
    setError(null)
    try { setUrl(await verFotoDni(clientId, side)) }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir la foto.') }
    finally { setLoading(false) }
  }
  return <div className="space-y-2">
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => url ? setUrl(null) : void show()}>
      {loading ? 'Abriendo…' : url ? 'Ocultar foto' : `Ver ${side === 'dni_frente' ? 'frente' : 'dorso'} del DNI`}
    </Button>
    {url && <DniImageViewer key={url} src={url} alt={`DNI ${side === 'dni_frente' ? 'frente' : 'dorso'}`} className="max-h-64 max-w-full rounded border object-contain" onError={() => { setUrl(null); setError('La imagen no pudo cargarse. Intentá abrirla nuevamente.') }} />}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>
}

function PhotoField({ side, photo, onChange, clientId }: { side: DniSide; photo: PhotoDraft; onChange: (photo: PhotoDraft) => void; clientId?: string }) {
  const id = useId()
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!photo.file) { setPreview(null); return }
    const url = URL.createObjectURL(photo.file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo.file])
  return <div className="space-y-2 rounded-lg border p-3">
    <Label htmlFor={id}>{side === 'dni_frente' ? 'Frente' : 'Dorso'} del DNI (recomendado)</Label>
    <Input id={id} type="file" accept="image/jpeg,image/png,image/webp"
      className="h-10 p-1 file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:transition-colors file:hover:bg-primary/90 disabled:file:cursor-not-allowed dark:file:bg-[oklch(0.48_0.18_250)] dark:file:text-white dark:file:hover:bg-[oklch(0.48_0.18_250_/_90%)]"
      onChange={(event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      try { validateDniFile(file); setError(null); onChange({ ...photo, file, remove: false }) }
      catch (e) { setError(e instanceof Error ? e.message : 'Archivo inválido') }
    }} />
    {preview && <DniImageViewer key={preview} src={preview} alt={`Vista previa del ${side === 'dni_frente' ? 'frente' : 'dorso'} del DNI`} className="max-h-40 max-w-full rounded object-contain" onError={() => setError('No se pudo cargar la vista previa. Intentá seleccionar la foto nuevamente.')} />}
    {!photo.file && photo.path && !photo.remove && clientId && <DniPreview key={photo.path} clientId={clientId} side={side} />}
    {photo.remove && <p className="text-sm">La foto se quitará al guardar.</p>}
    {(photo.file || (photo.path && !photo.remove)) && <Button type="button" variant="outline" size="sm" onClick={() => { setError(null); onChange({ path: photo.path, file: null, remove: !!photo.path }) }}>Eliminar foto</Button>}
    {photo.path && (photo.file || photo.remove) && <Button type="button" variant="ghost" size="sm" onClick={() => { setError(null); onChange({ path: photo.path, file: null, remove: false }) }}>Conservar foto guardada</Button>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>
}

export function ClientProfileFields({ draft, onChange, clientId, disabled = false }: {
  draft: ClientProfileDraft
  onChange: (draft: ClientProfileDraft) => void
  clientId?: string
  disabled?: boolean
}) {
  const id = useId()
  const missing = missingClientData(draftPresence(draft))
  return <fieldset disabled={disabled} className="space-y-3 min-w-0">
    <legend className="font-semibold mb-2">Datos del cliente</legend>
    <p className="text-xs text-muted-foreground">Recomendados. Podés completarlos o modificarlos después desde la ficha del cliente.</p>
    <div className="space-y-1"><Label htmlFor={`${id}-phone`}>Número telefónico</Label><Input id={`${id}-phone`} type="tel" placeholder="Ej.: +54 9 11 1234 5678" value={draft.telefono} onChange={(e) => onChange({ ...draft, telefono: e.target.value })} /></div>
    <div className="space-y-1"><Label htmlFor={`${id}-job`}>Ocupación</Label><Input id={`${id}-job`} value={draft.ocupacion} placeholder="Ej.: comerciante" onChange={(e) => onChange({ ...draft, ocupacion: e.target.value })} /></div>
    <div className="space-y-2">
      <p className="text-sm font-medium">Redes sociales</p>
      {draft.redes_sociales.map((social, index) => <div key={index} className="space-y-2 rounded border p-2">
        <Label htmlFor={`${id}-network-${index}`}>Red</Label>
        <Input id={`${id}-network-${index}`} placeholder="Ej.: Instagram" value={social.red} onChange={(e) => onChange({ ...draft, redes_sociales: draft.redes_sociales.map((r, i) => i === index ? { ...r, red: e.target.value } : r) })} />
        <Label htmlFor={`${id}-handle-${index}`}>Usuario o enlace</Label>
        <Input id={`${id}-handle-${index}`} placeholder="@usuario o https://…" value={social.usuario} onChange={(e) => onChange({ ...draft, redes_sociales: draft.redes_sociales.map((r, i) => i === index ? { ...r, usuario: e.target.value } : r) })} />
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...draft, redes_sociales: draft.redes_sociales.filter((_, i) => i !== index) })}>Eliminar red {index + 1}</Button>
      </div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...draft, redes_sociales: [...draft.redes_sociales, { red: '', usuario: '' }] })}>Agregar red social</Button>
    </div>
    <p className="text-xs text-muted-foreground">Fotos JPEG, PNG o WebP, hasta 3 MB cada una. Acceso privado.</p>
    {DNI_SIDES.map((side) => <PhotoField key={`${clientId ?? 'new'}-${side}`} side={side} photo={draft[side]} onChange={(photo) => onChange({ ...draft, [side]: photo })} clientId={clientId} />)}
    {missing.length > 0 && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">Datos pendientes: {missing.join(', ')}.</p>}
  </fieldset>
}
