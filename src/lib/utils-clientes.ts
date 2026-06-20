import { Prestamo } from '@/lib/types'
import { differenceInDays, parseISO, startOfDay } from 'date-fns'

export type StatusInfo = {
  label: string
  color: 'rojo' | 'amarillo' | 'verde'
  diasRestantes: number
}

export function getStatusPrestamo(prestamo: Prestamo): StatusInfo {
  if (prestamo.estado === 'pagado') {
    return { label: 'Pagado', color: 'verde', diasRestantes: 0 }
  }

  const hoy = startOfDay(new Date())
  const vencimiento = startOfDay(parseISO(prestamo.fecha_vencimiento))
  const dias = differenceInDays(vencimiento, hoy)

  if (dias < 0) {
    return {
      label: `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`,
      color: 'rojo',
      diasRestantes: dias,
    }
  }
  if (dias === 0) {
    return { label: 'Vence hoy', color: 'rojo', diasRestantes: 0 }
  }
  if (dias <= 7) {
    return {
      label: `Vence en ${dias} día${dias !== 1 ? 's' : ''}`,
      color: 'amarillo',
      diasRestantes: dias,
    }
  }
  return { label: `Vence en ${dias} días`, color: 'verde', diasRestantes: dias }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(dateStr))
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function oneMonthFromNow(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export function statusBadgeClasses(color: StatusInfo['color']): string {
  if (color === 'rojo') return 'bg-[var(--status-vencido-bg)] text-[var(--status-vencido)]'
  if (color === 'amarillo') return 'bg-[var(--status-pronto-bg)] text-[var(--status-pronto)]'
  return 'bg-[var(--status-pagado-bg)] text-[var(--status-pagado)]'
}

export function statusDotClasses(color: StatusInfo['color']): string {
  if (color === 'rojo') return 'bg-[var(--status-vencido)]'
  if (color === 'amarillo') return 'bg-[var(--status-pronto)]'
  return 'bg-[var(--status-pagado)]'
}
