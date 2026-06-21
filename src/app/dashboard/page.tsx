// src/app/dashboard/page.tsx

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPrestamos, getClientes, getTasaVigente } from '@/lib/actions'
import { getStatusPrestamo } from '@/lib/utils-clientes'
import { Home } from '@/components/home'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { WalletOverview } from '@/components/dashboards/wallet-overview'
import { DashboardFinanciero } from '@/components/dashboards/dashboard-financiero'
import { DashboardRiesgo } from '@/components/dashboards/dashboard-riesgo'
import { DashboardClientes } from '@/components/dashboards/dashboard-clientes'
import { UserMenu } from '@/components/menu/user-menu'
import { DatabaseIndicator } from '@/components/database-indicator'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [prestamos, clientes, tasaVigente] = await Promise.all([getPrestamos(), getClientes(), getTasaVigente()])

  const proximosCount = prestamos.filter((p) => {
    if (p.estado === 'pagado') return false
    const s = getStatusPrestamo(p)
    return s.diasRestantes >= 0 && s.diasRestantes <= 7
  }).length

  const vencidosCount = prestamos.filter((p) => {
    if (p.estado === 'pagado') return false
    return getStatusPrestamo(p).diasRestantes < 0
  }).length

  const userEmail = user.email ?? ''
  const alertasCount = proximosCount + vencidosCount

  const tasaDecimal = tasaVigente / 100

  // Capital e intereses de préstamos activos (estado pendiente)
  const prestamosPendientes = prestamos.filter((p) => p.estado === 'pendiente')

  const capitalColocado = prestamosPendientes.reduce((sum, p) => sum + p.monto, 0)
  const gananciaProyectada = prestamosPendientes.reduce((sum, p) => sum + (p.monto * tasaDecimal), 0)

  // Cobros esperados en los próximos 7 días
  const proximosCobrosSemana = prestamosPendientes.reduce((sum, p) => {
    const s = getStatusPrestamo(p)
    if (s.diasRestantes >= 0 && s.diasRestantes <= 7) {
      return sum + p.monto + (p.monto * tasaDecimal)
    }
    return sum
  }, 0)

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="estadisticas" className="w-full flex flex-col">
        
        {/* CABECERA FIJA Y EXPANDIDA */}
        <header className="w-full border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">RV Prestamos</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{userEmail}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {alertasCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                  {alertasCount > 99 ? '99+' : alertasCount}
                </span>
              )}
              <div className="flex items-center gap-4">
                <DatabaseIndicator />
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* CONTENEDOR PRINCIPAL FLUIDO */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* Selector de módulos principales alineado a la izquierda */}
          <div className="max-w-xs">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="estadisticas">Cuenta</TabsTrigger>
              <TabsTrigger value="operaciones">Operaciones</TabsTrigger>
            </TabsList>
          </div>

          {/* CONTENIDO DE OPERACIONES */}
          <TabsContent value="operaciones" className="w-full min-w-0 m-0 focus-visible:outline-none">
            <Home
              prestamos={prestamos}
              clientes={clientes}
              proximosCount={proximosCount}
              vencidosCount={vencidosCount}
              userEmail={user.email ?? ''}
            />
          </TabsContent>

          {/* CONTENIDO DE ESTADÍSTICAS (DASHBOARD) */}
          <TabsContent value="estadisticas" className="w-full min-w-0 m-0 focus-visible:outline-none">
            <div className="w-full space-y-6">
              
              {/* BILLETERA VIRTUAL OVERVIEW */}
              <div className="max-w-md">
                <WalletOverview 
                  capitalColocado={capitalColocado}
                  gananciaProyectada={gananciaProyectada}
                  proximosCobrosSemana={proximosCobrosSemana}
                />
              </div>
              
              <Tabs defaultValue="financiero" className="w-full">
                <div className="max-w-md">
                  <TabsList className="w-full grid grid-cols-3 mb-6 bg-secondary/50">
                    <TabsTrigger value="financiero" className="text-xs">Financiero</TabsTrigger>
                    <TabsTrigger value="riesgo" className="text-xs">Riesgo</TabsTrigger>
                    <TabsTrigger value="clientes" className="text-xs">Clientes</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="financiero" className="min-w-0 focus-visible:outline-none">
                  <DashboardFinanciero prestamos={prestamos} tasaVigente={tasaVigente} />
                </TabsContent>

                <TabsContent value="riesgo" className="min-w-0 focus-visible:outline-none">
                  <DashboardRiesgo prestamos={prestamos} clientes={clientes} />
                </TabsContent>

                <TabsContent value="clientes" className="min-w-0 focus-visible:outline-none">
                  <DashboardClientes prestamos={prestamos} clientes={clientes} tasaVigente={tasaVigente} />
                </TabsContent>
              </Tabs>

            </div>
          </TabsContent>
        </div>

      </Tabs>
    </div>
  )
}