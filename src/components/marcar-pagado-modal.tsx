'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { marcarPrestamoPagado } from '@/lib/actions'
import { todayStr } from '@/lib/utils-clientes'
import { MetodoPago } from '@/lib/types'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface MarcarPagadoModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  prestamoId: string
  clienteNombre: string
}

type ModalState = 'form' | 'success' | 'error'

export function MarcarPagadoModal({
  open,
  onOpenChange,
  prestamoId,
  clienteNombre,
}: MarcarPagadoModalProps) {
  const [fechaPago, setFechaPago] = useState(todayStr())
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [modalState, setModalState] = useState<ModalState>('form')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setFechaPago(todayStr())
      setMetodoPago('efectivo')
      setModalState('form')
    }
  }, [open])

  function handleConfirmar() {
    startTransition(async () => {
      try {
        await marcarPrestamoPagado(prestamoId, fechaPago, metodoPago)
        setModalState('success')
        setTimeout(() => onOpenChange(false), 2000)
      } catch (e: unknown) {
        setModalState('error')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto overflow-hidden">
        {modalState === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Registrar pago</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-1">
              Registrando pago de{' '}
              <span className="font-medium text-foreground">{clienteNombre}</span>
            </p>
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label>Fecha de pago</Label>
                <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as MetodoPago)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleConfirmar} disabled={isPending}>
                  {isPending ? <Spinner className="mr-2" /> : 'Confirmar pago'}
                </Button>
              </div>
            </div>
          </>
        )}

        {(modalState === 'success' || modalState === 'error') && (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
            {modalState === 'success' ? (
              <>
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">¡Pago registrado!</h3>
                <p className="text-sm text-muted-foreground mt-1">El pago fue procesado con éxito.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">Error</h3>
                <p className="text-sm text-muted-foreground mt-1">No se pudo registrar el pago. Intenta de nuevo.</p>
                <Button className="mt-6" onClick={() => setModalState('form')}>Volver a intentar</Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}