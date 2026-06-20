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
    <Tabs defaultValue="operaciones" className="min-h-screen bg-background flex flex-col">
      <div className="max-w-lg mx-auto w-full">
        <TabsList className="w-full px-4 pt-4">
          <TabsTrigger value="operaciones" className="w-1/2">
            Operaciones
          </TabsTrigger>
          <TabsTrigger value="analiticas" className="w-1/2">
            Analíticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operaciones">
          <DashboardClient
            prestamos={prestamos}
            clientes={clientes}
            proximosCount={proximosCount}
            vencidosCount={vencidosCount}
            userEmail={user.email ?? ''}
          />
        </TabsContent>

        <TabsContent value="analiticas">
          <main className="min-h-screen px-4 pb-28">
            <div className="max-w-lg mx-auto w-full py-6">
              <DashboardFinanciero prestamos={prestamos} />
            </div>
          </main>
        </TabsContent>
      </div>
    </Tabs>
  )
}
