'use client'

import { useState, useTransition, useEffect } from 'react'
import { Prestamo } from '@/lib/types'
import {
  getStatusPrestamo,
  formatCurrency,
  formatDate,
  statusBadgeClasses,
  statusDotClasses,
  StatusInfo,
} from '@/lib/utils-clientes'
import { MarcarPagadoModal } from '@/components/marcar-pagado-modal'
import { PrestamoForm } from '@/components/prestamo-form'
import { eliminarPrestamo } from '@/lib/actions'
import { Cliente } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PrestamoCardProps {
  prestamo: Prestamo
  clientes: Cliente[]
  showCliente?: boolean
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
}

export function PrestamoCard({ prestamo, clientes, showCliente = false }: PrestamoCardProps) {
  const [pagadoOpen, setPagadoOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Defer date-dependent status to client only to avoid SSR/client mismatch
  const [status, setStatus] = useState<StatusInfo>({
    label: prestamo.estado === 'pagado' ? 'Pagado' : '...',
    color: prestamo.estado === 'pagado' ? 'verde' : 'amarillo',
    diasRestantes: 0,
  })
  useEffect(() => {
    setStatus(getStatusPrestamo(prestamo))
  }, [prestamo])
  const clienteNombre =
    prestamo.clientes?.nombre ??
    clientes.find((c) => c.id === prestamo.cliente_id)?.nombre ??
    'Cliente'

  function handleEliminar() {
    startTransition(async () => {
      await eliminarPrestamo(prestamo.id, prestamo.cliente_id)
    })
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {showCliente && (
              <p className="text-base font-semibold text-foreground truncate">{clienteNombre}</p>
            )}
            <p className="text-2xl font-bold text-foreground">{formatCurrency(prestamo.monto)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClasses(status.color)}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClasses(status.color)}`} />
              {status.label}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="13" r="1.5" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {prestamo.estado === 'pendiente' && (
                  <DropdownMenuItem onClick={() => setPagadoOpen(true)}>
                    Marcar pagado
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div>
            <span className="text-muted-foreground">Fecha</span>
            <p className="font-medium">{formatDate(prestamo.fecha_prestamo)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Vencimiento</span>
            <p className="font-medium">{formatDate(prestamo.fecha_vencimiento)}</p>
          </div>
          {prestamo.metodo_pago && (
            <div>
              <span className="text-muted-foreground">Método</span>
              <p className="font-medium">{METODO_LABEL[prestamo.metodo_pago]}</p>
            </div>
          )}
          {prestamo.fecha_pago && (
            <div>
              <span className="text-muted-foreground">Pagado el</span>
              <p className="font-medium">{formatDate(prestamo.fecha_pago)}</p>
            </div>
          )}
        </div>

        {prestamo.notas && (
          <p className="text-sm text-muted-foreground border-t border-border pt-2">
            {prestamo.notas}
          </p>
        )}
      </div>

      <MarcarPagadoModal
        open={pagadoOpen}
        onOpenChange={setPagadoOpen}
        prestamoId={prestamo.id}
        clienteNombre={clienteNombre}
      />

      <PrestamoForm
        open={editOpen}
        onOpenChange={setEditOpen}
        clientes={clientes}
        prestamoEditar={prestamo}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar préstamo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el préstamo de{' '}
              <strong>{formatCurrency(prestamo.monto)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEliminar}
              disabled={isPending}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
