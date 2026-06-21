// Dashboard Clientes
'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Prestamo, Cliente } from '@/lib/types'

interface DashboardClientesProps {
  prestamos: Prestamo[]
  clientes: Cliente[]
  tasaVigente: number
}

export function DashboardClientes({ prestamos, clientes, tasaVigente }: DashboardClientesProps) {
  const { 
    totalClientes, 
    tasaRecurrencia, 
    promedioPrestamos,
    metodosPagoData,
    topRecurrentes
  } = useMemo(() => {
    
    // 1. Cálculo de Recurrencia
    const prestamosPorCliente = prestamos.reduce((acc, p) => {
      acc[p.cliente_id] = (acc[p.cliente_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalClientes = clientes.length
    const clientesRecurrentes = Object.values(prestamosPorCliente).filter(count => count > 1).length
    
    const tasaRecurrencia = totalClientes > 0 
      ? ((clientesRecurrentes / totalClientes) * 100).toFixed(1) 
      : '0.0'

    const promedioPrestamos = totalClientes > 0 
      ? (prestamos.length / totalClientes).toFixed(1)
      : '0.0'

    // 2. Gráfico de Torta: Métodos de Pago (solo préstamos pagados o con método definido)
    const metodosMap = { efectivo: 0, transferencia: 0 }
    prestamos
      .filter((p) => p.metodo_pago)
      .forEach((p) => {
        if (p.metodo_pago === 'efectivo') metodosMap.efectivo++
        if (p.metodo_pago === 'transferencia') metodosMap.transferencia++
      })

    const metodosPagoData = [
      { name: 'Transferencia', value: metodosMap.transferencia, fill: 'var(--primary)' },
      { name: 'Efectivo', value: metodosMap.efectivo, fill: 'var(--status-pronto)' }, // Naranja/Amarillo
    ].filter(item => item.value > 0)

    // 3. Gráfico de Barras: Top 5 Clientes más Recurrentes
    const topRecurrentes = Object.entries(prestamosPorCliente)
      .map(([id, count]) => {
        const c = clientes.find(c => c.id === id)
        const nombreCorto = c?.nombre.split(' ').map((n, i) => i === 0 ? n : n.charAt(0) + '.').slice(0, 2).join(' ') || 'Desc.'
        return { name: nombreCorto, cantidad: count }
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    return {
      totalClientes,
      tasaRecurrencia,
      promedioPrestamos,
      metodosPagoData,
      topRecurrentes
    }
  }, [prestamos, clientes])

  const chartConfig = {
    cantidad: {
      label: 'Préstamos',
      color: 'var(--primary)',
    },
  }

  return (
    <div className="space-y-6">
      {/* KPIs de Clientes */}
      <div className="grid grid-cols-3 gap-2 px-1">
        <Card className="py-4 shadow-sm border-border bg-card">
          <CardHeader className="p-0 px-3 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-tight leading-none">
              Clientes Totales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-3">
            <div className="text-[18px] sm:text-xl font-bold tracking-tight text-foreground truncate">
              {totalClientes}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium truncate">
              Registrados
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 shadow-sm border-border bg-card">
          <CardHeader className="p-0 px-3 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-tight leading-none">
              Recurrencia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-3">
            <div className="text-[18px] sm:text-xl font-bold tracking-tight text-foreground truncate">
              {tasaRecurrencia}%
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium truncate">
              Volvieron a pedir
            </p>
          </CardContent>
        </Card>

        <Card className="py-4 shadow-sm border-border bg-card">
          <CardHeader className="p-0 px-3 pb-1">
            <CardTitle className="text-xs font-semibold text-muted-foreground tracking-tight leading-none">
              Frecuencia Prom.
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 px-3">
            <div className="text-[18px] sm:text-xl font-bold tracking-tight text-foreground truncate">
              {promedioPrestamos}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium truncate">
              Préstamos / Cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Donut Chart - Métodos de Pago Preferidos */}
        {metodosPagoData.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Métodos de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metodosPagoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {metodosPagoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} pagos`, 'Cantidad']}
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
                {metodosPagoData.map((item) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value} operaciones</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bar Chart Horizontal - Top Clientes Recurrentes */}
        {topRecurrentes.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Top 5 Clientes Recurrentes</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topRecurrentes} layout="vertical" margin={{ top: 0, right: 25, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis 
                      type="number" 
                      stroke="var(--muted-foreground)" 
                      style={{ fontSize: '0.7rem' }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(value) => Math.floor(value).toString()}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="var(--foreground)" 
                      style={{ fontSize: '0.7rem', fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false} 
                      width={80} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'var(--secondary)' }}
                      formatter={(value) => [`${value} préstamos`, 'Total Histórico']}
                      contentStyle={{ borderRadius: '0.5rem', border: '1px solid var(--border)' }}
                    />
                    <Bar dataKey="cantidad" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={24}>
                      {topRecurrentes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="var(--primary)" />
                      ))}
                    </Bar>
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