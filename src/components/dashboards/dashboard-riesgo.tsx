'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Prestamo, Cliente } from '@/lib/types'
import { formatCurrency } from '@/lib/utils-clientes'

interface DashboardRiesgoProps {
  prestamos: Prestamo[]
  clientes: Cliente[]
}

// Reutilizamos la genialidad del número colapsable
function ExpandableCurrency({ amount }: { amount: number }) {
  const [expanded, setExpanded] = useState(false)

  const formatCompact = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(val)
  }

  return (
    <div
      className="text-[18px] sm:text-xl font-bold tracking-tight text-foreground cursor-pointer select-none active:opacity-70 transition-opacity"
      onClick={() => setExpanded((prev) => !prev)}
      title="Tocar para expandir/resumir"
    >
      {expanded ? formatCurrency(amount) : formatCompact(amount)}
    </div>
  )
}

export function DashboardRiesgo({ prestamos, clientes }: DashboardRiesgoProps) {
  const { 
    indiceMorosidad, 
    montoCritico, 
    vencimientosData, 
    topDeudores 
  } = useMemo(() => {
    const hoy = startOfDay(new Date())
    const activos = prestamos.filter((p) => p.estado === 'pendiente')

    // 1. Cálculos de Mora y Cartera
    const totalCarteraActiva = activos.reduce((sum, p) => sum + p.monto, 0)
    
    // Consideramos "vencido" a todo lo que tiene fecha de vencimiento anterior a hoy
    const prestamosVencidos = activos.filter(p => differenceInCalendarDays(parseISO(p.fecha_vencimiento), hoy) < 0)
    const totalVencido = prestamosVencidos.reduce((sum, p) => sum + p.monto, 0)
    
    const indiceMorosidad = totalCarteraActiva > 0 
      ? ((totalVencido / totalCarteraActiva) * 100).toFixed(1) 
      : '0.0'

    // Monto Crítico: Vencidos hace más de 15 días (puedes ajustar este umbral)
    const montoCritico = prestamosVencidos
      .filter(p => differenceInCalendarDays(hoy, parseISO(p.fecha_vencimiento)) > 15)
      .reduce((sum, p) => sum + p.monto, 0)

    // 2. Calendario de Vencimientos (Bar Chart)
    const buckets = [
      { name: 'Vencido', monto: 0, fill: 'var(--status-vencido)' },
      { name: 'Esta sem', monto: 0, fill: 'var(--status-pronto)' },
      { name: 'Próx sem', monto: 0, fill: 'var(--primary)' },
      { name: 'Resto mes', monto: 0, fill: 'var(--status-pagado)' },
    ]

    activos.forEach(p => {
      const diff = differenceInCalendarDays(parseISO(p.fecha_vencimiento), hoy)
      if (diff < 0) buckets[0].monto += p.monto
      else if (diff >= 0 && diff <= 7) buckets[1].monto += p.monto
      else if (diff > 7 && diff <= 14) buckets[2].monto += p.monto
      else if (diff > 14 && diff <= 30) buckets[3].monto += p.monto
      // Los > 30 días se ignoran en esta vista de corto plazo para foco operativo
    })

    // 3. Top Clientes Deudores (Bar Chart Horizontal)
    const deudaPorCliente: Record<string, number> = {}
    activos.forEach(p => {
      deudaPorCliente[p.cliente_id] = (deudaPorCliente[p.cliente_id] || 0) + p.monto
    })

    const topDeudores = Object.entries(deudaPorCliente)
      .map(([id, monto]) => {
        const c = clientes.find(c => c.id === id)
        // Usar solo el primer nombre y apellido inicial para que no ocupe tanto espacio
        const nombreCorto = c?.nombre.split(' ').map((n, i) => i === 0 ? n : n.charAt(0) + '.').slice(0, 2).join(' ') || 'Desc.'
        return { name: nombreCorto, monto }
      })
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5) // Agarramos solo los 5 mayores

    return {
      indiceMorosidad,
      montoCritico,
      vencimientosData: buckets,
      topDeudores
    }
  }, [prestamos, clientes])

  const chartConfig = {
    monto: {
      label: 'Monto',
      color: 'var(--primary)',
    },
  }

  return (
    <div className="space-y-6">
      {/* KPIs de Riesgo */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2 px-1">
        <Card className="py-4 shadow-sm border-[var(--status-vencido)]/30 bg-[var(--status-vencido-bg)]/30">
          <CardHeader className="p-0 px-3 pb-1">
            <CardTitle className="text-xs font-semibold text-[var(--status-vencido)] tracking-tight leading-none">
              Índice Morosidad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-3">
            <div className="text-[18px] sm:text-xl font-bold tracking-tight text-[var(--status-vencido)] truncate">
              {indiceMorosidad}%
            </div>
            <p className="text-[10px] sm:text-xs text-[var(--status-vencido)]/80 mt-0.5 font-medium truncate">
              Del total activo
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 shadow-sm border-[var(--status-vencido)]/50 bg-[var(--status-vencido-bg)]">
          <CardHeader className="p-0 px-3 pb-1">
            <CardTitle className="text-xs font-semibold text-[var(--status-vencido)] tracking-tight leading-none">
              Crítico (+15 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-3">
            {/* Si el texto hereda el color del parent en Expandable, le forzamos la clase aquí */}
            <div className="text-[var(--status-vencido)]">
              <ExpandableCurrency amount={montoCritico} />
            </div>
            <p className="text-[10px] sm:text-xs text-[var(--status-vencido)]/80 mt-0.5 font-medium truncate">
              Riesgo de incobrabilidad
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Operaciones */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Bar Chart - Calendario de Vencimientos */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Próximos a vencer (30 días)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vencimientosData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--muted-foreground)" 
                    style={{ fontSize: '0.7rem' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickMargin={10} 
                  />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    style={{ fontSize: '0.7rem' }} 
                    axisLine={false} 
                    tickLine={false} 
                    width={50}
                    tickFormatter={(value) => 
                      new Intl.NumberFormat('es-AR', { notation: 'compact', compactDisplay: 'short' }).format(value)
                    }
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--secondary)' }}
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{ borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                  />
                  <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
                    {vencimientosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Horizontal Bar Chart - Top Clientes Deudores */}
        {topDeudores.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Top 5 Clientes Deudores</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDeudores} layout="vertical" margin={{ top: 0, right: 25, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis 
                      type="number" 
                      stroke="var(--muted-foreground)" 
                      style={{ fontSize: '0.7rem' }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(value) => 
                        new Intl.NumberFormat('es-AR', { notation: 'compact', compactDisplay: 'short' }).format(value)
                      }
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="var(--foreground)" 
                      style={{ fontSize: '0.7rem', fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false} 
                      width={80} /* Importante para que el nombre entre bien */
                    />
                    <Tooltip 
                      cursor={{ fill: 'var(--secondary)' }}
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                    />
                    <Bar dataKey="monto" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}