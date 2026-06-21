'use client'

import { useState, useTransition, useEffect } from 'react'
import { Prestamo, Cliente } from '@/lib/types'
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
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
import { MoreVertical, Calendar, Info } from 'lucide-react'

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

  // Estilos dinámicos para resaltar préstamos vencidos
  const isVencido = prestamo.estado === 'pendiente' && status.color === 'rojo'

  return (
    <>
      <div className={cn(
        "bg-card rounded-2xl border p-4 space-y-4 transition-all hover:shadow-sm",
        isVencido ? "border-[var(--status-vencido)]/30 bg-[var(--status-vencido-bg)]/20" : "border-border"
      )}>
        {/* Fila superior: Cliente y Estado */}
        <div className="flex justify-between items-start">
          <div>
            {showCliente && <p className="text-sm font-medium text-muted-foreground">{clienteNombre}</p>}
            <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(prestamo.monto)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider", statusBadgeClasses(status.color))}>
              {status.label}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>Eliminar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Fila de info técnica: Compacta y clara */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Vence: <span className="font-semibold text-foreground">{formatDate(prestamo.fecha_vencimiento)}</span></span>
          </div>
          {prestamo.metodo_pago && (
            <span className="capitalize border-l pl-4 border-border">{prestamo.metodo_pago}</span>
          )}
        </div>

        {/* Notas (si existen) */}
        {prestamo.notas && (
          <div className="flex gap-2 text-xs italic text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <p>{prestamo.notas}</p>
          </div>
        )}

        {/* CTA Principal */}
        {prestamo.estado === 'pendiente' && (
          <Button
            className={cn("w-full shadow-md font-semibold", isVencido ? "bg-red-600 hover:bg-red-700" : "")}
            onClick={() => setPagadoOpen(true)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isVencido ? 'Cobrar ahora' : 'Marcar pagado'}
          </Button>
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