import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPrestamos, getClientes } from '@/lib/actions'
import { getStatusPrestamo } from '@/lib/utils-clientes'
import { DashboardClient } from '@/components/dashboard-client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DashboardFinanciero } from '@/components/dashboard-financiero'

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
      <Tabs defaultValue="operaciones" className="w-full flex flex-col items-center">
        
        {/* Contenedor de los botones de Pestañas */}
        <div className="w-full max-w-lg px-4 pt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="operaciones">Operaciones</TabsTrigger>
            <TabsTrigger value="analiticas">Estadísticas</TabsTrigger>
          </TabsList>
        </div>

        {/* Pestaña: Operaciones */}
        <TabsContent value="operaciones" className="w-full min-w-0 m-0 focus-visible:outline-none">
          <DashboardClient
            prestamos={prestamos}
            clientes={clientes}
            proximosCount={proximosCount}
            vencidosCount={vencidosCount}
            userEmail={user.email ?? ''}
          />
        </TabsContent>

        {/* Pestaña: Analíticas */}
        <TabsContent value="analiticas" className="w-full min-w-0 m-0 focus-visible:outline-none">
          <main className="w-full max-w-lg mx-auto px-4 py-6 pb-28">
            <DashboardFinanciero prestamos={prestamos} />
          </main>
        </TabsContent>

      </Tabs>
    </div>
  )
}