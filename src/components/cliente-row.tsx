'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Cliente, Prestamo } from '@/lib/types'
import {
  getStatusPrestamo,
  formatCurrency,
  formatDate,
  statusDotClasses,
} from '@/lib/utils-clientes'
import { ChevronDown, ChevronRight, Phone } from 'lucide-react'

interface ClienteRowProps {
  cliente: Cliente
  prestamos: Prestamo[]
}

export function ClienteRow({ cliente, prestamos }: ClienteRowProps) {
  const [expandido, setExpandido] = useState(false)

  const activos = prestamos.filter((p) => p.estado === 'pendiente')
  const totalDeuda = activos.reduce((sum, p) => sum + p.monto, 0)
  const proximoVencimiento = activos
    .slice()
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0]

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Clickable header → go to client detail */}
      <div className="flex items-center">
        <Link
          href={`/clientes/${cliente.id}`}
          className="flex-1 p-4 min-w-0 active:bg-secondary/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold text-sm">
                {cliente.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{cliente.nombre}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {cliente.telefono && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {cliente.telefono}
                  </span>
                )}
                {activos.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {activos.length} préstamo{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''} · {formatCurrency(totalDeuda)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin préstamos activos</span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Expand/collapse toggle */}
        {activos.length > 0 && (
          <button
            onClick={() => setExpandido(!expandido)}
            className="p-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expandido ? 'Colapsar' : 'Expandir préstamos'}
          >
            {expandido ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Expanded loans */}
      {expandido && activos.length > 0 && (
        <div className="border-t border-border divide-y divide-border">
          {activos.map((p) => {
            const status = getStatusPrestamo(p)
            return (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClasses(status.color)}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(p.monto)}</p>
                    <p className="text-xs text-muted-foreground">Vence {formatDate(p.fecha_vencimiento)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium" style={{ color: `var(--status-${status.color === 'verde' ? 'pagado' : status.color === 'amarillo' ? 'pronto' : 'vencido'})` }}>
                    {status.label}
                  </p>
                  {p.metodo_pago && (
                    <p className="text-xs text-muted-foreground capitalize">{p.metodo_pago}</p>
                  )}
                </div>
              </div>
            )
          })}
          {proximoVencimiento && (
            <div className="px-4 py-2 bg-secondary/40">
              <p className="text-xs text-muted-foreground">
                Próximo vencimiento:{' '}
                <span className="font-medium text-foreground">{formatDate(proximoVencimiento.fecha_vencimiento)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
