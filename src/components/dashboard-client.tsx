'use client'

import { useState, useMemo } from 'react'
import { Prestamo, Cliente } from '@/lib/types'
import { getStatusPrestamo } from '@/lib/utils-clientes'
import { PrestamoCard } from '@/components/prestamo-card'
import { ClienteRow } from '@/components/cliente-row'
import { PrestamoForm } from '@/components/prestamo-form'
import { cerrarSesion } from '@/lib/actions'
import { Input } from '@/components/ui/input'
import { LogOut, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DatabaseIndicator } from './database-indicator'

type Vista = 'prestamos' | 'clientes'
type Filtro = 'todos' | 'proximos' | 'vencidos' | 'pagados'

interface DashboardClientProps {
  prestamos: Prestamo[]
  clientes: Cliente[]
  proximosCount: number
  vencidosCount: number
  userEmail: string
}

export function DashboardClient({
  prestamos,
  clientes,
  proximosCount,
  vencidosCount,
  userEmail,
}: DashboardClientProps) {
  const [vista, setVista] = useState<Vista>('prestamos')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [newOpen, setNewOpen] = useState(false)

  const prestamosFiltrados = useMemo(() => {
    let list = prestamos

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter((p) => {
        const nombre =
          p.clientes?.nombre ?? clientes.find((c) => c.id === p.cliente_id)?.nombre ?? ''
        return nombre.toLowerCase().includes(q)
      })
    }

    if (filtro === 'proximos') {
      list = list.filter((p) => {
        if (p.estado === 'pagado') return false
        const s = getStatusPrestamo(p)
        return s.diasRestantes >= 0 && s.diasRestantes <= 7
      })
    } else if (filtro === 'vencidos') {
      list = list.filter((p) => {
        if (p.estado === 'pagado') return false
        return getStatusPrestamo(p).diasRestantes < 0
      })
    } else if (filtro === 'pagados') {
      list = list.filter((p) => p.estado === 'pagado')
    } else {
      list = list.filter((p) => p.estado === 'pendiente')
    }

    return list
  }, [prestamos, clientes, filtro, busqueda])

  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes
    const q = busqueda.toLowerCase()
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q))
  }, [clientes, busqueda])

  const prestamosPorCliente = useMemo(() => {
    const map: Record<string, Prestamo[]> = {}
    for (const p of prestamos) {
      if (!map[p.cliente_id]) map[p.cliente_id] = []
      map[p.cliente_id].push(p)
    }
    return map
  }, [prestamos])

  const alertasCount = proximosCount + vencidosCount

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">RV Prestamos</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{userEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            {alertasCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                {alertasCount > 99 ? '99+' : alertasCount}
              </span>
            )}
            <div className="flex items-center gap-4">
              <DatabaseIndicator />
            </div>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>    
          </div>
        </div>
        {/* Vista tabs */}
        <div className="flex gap-1 pb-3">
          <button
            onClick={() => setVista('prestamos')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${vista === 'prestamos'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary'
              }`}
          >
            Préstamos
          </button>
          <button
            onClick={() => setVista('clientes')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${vista === 'clientes'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary'
              }`}
          >
            Clientes
            {clientes.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({clientes.length})</span>
            )}
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 pr-9 bg-secondary border-transparent focus-visible:bg-card"
            placeholder={vista === 'prestamos' ? 'Buscar por nombre...' : 'Buscar cliente...'}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters (only on loans view) */}
      {vista === 'prestamos' && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(
            [
              { key: 'todos' as Filtro, label: 'Activos' },
              {
                key: 'proximos' as Filtro,
                label: `Próximos${proximosCount > 0 ? ` (${proximosCount})` : ''}`,
              },
              {
                key: 'vencidos' as Filtro,
                label: `Vencidos${vencidosCount > 0 ? ` (${vencidosCount})` : ''}`,
              },
              { key: 'pagados' as Filtro, label: 'Pagados' },
            ]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filtro === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-4 pb-28 space-y-3">
        {vista === 'prestamos' && (
          <>
            {filtro === 'todos' && !busqueda && (
              <div className="flex gap-2 mb-4 px-1">
                {[
                  { label: 'Activos', count: prestamos.filter((p) => p.estado === 'pendiente').length, color: 'text-foreground' },
                  { label: 'Vencidos', count: vencidosCount, color: 'text-[var(--status-vencido)]' },
                  { label: 'Esta semana', count: proximosCount, color: 'text-[var(--status-pronto)]' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex-1 flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-lg border border-border/50"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <span className={cn("text-base font-bold", stat.color)}>
                      {stat.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {prestamosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-foreground">Sin resultados</p>
                <p className="text-sm text-muted-foreground">
                  No hay préstamos para este filtro.
                </p>
              </div>
            ) : (
              prestamosFiltrados.map((p) => (
                <PrestamoCard key={p.id} prestamo={p} clientes={clientes} showCliente />
              ))
            )}
          </>
        )}

        {vista === 'clientes' && (
          <>
            {clientesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-base font-medium text-foreground">Sin clientes</p>
                <p className="text-sm text-muted-foreground">
                  Agrega un préstamo para crear clientes.
                </p>
              </div>
            ) : (
              clientesFiltrados.map((c) => (
                <ClienteRow
                  key={c.id}
                  cliente={c}
                  prestamos={prestamosPorCliente[c.id] ?? []}
                />
              ))
            )}
          </>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setNewOpen(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center text-3xl font-light hover:bg-primary/90 active:scale-95 transition-all z-30"
        aria-label="Nuevo préstamo"
      >
        +
      </button>

      <PrestamoForm open={newOpen} onOpenChange={setNewOpen} clientes={clientes} />
    </div>
  )
}
