'use client'

import { useMemo } from 'react'
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { format, parseISO, startOfMonth } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Prestamo } from '@/lib/types'
import { formatCurrency, getStatusPrestamo } from '@/lib/utils-clientes'

interface DashboardFinancieroProps {
  prestamos: Prestamo[]
}

export function DashboardFinanciero({ prestamos }: DashboardFinancieroProps) {
  // Procesar datos para KPIs y gráficos usando useMemo
  const { capitalColocado, totalRecaudado, prestamosActivos, cartieraRisgo, historicoRecaudacion } = useMemo(() => {
    // KPIs Destacados
    const capitalColocado = prestamos
      .filter((p) => p.estado === 'pendiente')
      .reduce((sum, p) => sum + p.monto, 0)

    const totalRecaudado = prestamos
      .filter((p) => p.estado === 'pagado')
      .reduce((sum, p) => sum + p.monto, 0)

    const prestamosActivos = prestamos.filter((p) => p.estado === 'pendiente').length

    // Datos para Gráfico de Riesgo (Donut Chart)
    const riesgoMap: Record<string, number> = { verde: 0, amarillo: 0, rojo: 0 }
    prestamos
      .filter((p) => p.estado === 'pendiente')
      .forEach((p) => {
        const { color } = getStatusPrestamo(p)
        riesgoMap[color] += p.monto
      })

    const cartieraRisgo = [
      { name: 'Bajo Riesgo', value: riesgoMap.verde, color: 'var(--status-pagado)' },
      { name: 'Riesgo Medio', value: riesgoMap.amarillo, color: 'var(--status-pronto)' },
      { name: 'Alto Riesgo', value: riesgoMap.rojo, color: 'var(--status-vencido)' },
    ].filter((item) => item.value > 0)

    // Datos para Gráfico de Área (Histórico de Recaudación)
    const recaudacionPorMes: Record<string, number> = {}
    prestamos
      .filter((p) => p.estado === 'pagado' && p.fecha_pago)
      .forEach((p) => {
        const mesAño = format(parseISO(p.fecha_pago!), 'MMM yyyy')
        recaudacionPorMes[mesAño] = (recaudacionPorMes[mesAño] || 0) + p.monto
      })

    // Ordenar cronológicamente
    const historicoRecaudacion = Object.entries(recaudacionPorMes)
      .sort(([fechaA], [fechaB]) => {
        const dateA = parseISO(fechaA)
        const dateB = parseISO(fechaB)
        return dateA.getTime() - dateB.getTime()
      })
      .map(([mes, monto]) => ({
        mes,
        monto,
      }))

    return {
      capitalColocado,
      totalRecaudado,
      prestamosActivos,
      cartieraRisgo,
      historicoRecaudacion,
    }
  }, [prestamos])

  const chartConfig = {
    monto: {
      label: 'Recaudación',
      color: 'var(--primary)',
    },
  }

  return (
    <div className="space-y-6">
      {/* KPIs Destacados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Capital Colocado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(capitalColocado)}</div>
            <p className="text-xs text-muted-foreground mt-1">{prestamosActivos} préstamos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recaudado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRecaudado)}</div>
            <p className="text-xs text-muted-foreground mt-1">Dinero ingresado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Préstamos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prestamosActivos}</div>
            <p className="text-xs text-muted-foreground mt-1">En seguimiento</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut Chart - Cartera por Riesgo */}
        {cartieraRisgo.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cartera por Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cartieraRisgo}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {cartieraRisgo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-4 space-y-2 text-sm">
                {cartieraRisgo.map((item) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Area Chart - Histórico de Recaudación */}
        {historicoRecaudacion.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Recaudación</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicoRecaudacion}>
                    <defs>
                      <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--primary)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--primary)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="mes"
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: '0.75rem' }}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: '0.75rem' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="monto"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#colorMonto)"
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estado vacío */}
      {prestamos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay préstamos registrados aún. Comienza registrando tu primer préstamo.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
