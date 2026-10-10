'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Cliente } from '@/lib/types'
import { useClientProfile } from '@/hooks/use-client-profile'
import { ClientProfileFields } from '@/components/client-profile-fields'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function ClienteEditForm({ cliente, open, onOpenChange, onNotice }: { cliente: Cliente; open: boolean; onOpenChange: (open: boolean) => void; onNotice: (notice: string) => void }) {
  const profile = useClientProfile()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (open) { profile.reset(cliente); setError(null) } }, [open, cliente.id])
  function save() {
    try { profile.values() } catch (e) { setError(e instanceof Error ? e.message : 'Datos inválidos'); return }
    setError(null)
    startTransition(async () => {
      try {
        const warnings = await profile.save(cliente.id)
        onNotice(['Datos del cliente guardados.', ...profile.notices, ...warnings].join(' '))
        onOpenChange(false)
        router.refresh()
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron guardar los datos.') }
    })
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value) }}>
    <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Editar datos de {cliente.nombre}</DialogTitle>
        <DialogDescription>Estos datos se comparten entre todos los préstamos del cliente. Podés guardar aunque falten datos recomendados.</DialogDescription>
      </DialogHeader>
      <ClientProfileFields draft={profile.draft} onChange={profile.setDraft} clientId={cliente.id} disabled={pending} />
      {profile.notices.map((notice, index) => <p key={index} role="status" className="text-sm">{notice}</p>)}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button onClick={save} disabled={pending}>{pending ? 'Guardando…' : 'Guardar datos'}</Button>
    </DialogContent>
  </Dialog>
}
