import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPrestamos, getClientes } from '@/lib/actions'
import { getStatusPrestamo } from '@/lib/utils-clientes'
import { DashboardClient } from '@/components/dashboard-client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DashboardFinanciero } from '@/components/dashboards/dashboard-financiero'
import { DashboardRiesgo } from '@/components/dashboards/dashboard-riesgo'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [prestamos, clientes] = await Promise.all([getPrestamos(), getClientes()])

  const proximosCount = prestamos.filter((p) => {
    if (p.estado === 'pagado') return false
    const s = getStatusPrestamo(p)
    return s.diasRestantes >= 0 && s.diasRestantes <= 7
  }).length

  const vencidosCount = prestamos.filter((p) => {
    if (p.estado === 'pagado') return false
    return getStatusPrestamo(p).diasRestantes < 0
  }).length

  return (
    <div className="min-h-screen bg-background">
      {/* Pestañas Principales */}
      <Tabs defaultValue="operaciones" className="w-full flex flex-col items-center">
        
        <div className="w-full max-w-lg px-4 pt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="operaciones">Operaciones</TabsTrigger>
            <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          </TabsList>
        </div>

        {/* Panel 1: Lista Operativa Diaria */}
        <TabsContent value="operaciones" className="w-full min-w-0 m-0 focus-visible:outline-none">
          <DashboardClient
            prestamos={prestamos}
            clientes={clientes}
            proximosCount={proximosCount}
            vencidosCount={vencidosCount}
            userEmail={user.email ?? ''}
          />
        </TabsContent>

        {/* Panel 2: Estadísticas con Sub-Pestañas */}
        <TabsContent value="estadisticas" className="w-full min-w-0 m-0 focus-visible:outline-none">
          <main className="w-full max-w-lg mx-auto px-4 py-4 pb-28">
            
            <Tabs defaultValue="financiero" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-6 bg-secondary/50">
                <TabsTrigger value="financiero" className="text-xs">Financiero</TabsTrigger>
                <TabsTrigger value="riesgo" className="text-xs">Riesgo</TabsTrigger>
                <TabsTrigger value="clientes" className="text-xs">Clientes</TabsTrigger>
              </TabsList>

              <TabsContent value="financiero" className="min-w-0 focus-visible:outline-none">
                <DashboardFinanciero prestamos={prestamos} />
              </TabsContent>

              <TabsContent value="riesgo" className="min-w-0 focus-visible:outline-none">
                <DashboardRiesgo prestamos={prestamos} clientes={clientes} />
              </TabsContent>

              <TabsContent value="clientes" className="min-w-0 focus-visible:outline-none">
                <div className="flex flex-col items-center justify-center py-20 text-center gap-2 border-2 border-dashed border-border rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <p className="text-base font-medium text-foreground">Comportamiento de Clientes</p>
                  <p className="text-sm text-muted-foreground px-6">
                    Módulo en construcción. Aquí veremos el Lifetime Value (LTV) y tasa de repetición.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

          </main>
        </TabsContent>

      </Tabs>
    </div>
  )
}