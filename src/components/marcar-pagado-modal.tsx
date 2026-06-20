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

interface MarcarPagadoModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  prestamoId: string
  clienteNombre: string
}

export function MarcarPagadoModal({
  open,
  onOpenChange,
  prestamoId,
  clienteNombre,
}: MarcarPagadoModalProps) {
  const [fechaPago, setFechaPago] = useState(todayStr())
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setFechaPago(todayStr())
      setMetodoPago('efectivo')
      setError(null)
    }
  }, [open])

  function handleConfirmar() {
    if (!fechaPago) {
      setError('La fecha de pago es obligatoria.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await marcarPrestamoPagado(prestamoId, fechaPago, metodoPago)
        onOpenChange(false)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error inesperado')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
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
            <Input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
            />
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleConfirmar} disabled={isPending}>
              {isPending ? <Spinner className="mr-2" /> : null}
              Confirmar pago
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
