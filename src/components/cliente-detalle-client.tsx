'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Cliente, Prestamo } from '@/lib/types'
import { PrestamoCard } from '@/components/prestamo-card'
import { PrestamoForm } from '@/components/prestamo-form'
import { formatCurrency } from '@/lib/utils-clientes'
import { eliminarCliente } from '@/lib/actions'
import { ArrowLeft, Phone, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

interface ClienteDetalleClientProps {
  cliente: Cliente
  prestamos: Prestamo[]
  clientes: Cliente[]
}

export function ClienteDetalleClient({
  cliente,
  prestamos,
  clientes,
}: ClienteDetalleClientProps) {
  const router = useRouter()
  const [newPrestamoOpen, setNewPrestamoOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const activos = prestamos.filter((p) => p.estado === 'pendiente')
  const pagados = prestamos.filter((p) => p.estado === 'pagado')
  const totalActivo = activos.reduce((s, p) => s + p.monto, 0)

  function handleEliminarCliente() {
    startTransition(async () => {
      await eliminarCliente(cliente.id)
      router.push('/dashboard')
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{cliente.nombre}</h1>
          {cliente.telefono && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {cliente.telefono}
            </span>
          )}
        </div>
        <button
          onClick={() => setDeleteOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Eliminar cliente"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{activos.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Activos</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalActivo)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total deuda</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{pagados.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pagados</p>
          </div>
        </div>

        {/* Active loans */}
        {activos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Préstamos activos
            </h2>
            {activos.map((p) => (
              <PrestamoCard key={p.id} prestamo={p} clientes={clientes} />
            ))}
          </section>
        )}

        {/* Historical paid loans */}
        {pagados.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Historial de pagos
            </h2>
            {pagados.map((p) => (
              <PrestamoCard key={p.id} prestamo={p} clientes={clientes} />
            ))}
          </section>
        )}

        {prestamos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Sin préstamos</p>
            <p className="text-sm text-muted-foreground">
              Usa el botón + para agregar el primer préstamo.
            </p>
          </div>
        )}

        {cliente.notas && (
          <div className="bg-secondary/50 rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
            <p className="text-sm text-foreground">{cliente.notas}</p>
          </div>
        )}
      </main>

      {/* FAB - new loan for this client */}
      <button
        onClick={() => setNewPrestamoOpen(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center text-3xl font-light hover:bg-primary/90 active:scale-95 transition-all z-30"
        aria-label="Nuevo préstamo"
      >
        +
      </button>

      <PrestamoForm
        open={newPrestamoOpen}
        onOpenChange={setNewPrestamoOpen}
        clientes={clientes}
        clienteIdFijo={cliente.id}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{cliente.nombre}</strong> y todos sus préstamos. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEliminarCliente}
              disabled={isPending}
            >
              Eliminar cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
