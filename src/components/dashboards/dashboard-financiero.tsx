// Dashboard Financiero
'use client'

import { useState, useMemo } from 'react'
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Prestamo } from '@/lib/types'
import { formatCurrency, getStatusPrestamo } from '@/lib/utils-clientes'

interface DashboardFinancieroProps {
  prestamos: Prestamo[]
  tasaVigente: number
}

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

export function DashboardFinanciero({ prestamos, tasaVigente }: DashboardFinancieroProps) {
  const { capitalColocado, totalGanancias, prestamosActivos, carteraRiesgo, historicoGanancias } = useMemo(() => {
    // Convertir la tasa porcentual (ej: 40) a decimal (0.40)
    const tasaDecimal = tasaVigente / 100

    const capitalColocado = prestamos
      .filter((p) => p.estado === 'pendiente')
      .reduce((sum, p) => sum + p.monto, 0)

    const prestamosActivos = prestamos.filter((p) => p.estado === 'pendiente').length

    // Ganancias = Suma de (monto * interés vigente en decimal) de los préstamos pagados
    const totalGanancias = prestamos
      .filter((p) => p.estado === 'pagado')
      .reduce((sum, p) => sum + (p.monto * tasaDecimal), 0)

    const riesgoMap: Record<string, number> = { verde: 0, amarillo: 0, rojo: 0 }
    prestamos
      .filter((p) => p.estado === 'pendiente')
      .forEach((p) => {
        const { color } = getStatusPrestamo(p)
        riesgoMap[color] += p.monto
      })

    const carteraRiesgo = [
      { name: 'Bajo Riesgo', value: riesgoMap.verde, color: 'var(--status-pagado)' },
      { name: 'Riesgo Medio', value: riesgoMap.amarillo, color: 'var(--status-pronto)' },
      { name: 'Alto Riesgo', value: riesgoMap.rojo, color: 'var(--status-vencido)' },
    ].filter((item) => item.value > 0)

    const gananciasPorMes: Record<string, number> = {}
    prestamos
      .filter((p) => p.estado === 'pagado' && p.fecha_pago)
      .forEach((p) => {
        const mesAño = format(parseISO(p.fecha_pago!), 'MMM yyyy')
        gananciasPorMes[mesAño] = (gananciasPorMes[mesAño] || 0) + (p.monto * tasaDecimal)
      })

    const historicoGanancias = Object.entries(gananciasPorMes)
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
      totalGanancias,
      prestamosActivos,
      carteraRiesgo,
      historicoGanancias,
    }
  }, [prestamos, tasaVigente])

  const chartConfig = {
    monto: {
      label: 'Ganancias',
      color: 'var(--primary)',
    },
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 px-1">
        <Card className="py-4 shadow-sm border-border bg-card">
          <CardHeader className="p-0 px-3 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-tight leading-none">
              Total Invertido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-3">
            <ExpandableCurrency amount={capitalColocado} />
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium truncate">
              {prestamosActivos} activos
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 shadow-sm border-border bg-card">
          <CardHeader className="p-0 px-3 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-tight leading-none">
              Ganancias ({tasaVigente}%)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-3">
            <ExpandableCurrency amount={totalGanancias} />
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium truncate">
              Margen bruto
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 shadow-sm border-border bg-card">
          <CardHeader className="p-0 px-3 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-tight leading-none">
              Préstamos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-3">
            <div className="text-[18px] sm:text-xl font-bold tracking-tight text-foreground">
              {prestamosActivos}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium truncate">
              En seguimiento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {historicoGanancias.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Ganancias por mes</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicoGanancias} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="mes" stroke="var(--muted-foreground)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: '0.75rem' }}
                      tickFormatter={(value) => new Intl.NumberFormat('es-AR', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1, style: 'currency', currency: 'ARS' }).format(value)}
                      axisLine={false}
                      tickLine={false}
                      width={65}
                    />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
                    <Area type="monotone" dataKey="monto" stroke="var(--primary)" strokeWidth={2} fill="url(#colorMonto)" isAnimationActive={true} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {carteraRiesgo.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cartera por Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={carteraRiesgo} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {carteraRiesgo.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '0.5rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="mt-4 space-y-2 text-sm">
                {carteraRiesgo.map((item) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}