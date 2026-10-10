'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { crearCliente, crearPrestamo, actualizarPrestamo, getTasaVigente } from '@/lib/actions'
import { calculateLoanAmounts, formatLoanCurrency, isValidInterestRate } from '@/lib/interest'
import { Cliente, Prestamo, MetodoPago } from '@/lib/types'
import { todayStr, oneMonthFromNow } from '@/lib/utils-clientes'
import { ClientProfileFields } from '@/components/client-profile-fields'
import { draftPresence, useClientProfile } from '@/hooks/use-client-profile'
import { missingClientData } from '@/lib/client-profile'
import { toast } from '@/hooks/use-toast'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'

interface PrestamoFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  clientes: Cliente[]
  prestamoEditar?: Prestamo | null
  clienteIdFijo?: string // if opened from a client detail page
}

type Paso = 'cliente' | 'prestamo'

const defaultForm = () => ({
  cliente_id: '',
  nuevoNombre: '',
  monto: '',
  tasa_interes: '',
  fecha_prestamo: todayStr(),
  fecha_vencimiento: oneMonthFromNow(),
  metodo_pago: '' as MetodoPago | '',
  notas: '',
})

export function PrestamoForm({
  open,
  onOpenChange,
  clientes,
  prestamoEditar,
  clienteIdFijo,
}: PrestamoFormProps) {
  const [paso, setPaso] = useState<Paso>('cliente')
  const [crearNuevoCliente, setCrearNuevoCliente] = useState(false)
  const [form, setForm] = useState(defaultForm())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const rateTouched = useRef(false)
  const [rateNotice, setRateNotice] = useState<string | null>(null)
  const profile = useClientProfile()
  const createdClientId = useRef<string | null>(null)
  const [confirmMissing, setConfirmMissing] = useState(false)

  const isEdit = !!prestamoEditar

  useEffect(() => {
    let active = true
    if (open) {
      createdClientId.current = null
      setConfirmMissing(false)
      setError(null)
      setRateNotice(null)
      rateTouched.current = false
      if (prestamoEditar) {
        setForm({
          cliente_id: prestamoEditar.cliente_id,
          nuevoNombre: '',
          monto: String(prestamoEditar.monto),
          tasa_interes: String(prestamoEditar.tasa_interes),
          fecha_prestamo: prestamoEditar.fecha_prestamo,
          fecha_vencimiento: prestamoEditar.fecha_vencimiento,
          metodo_pago: prestamoEditar.metodo_pago ?? '',
          notas: prestamoEditar.notas ?? '',
        })
        setPaso('prestamo')
        setCrearNuevoCliente(false)
      } else {
        setForm({ ...defaultForm(), cliente_id: clienteIdFijo ?? '' })
        setPaso(clienteIdFijo ? 'prestamo' : 'cliente')
        setCrearNuevoCliente(false)
        getTasaVigente().then((rate) => {
          if (active && !rateTouched.current) {
            setForm((f) => ({ ...f, tasa_interes: String(rate) }))
          }
        }).catch(() => {
          if (active) setRateNotice('No se pudo cargar la tasa de Ajustes. Ingresá el porcentaje para este préstamo.')
        })
      }
    }
    return () => { active = false }
  }, [open, prestamoEditar, clienteIdFijo])

  useEffect(() => {
    if (!open || isEdit) return
    createdClientId.current = null
    profile.reset(crearNuevoCliente ? undefined : clientes.find((c) => c.id === (clienteIdFijo ?? form.cliente_id)))
    // No reiniciar al revalidar clientes: conservar borrador y cargas parciales.
  }, [open, isEdit, clienteIdFijo, form.cliente_id, crearNuevoCliente])

  function set(key: keyof ReturnType<typeof defaultForm>, value: string) {
    if (key === 'tasa_interes') rateTouched.current = true
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleContinuar() {
    if (!crearNuevoCliente && !form.cliente_id) {
      setError('Selecciona un cliente o crea uno nuevo.')
      return
    }
    if (crearNuevoCliente && !form.nuevoNombre.trim()) {
      setError('El nombre del cliente es obligatorio.')
      return
    }
    setError(null)
    setPaso('prestamo')
  }

  function handleSubmit(confirmed = false) {
    if (!form.monto || !Number.isFinite(Number(form.monto)) || Number(form.monto) <= 0) {
      setError('El monto debe ser un número positivo.')
      return
    }
    if (!form.tasa_interes.trim() || !isValidInterestRate(Number(form.tasa_interes))) {
      setError('La tasa de interés es obligatoria y debe ser un número no negativo con hasta dos decimales.')
      return
    }
    if (!form.fecha_vencimiento) {
      setError('La fecha de vencimiento es obligatoria.')
      return
    }
    if (!isEdit) {
      if (crearNuevoCliente && !form.nuevoNombre.trim()) { setError('El nombre del cliente es obligatorio.'); return }
      if (!crearNuevoCliente && !form.cliente_id) { setError('Seleccioná un cliente.'); return }
      try { profile.values() } catch (e) { setError(e instanceof Error ? e.message : 'Datos del cliente inválidos'); return }
      if (!confirmed && missingClientData(draftPresence(profile.draft)).length) {
        setError(null)
        setConfirmMissing(true)
        return
      }
    }
    setError(null)

    startTransition(async () => {
      try {
        let clienteId = createdClientId.current ?? form.cliente_id

        if (!isEdit && crearNuevoCliente && !createdClientId.current) {
          clienteId = await crearCliente({
            nombre: form.nuevoNombre.trim(),
            telefono: profile.draft.telefono.trim() || null,
            ...profile.values(),
            notas: null,
          })
          createdClientId.current = clienteId
        }

        const warnings = !isEdit ? await profile.save(clienteId, crearNuevoCliente ? form.nuevoNombre.trim() : undefined) : []

        const payload = {
          cliente_id: clienteId,
          monto: Number(form.monto),
          tasa_interes: Number(form.tasa_interes),
          fecha_prestamo: form.fecha_prestamo,
          fecha_vencimiento: form.fecha_vencimiento,
          metodo_pago: (form.metodo_pago as MetodoPago) || null,
          notas: form.notas.trim() || null,
        }

        if (isEdit && prestamoEditar) {
          await actualizarPrestamo(prestamoEditar.id, payload)
        } else {
          await crearPrestamo(payload)
        }

        const notices = [...profile.notices, ...warnings]
        if (notices.length) toast({ title: 'Préstamo guardado', description: notices.join(' ') })
        onOpenChange(false)
      } catch (e: unknown) {
        setError(`${e instanceof Error ? e.message : 'Error inesperado'}${createdClientId.current ? ' El cliente ya está creado y se reutilizará al reintentar.' : ''}`)
      }
    })
  }

  const showAmounts = !!form.monto && Number.isFinite(Number(form.monto)) && Number(form.monto) > 0
    && !!form.tasa_interes.trim() && isValidInterestRate(Number(form.tasa_interes))
  const amounts = showAmounts
    ? calculateLoanAmounts({ monto: Number(form.monto), tasa_interes: Number(form.tasa_interes) })
    : null

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!isPending) onOpenChange(value) }}>
      <DialogContent className="max-w-sm mx-auto max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? 'Editar préstamo' : 'Nuevo préstamo'}
          </DialogTitle>
          <DialogDescription>{isEdit ? 'Actualizá los datos del préstamo.' : 'Elegí el cliente, revisá sus datos y completá las condiciones del préstamo.'}</DialogDescription>
        </DialogHeader>

        <fieldset disabled={isPending} className="space-y-4 pt-1 min-w-0">
          {/* PASO 1: CLIENTE */}
          {paso === 'cliente' && !isEdit && !clienteIdFijo && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setCrearNuevoCliente(false); setError(null) }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${!crearNuevoCliente
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                    }`}
                >
                  Cliente existente
                </button>
                <button
                  type="button"
                  onClick={() => { setCrearNuevoCliente(true); setError(null) }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${crearNuevoCliente
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                    }`}
                >
                  Nuevo cliente
                </button>
              </div>

              {!crearNuevoCliente ? (
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={(v) => set('cliente_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input
                      value={form.nuevoNombre}
                      onChange={(e) => set('nuevoNombre', e.target.value)}
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button className="w-full" onClick={handleContinuar}>
                Continuar
              </Button>
            </>
          )}

          {/* PASO 2: PRÉSTAMO */}
          {(paso === 'prestamo' || isEdit || !!clienteIdFijo) && (
            <>
              {!isEdit && <ClientProfileFields draft={profile.draft} onChange={profile.setDraft} clientId={createdClientId.current ?? (crearNuevoCliente ? undefined : form.cliente_id)} disabled={isPending} />}
              <div className="space-y-1.5">
                <Label>Capital ($) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => set('monto', e.target.value)}
                  placeholder="0.00"
                  className="text-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loan-interest-rate">Tasa de interés (%) *</Label>
                <Input
                  id="loan-interest-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.tasa_interes}
                  onChange={(e) => set('tasa_interes', e.target.value)}
                  placeholder="Ej.: 20"
                />
                <p className="text-xs text-muted-foreground">El porcentaje se aplica una sola vez sobre el capital.</p>
                {rateNotice && <p role="status" className="text-xs text-muted-foreground">{rateNotice}</p>}
              </div>

              {amounts && (
                <div className="rounded-lg bg-secondary/30 p-3 text-sm space-y-1" aria-live="polite">
                  <p>Capital: {formatLoanCurrency(Number(form.monto))}</p>
                  <p>Interés ({form.tasa_interes}%): {formatLoanCurrency(amounts.interest)}</p>
                  <p className="font-semibold">Total: {formatLoanCurrency(amounts.total)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Fecha préstamo</Label>
                  <Input
                    type="date"
                    value={form.fecha_prestamo}
                    onChange={(e) => set('fecha_prestamo', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimiento</Label>
                  <Input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(e) => set('fecha_vencimiento', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Select
                  value={form.metodo_pago}
                  onValueChange={(v) => set('metodo_pago', v as MetodoPago)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notas (opcional)</Label>
                <Input
                  value={form.notas}
                  onChange={(e) => set('notas', e.target.value)}
                  placeholder="Observaciones..."
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                {!isEdit && !clienteIdFijo && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setPaso('cliente'); setError(null) }}
                    disabled={isPending}
                  >
                    Volver
                  </Button>
                )}
                <Button className="flex-1" onClick={() => handleSubmit()} disabled={isPending}>
                  {isPending ? <Spinner className="mr-2" /> : null}
                  {isEdit ? 'Guardar cambios' : 'Crear préstamo'}
                </Button>
              </div>
            </>
          )}
          {profile.notices.map((notice, index) => <p key={index} role="status" className="text-sm">{notice}</p>)}
        </fieldset>
        <AlertDialog open={confirmMissing} onOpenChange={setConfirmMissing}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Faltan datos recomendados</AlertDialogTitle>
              <AlertDialogDescription>Podés crear el préstamo y completar estos datos después desde la ficha del cliente.</AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="list-disc pl-5 text-sm">{missingClientData(draftPresence(profile.draft)).map((item) => <li key={item}>{item}</li>)}</ul>
            <AlertDialogFooter>
              <AlertDialogCancel>Completar datos</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleSubmit(true)}>Crear préstamo igualmente</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
