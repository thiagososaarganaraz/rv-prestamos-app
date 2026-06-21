import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPrestamos, getClientes, getTasaVigente } from '@/lib/actions'
import { getStatusPrestamo } from '@/lib/utils-clientes'
import { Home } from '@/components/home'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DashboardFinanciero } from '@/components/dashboards/dashboard-financiero'
import { DashboardRiesgo } from '@/components/dashboards/dashboard-riesgo'
import { DashboardClientes } from '@/components/dashboards/dashboard-clientes'

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

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="estadisticas" className="w-full flex flex-col items-center">
        
        <div className="w-full max-w-lg px-4 pt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
            <TabsTrigger value="operaciones">Operaciones</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="operaciones" className="w-full min-w-0 m-0 focus-visible:outline-none">
          <Home
            prestamos={prestamos}
            clientes={clientes}
            proximosCount={proximosCount}
            vencidosCount={vencidosCount}
            userEmail={user.email ?? ''}
          />
        </TabsContent>

        <TabsContent value="estadisticas" className="w-full min-w-0 m-0 focus-visible:outline-none">
          <main className="w-full max-w-lg mx-auto px-4 py-4 pb-28">
            
            <Tabs defaultValue="financiero" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-6 bg-secondary/50">
                <TabsTrigger value="financiero" className="text-xs">Financiero</TabsTrigger>
                <TabsTrigger value="riesgo" className="text-xs">Riesgo</TabsTrigger>
                <TabsTrigger value="clientes" className="text-xs">Clientes</TabsTrigger>
              </TabsList>

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

          </main>
        </TabsContent>
      </Tabs>
    </div>
  )
}